package handlers

import (
	"encoding/json"
	"log"
	"strings"
	"sync"
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
	mu         sync.RWMutex                        // protege o map de clients
}

func NewMarketDataWSHandler(marketData *engine.MarketDataEngine, matching *engine.MatchingEngine) *MarketDataWSHandler {
	return &MarketDataWSHandler{
		marketData: marketData,
		matching:   matching,
		clients:    make(map[string]map[*websocket.Conn]bool),
	}
}

// SetMarketDataEngine atualiza o engine do handler (thread-safe)
func (h *MarketDataWSHandler) SetMarketDataEngine(engine *engine.MarketDataEngine) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.marketData = engine
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
	symbolParam := strings.ToUpper(c.Query("symbol", ""))
	// Permite symbol vazio para listar todos os tickers, mas normaliza o streamID
	streamSymbol := symbolParam
	if streamSymbol == "" {
		streamSymbol = "*" // usa * para representar "todos"
	}

	streamID := "ticker:" + streamSymbol
	h.registerClient(streamID, c)
	defer h.unregisterClient(streamID, c)

	// Envia ticker inicial
	if symbolParam != "" {
		ticker, err := h.marketData.GetTicker(symbolParam)
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
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[streamID] == nil {
		h.clients[streamID] = make(map[*websocket.Conn]bool)
	}
	h.clients[streamID][conn] = true
	log.Printf("[WS] Client connected to stream: %s", streamID)
}

func (h *MarketDataWSHandler) unregisterClient(streamID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
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
	h.mu.RLock()
	clients, ok := h.clients[streamID]
	if !ok {
		h.mu.RUnlock()
		return
	}
	// Cria uma cópia do map para não manter o lock durante o envio
	clientsCopy := make(map[*websocket.Conn]bool, len(clients))
	for conn := range clients {
		clientsCopy[conn] = true
	}
	h.mu.RUnlock()

	msg := fiber.Map{
		"stream": "trades",
		"data":   trade,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		return
	}

	for conn := range clientsCopy {
		if err := conn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
			h.unregisterClient(streamID, conn)
		}
	}
}

// BroadcastTicker envia atualização de ticker
func (h *MarketDataWSHandler) BroadcastTicker(symbol string, ticker *engine.Ticker24h) {
	if ticker == nil {
		return // Não envia ticker nil
	}

	streamID := "ticker:" + symbol
	h.mu.RLock()
	clients, ok := h.clients[streamID]
	if !ok {
		h.mu.RUnlock()
		return
	}
	// Também envia para clientes que estão escutando todos os tickers
	allClients, hasAll := h.clients["ticker:*"]
	clientsCopy := make(map[*websocket.Conn]bool, len(clients))
	for conn := range clients {
		clientsCopy[conn] = true
	}
	if hasAll {
		for conn := range allClients {
			clientsCopy[conn] = true
		}
	}
	h.mu.RUnlock()

	msg := fiber.Map{
		"stream": "ticker",
		"data":   ticker,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		return
	}

	for conn := range clientsCopy {
		if err := conn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
			h.unregisterClient(streamID, conn)
		}
	}
}

// BroadcastCandle envia atualização de candle
func (h *MarketDataWSHandler) BroadcastCandle(candle *engine.Candle) {
	streamID := "candles:" + candle.Symbol + ":" + string(candle.Interval)
	h.mu.RLock()
	clients, ok := h.clients[streamID]
	if !ok {
		h.mu.RUnlock()
		return
	}
	clientsCopy := make(map[*websocket.Conn]bool, len(clients))
	for conn := range clients {
		clientsCopy[conn] = true
	}
	h.mu.RUnlock()

	msg := fiber.Map{
		"stream": "candles",
		"data":   candle,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		return
	}

	for conn := range clientsCopy {
		if err := conn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
			h.unregisterClient(streamID, conn)
		}
	}
}

// BroadcastOrderBook envia snapshot de order book
func (h *MarketDataWSHandler) BroadcastOrderBook(symbol string, snapshot engine.OrderBookSnapshot) {
	streamID := "book:" + symbol
	h.mu.RLock()
	clients, ok := h.clients[streamID]
	if !ok {
		h.mu.RUnlock()
		return
	}
	clientsCopy := make(map[*websocket.Conn]bool, len(clients))
	for conn := range clients {
		clientsCopy[conn] = true
	}
	h.mu.RUnlock()

	msg := fiber.Map{
		"stream": "book",
		"data":   snapshot,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		return
	}

	for conn := range clientsCopy {
		if err := conn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
			h.unregisterClient(streamID, conn)
		}
	}
}
