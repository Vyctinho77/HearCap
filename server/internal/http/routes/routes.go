package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"

	"hearcap/server/internal/http/handlers"
)

type Dependencies struct {
	TradeHandler        *handlers.TradeHandler
	MarketDataHandler   *handlers.MarketDataHandler
	MarketDataWSHandler *handlers.MarketDataWSHandler
}

func Register(app *fiber.App, deps Dependencies) {
	api := app.Group("/api")
	api.Get("/ping", handlers.PingHandler)

	if deps.TradeHandler != nil {
		trades := api.Group("/trades")
		trades.Post("/buy", deps.TradeHandler.Buy)
		trades.Post("/sell", deps.TradeHandler.Sell)

		api.Get("/wallets/:userID", deps.TradeHandler.GetWallets)
	}

	// Market Data REST API
	if deps.MarketDataHandler != nil {
		market := api.Group("/market")
		market.Get("/candles", deps.MarketDataHandler.GetCandles)
		market.Get("/ticker24h", deps.MarketDataHandler.GetTicker24h)
		market.Get("/orderbook", deps.MarketDataHandler.GetOrderBook)
		market.Get("/trades/recent", deps.MarketDataHandler.GetRecentTrades)
	}

	// Market Data WebSocket
	if deps.MarketDataWSHandler != nil {
		ws := app.Group("/ws")
		ws.Get("/market/trades", websocket.New(deps.MarketDataWSHandler.HandleTrades))
		ws.Get("/market/book", websocket.New(deps.MarketDataWSHandler.HandleBook))
		ws.Get("/market/ticker", websocket.New(deps.MarketDataWSHandler.HandleTicker))
		ws.Get("/market/candles", websocket.New(deps.MarketDataWSHandler.HandleCandles))
	}
}
