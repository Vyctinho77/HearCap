package handlers

import (
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"hearcap/server/internal/engine"
)

type MarketDataHandler struct {
	marketData *engine.MarketDataEngine
	matching   *engine.MatchingEngine
}

func NewMarketDataHandler(marketData *engine.MarketDataEngine, matching *engine.MatchingEngine) *MarketDataHandler {
	return &MarketDataHandler{
		marketData: marketData,
		matching:   matching,
	}
}

// GET /api/market/candles?symbol=GNX&interval=1m&limit=500
func (h *MarketDataHandler) GetCandles(c *fiber.Ctx) error {
	symbol := c.Query("symbol")
	if symbol == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "symbol is required",
		})
	}

	intervalStr := c.Query("interval", "1h")
	interval := engine.CandleInterval(intervalStr)
	if !isValidInterval(interval) {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid interval. valid: 1m, 5m, 15m, 1h, 4h, 1d",
		})
	}

	limit := 500
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 1000 {
			limit = parsed
		}
	}

	candles, err := h.marketData.GetCandles(symbol, interval, limit)
	if err != nil {
		// Retorna array vazio em vez de erro para que o frontend possa usar fallback
		return c.JSON(fiber.Map{
			"symbol":   symbol,
			"interval": interval,
			"candles":  []interface{}{},
		})
	}

	// Se candles for nil, retorna array vazio
	if candles == nil {
		candles = []*engine.Candle{}
	}

	return c.JSON(fiber.Map{
		"symbol":   symbol,
		"interval": interval,
		"candles":  candles,
	})
}

// GET /api/market/ticker24h?symbol=GNX (opcional, se não passar retorna todos)
func (h *MarketDataHandler) GetTicker24h(c *fiber.Ctx) error {
	symbol := c.Query("symbol")

	if symbol != "" {
		ticker, err := h.marketData.GetTicker(symbol)
		if err != nil {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{
				"error": "ticker not found",
			})
		}
		return c.JSON(ticker)
	}

	// Lista todos os tickers
	tickers, err := h.marketData.ListTickers()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch tickers",
		})
	}

	return c.JSON(fiber.Map{
		"tickers": tickers,
	})
}

// GET /api/market/orderbook?symbol=GNX&level=50
func (h *MarketDataHandler) GetOrderBook(c *fiber.Ctx) error {
	symbol := c.Query("symbol")
	if symbol == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "symbol is required",
		})
	}

	depth := 50
	if depthStr := c.Query("level"); depthStr != "" {
		if parsed, err := strconv.Atoi(depthStr); err == nil && parsed > 0 && parsed <= 1000 {
			depth = parsed
		}
	}

	snapshot, ok := h.marketData.GetOrderBook(symbol)
	if !ok {
		// Se não tiver no cache, tenta pegar direto do matching engine
		if h.matching != nil {
			snapshot = h.matching.GetOrderBookSnapshot(symbol, depth)
		} else {
			// Se não tiver matching engine, retorna order book vazio
			snapshot = engine.OrderBookSnapshot{
				Symbol: symbol,
				Bids:   []engine.OrderBookLevel{},
				Asks:   []engine.OrderBookLevel{},
			}
		}
	}

	return c.JSON(snapshot)
}

// GET /api/market/trades/recent?symbol=GNX&limit=100
func (h *MarketDataHandler) GetRecentTrades(c *fiber.Ctx) error {
	symbol := c.Query("symbol")
	if symbol == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "symbol is required",
		})
	}

	limit := 100
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 500 {
			limit = parsed
		}
	}

	trades, err := h.marketData.GetRecentTrades(symbol, limit)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch trades",
		})
	}

	return c.JSON(fiber.Map{
		"symbol": symbol,
		"trades": trades,
	})
}

func isValidInterval(interval engine.CandleInterval) bool {
	valid := []engine.CandleInterval{
		engine.Candle1m,
		engine.Candle5m,
		engine.Candle15m,
		engine.Candle1h,
		engine.Candle4h,
		engine.Candle1d,
	}
	for _, v := range valid {
		if interval == v {
			return true
		}
	}
	return false
}

// isValidInterval é usado também no WS handler
