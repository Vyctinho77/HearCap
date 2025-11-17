package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"

	"hearcap/server/internal/config"
	"hearcap/server/internal/database"
	"hearcap/server/internal/engine"
	"hearcap/server/internal/http/handlers"
	"hearcap/server/internal/http/routes"
	"hearcap/server/internal/services"
	"hearcap/server/internal/tasks"
)

func main() {
	cfg := config.Load()

	db, err := database.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	priceEngine := services.NewPriceEngine(db, cfg)
	scheduler := tasks.NewScheduler()

	if err := scheduler.Add(cfg.PriceCronSpec, func(ctx context.Context) {
		if err := priceEngine.GeneratePrices(ctx); err != nil {
			log.Printf("scheduler: erro ao gerar preços: %v", err)
		}
	}); err != nil {
		log.Fatalf("scheduler: %v", err)
	}

	scheduler.Start()
	defer scheduler.Stop()

	app := fiber.New()

	// Configurar CORS para permitir requisições do frontend
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))
	tradingViewService := services.NewTradingViewService(db)
	tradingViewHandler := handlers.NewTradingViewHandler(tradingViewService)
	walletService := services.NewWalletService(db, cfg)
	tradeService := services.NewTradeService(db, cfg, walletService, priceEngine)
	tradeHandler := handlers.NewTradeHandler(tradeService, walletService)

	// Market Data Engine setup
	candleRepo := services.NewGORMCandleRepository(db)
	tradeRepo := services.NewGORMTradeHistoryRepository(db)
	tickerRepo := services.NewGORMTickerRepository(db)

	// Criar MarketDataEngine temporário (sem publisher) para poder criar WS handler
	tempEngine := engine.NewMarketDataEngine(
		engine.MarketDataConfig{
			TickerWindow:    24 * time.Hour,
			CandleIntervals: []engine.CandleInterval{engine.Candle1m, engine.Candle5m, engine.Candle1h, engine.Candle1d},
		},
		candleRepo,
		tradeRepo,
		tickerRepo,
		engine.NewNoOpMarketDataPublisher(), // temporário
	)

	// Criar WebSocket handler (sem MatchingEngine por enquanto - pode ser nil)
	var matchingEngine *engine.MatchingEngine = nil
	marketDataWSHandler := handlers.NewMarketDataWSHandler(tempEngine, matchingEngine)

	// Criar publisher WebSocket
	wsPublisher := handlers.NewWSPublisher(marketDataWSHandler)

	// Criar MarketDataEngine final com publisher WebSocket
	marketDataEngine := engine.NewMarketDataEngine(
		engine.MarketDataConfig{
			TickerWindow:    24 * time.Hour,
			CandleIntervals: []engine.CandleInterval{engine.Candle1m, engine.Candle5m, engine.Candle1h, engine.Candle1d},
		},
		candleRepo,
		tradeRepo,
		tickerRepo,
		wsPublisher,
	)

	// Atualizar WS handler com engine final
	marketDataWSHandler = handlers.NewMarketDataWSHandler(marketDataEngine, matchingEngine)

	// Criar REST handler
	marketDataHandler := handlers.NewMarketDataHandler(marketDataEngine, matchingEngine)

	routes.Register(app, routes.Dependencies{
		TradingViewHandler:  tradingViewHandler,
		TradeHandler:        tradeHandler,
		MarketDataHandler:   marketDataHandler,
		MarketDataWSHandler: marketDataWSHandler,
	})

	go func() {
		if err := priceEngine.GeneratePrices(context.Background()); err != nil {
			log.Printf("bootstrap: erro ao gerar preços iniciais: %v", err)
		}
	}()

	go func() {
		if err := app.Listen(":" + cfg.AppPort); err != nil {
			log.Fatalf("api: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	if err := app.Shutdown(); err != nil {
		log.Printf("api: erro ao finalizar servidor: %v", err)
	}

	log.Println("HearCap Invest API finalizada")
}
