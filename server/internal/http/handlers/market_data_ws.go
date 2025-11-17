package handlers

import (
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"

	"hearcap/server/internal/engine"
)

// WebSocket handler para streams de market data
// ws://host/ws/market/trades?symbol=GNX
// ws://host/ws/market/book?symbol=GNX
// ws://host/ws/market/ticker?symbol=GNX
// ws://host/ws/market/candles?symbol=GNX&interval=1m

type MarketDataWSHandler struct {
	marketData *engine.MarketDataEngine
	matching   *engine.MatchingEngine
	clients    map[string]map[*websocket.Conn]bool // stream -> clients
}

func NewMarketDataWSHandler(marketData *engine.MarketDataEngine, matching *engine.MatchingEngine) *MarketDataWSHandler {
	return &MarketDataWSHandler{
		marketData: marketData,
		matching:   matching,
		clients:    make(map[string]map[*websocket.Conn]bool),
	}
}

func (h *MarketDataWSHandler) HandleTrades(c *websocket.Conn) {
	symbol := strings.ToUpper(c.Query("symbol", ""))
	if symbol == "" {
		c.WriteJSON(fiber.Map{"error": "symbol is required"})
		c.Close()
		return
	}

	streamID := "trades:" + symbol
	h.registerClient(streamID, c)
	defer h.unregisterClient(streamID, c)

	// Envia trades recentes ao conectar
	trades, err := h.marketData.GetRecentTrades(symbol, 10)
	if err == nil {
		for _, trade := range trades {
			c.WriteJSON(fiber.Map{
				"stream": "trades",
				"data":   trade,
			})
		}
	}

	// Mantém conexão viva
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// Ping para manter conexão
		if err := c.WriteJSON(fiber.Map{"type": "ping"}); err != nil {
			return
		}
	}
}

func (h *MarketDataWSHandler) HandleBook(c *websocket.Conn) {
	symbol := strings.ToUpper(c.Query("symbol", ""))
	if symbol == "" {
		c.WriteJSON(fiber.Map{"error": "symbol is required"})
		c.Close()
		return
	}

	streamID := "book:" + symbol
	h.registerClient(streamID, c)
	defer h.unregisterClient(streamID, c)

	// Envia snapshot inicial
	snapshot, ok := h.marketData.GetOrderBook(symbol)
	if !ok {
		if h.matching != nil {
			snapshot = h.matching.GetOrderBookSnapshot(symbol, 50)
		} else {
			// Se não tiver matching engine, retorna order book vazio
			snapshot = engine.OrderBookSnapshot{
				Symbol: symbol,
				Bids:   []engine.OrderBookLevel{},
				Asks:   []engine.OrderBookLevel{},
			}
		}
	}
	c.WriteJSON(fiber.Map{
		"stream": "book",
		"data":   snapshot,
	})

	// Mantém conexão viva
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if err := c.WriteJSON(fiber.Map{"type": "ping"}); err != nil {
			return
		}
	}
}

func (h *MarketDataWSHandler) HandleTicker(c *websocket.Conn) {
	symbol := strings.ToUpper(c.Query("symbol", ""))

	streamID := "ticker:" + symbol
	h.registerClient(streamID, c)
	defer h.unregisterClient(streamID, c)

	// Envia ticker inicial
	if symbol != "" {
		ticker, err := h.marketData.GetTicker(symbol)
		if err == nil && ticker != nil {
			c.WriteJSON(fiber.Map{
				"stream": "ticker",
				"data":   ticker,
			})
		} else {
			// Se não tiver ticker, envia um vazio para evitar erro no frontend
			c.WriteJSON(fiber.Map{
				"stream": "ticker",
				"data":   nil,
			})
		}
	} else {
		// Todos os tickers
		tickers, err := h.marketData.ListTickers()
		if err == nil && len(tickers) > 0 {
			c.WriteJSON(fiber.Map{
				"stream": "ticker",
				"data":   tickers,
			})
		} else {
			// Se não tiver tickers, envia array vazio
			c.WriteJSON(fiber.Map{
				"stream": "ticker",
				"data":   []interface{}{},
			})
		}
	}

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if err := c.WriteJSON(fiber.Map{"type": "ping"}); err != nil {
			return
		}
	}
}

func (h *MarketDataWSHandler) HandleCandles(c *websocket.Conn) {
	symbol := strings.ToUpper(c.Query("symbol", ""))
	if symbol == "" {
		c.WriteJSON(fiber.Map{"error": "symbol is required"})
		c.Close()
		return
	}

	intervalStr := c.Query("interval", "1h")
	interval := engine.CandleInterval(intervalStr)
	valid := []engine.CandleInterval{
		engine.Candle1m,
		engine.Candle5m,
		engine.Candle15m,
		engine.Candle1h,
		engine.Candle4h,
		engine.Candle1d,
	}
	isValid := false
	for _, v := range valid {
		if interval == v {
			isValid = true
			break
		}
	}
	if !isValid {
		c.WriteJSON(fiber.Map{"error": "invalid interval"})
		c.Close()
		return
	}

	streamID := "candles:" + symbol + ":" + string(interval)
	h.registerClient(streamID, c)
	defer h.unregisterClient(streamID, c)

	// Envia candles recentes
	candles, err := h.marketData.GetCandles(symbol, interval, 100)
	if err == nil && len(candles) > 0 {
		c.WriteJSON(fiber.Map{
			"stream": "candles",
			"data":   candles,
		})
	} else {
		// Se não tiver candles, envia array vazio para evitar erro no frontend
		c.WriteJSON(fiber.Map{
			"stream": "candles",
			"data":   []interface{}{},
		})
	}

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if err := c.WriteJSON(fiber.Map{"type": "ping"}); err != nil {
			return
		}
	}
}

func (h *MarketDataWSHandler) registerClient(streamID string, conn *websocket.Conn) {
	if h.clients[streamID] == nil {
		h.clients[streamID] = make(map[*websocket.Conn]bool)
	}
	h.clients[streamID][conn] = true
	log.Printf("[WS] Client connected to stream: %s", streamID)
}

func (h *MarketDataWSHandler) unregisterClient(streamID string, conn *websocket.Conn) {
	if clients, ok := h.clients[streamID]; ok {
		delete(clients, conn)
		if len(clients) == 0 {
			delete(h.clients, streamID)
		}
	}
	log.Printf("[WS] Client disconnected from stream: %s", streamID)
}

// BroadcastTrade envia um trade para todos os clientes conectados no stream de trades do símbolo
func (h *MarketDataWSHandler) BroadcastTrade(symbol string, trade *engine.TradeEvent) {
	streamID := "trades:" + symbol
	clients, ok := h.clients[streamID]
	if !ok {
		return
	}

	msg := fiber.Map{
		"stream": "trades",
		"data":   trade,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		return
	}

	for conn := range clients {
		if err := conn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
			delete(clients, conn)
		}
	}
}

// BroadcastTicker envia atualização de ticker
func (h *MarketDataWSHandler) BroadcastTicker(symbol string, ticker *engine.Ticker24h) {
	if ticker == nil {
		return // Não envia ticker nil
	}

	streamID := "ticker:" + symbol
	clients, ok := h.clients[streamID]
	if !ok {
		return
	}

	msg := fiber.Map{
		"stream": "ticker",
		"data":   ticker,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		return
	}

	for conn := range clients {
		if err := conn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
			delete(clients, conn)
		}
	}
}

// BroadcastCandle envia atualização de candle
func (h *MarketDataWSHandler) BroadcastCandle(candle *engine.Candle) {
	streamID := "candles:" + candle.Symbol + ":" + string(candle.Interval)
	clients, ok := h.clients[streamID]
	if !ok {
		return
	}

	msg := fiber.Map{
		"stream": "candles",
		"data":   candle,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		return
	}

	for conn := range clients {
		if err := conn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
			delete(clients, conn)
		}
	}
}

// BroadcastOrderBook envia snapshot de order book
func (h *MarketDataWSHandler) BroadcastOrderBook(symbol string, snapshot engine.OrderBookSnapshot) {
	streamID := "book:" + symbol
	clients, ok := h.clients[streamID]
	if !ok {
		return
	}

	msg := fiber.Map{
		"stream": "book",
		"data":   snapshot,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		return
	}

	for conn := range clients {
		if err := conn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
			delete(clients, conn)
		}
	}
}
