package main

// Este arquivo é um EXEMPLO de como integrar Market Data Engine completo.
// Copie e adapte este código no seu main.go quando quiser ativar Market Data.

/*
import (
	"time"

	"hearcap/server/internal/engine"
	"hearcap/server/internal/http/handlers"
	"hearcap/server/internal/services"
)

func setupMarketDataEngine(db *gorm.DB, matchingEngine *engine.MatchingEngine) (*engine.MarketDataEngine, *handlers.MarketDataHandler, *handlers.MarketDataWSHandler) {
	// 1. Criar repositórios
	candleRepo := services.NewGORMCandleRepository(db)
	tradeRepo := services.NewGORMTradeHistoryRepository(db)
	tickerRepo := services.NewGORMTickerRepository(db)

	// 2. Criar MarketDataEngine temporário (sem publisher) para poder criar WS handler
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

	// 3. Criar WebSocket handler
	marketDataWSHandler := handlers.NewMarketDataWSHandler(tempEngine, matchingEngine)

	// 4. Criar publisher WebSocket
	wsPublisher := handlers.NewWSPublisher(marketDataWSHandler)

	// 5. Criar MarketDataEngine final com publisher WebSocket
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

	// 6. Atualizar WS handler com engine final
	marketDataWSHandler = handlers.NewMarketDataWSHandler(marketDataEngine, matchingEngine)

	// 7. Criar REST handler
	marketDataHandler := handlers.NewMarketDataHandler(marketDataEngine, matchingEngine)

	return marketDataEngine, marketDataHandler, marketDataWSHandler
}

// No main.go, após criar matchingEngine:
//
// marketDataEngine, marketDataHandler, marketDataWSHandler := setupMarketDataEngine(db, matchingEngine)
//
// // Atualizar matchingEngine para usar marketDataEngine
// matchingEngine = engine.NewMatchingEngine(repo, balances, events, marketDataEngine)
//
// // Registrar nas rotas
// routes.Register(app, routes.Dependencies{
//     TradeHandler:        tradeHandler,
//     MarketDataHandler:   marketDataHandler,
//     MarketDataWSHandler: marketDataWSHandler,
// })
*/
