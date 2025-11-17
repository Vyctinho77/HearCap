package engine

import (
	"log"
)

// NoOpMarketDataPublisher é uma implementação stub que apenas loga eventos.
// Use isso como base para implementar WebSocket, Kafka, Redis pub/sub, etc.
type NoOpMarketDataPublisher struct{}

func NewNoOpMarketDataPublisher() *NoOpMarketDataPublisher {
	return &NoOpMarketDataPublisher{}
}

func (p *NoOpMarketDataPublisher) PublishTicker(t *Ticker24h) error {
	log.Printf("[MarketData] Ticker updated: %s @ %.2f (%.2f%%)", t.Symbol, t.LastPrice, t.PriceChangePercent)
	return nil
}

func (p *NoOpMarketDataPublisher) PublishTrade(ev *TradeEvent) error {
	log.Printf("[MarketData] Trade: %s %s %.2f @ %.2f (source: %s)", ev.Symbol, ev.Side, ev.Quantity, ev.Price, ev.Source)
	return nil
}

func (p *NoOpMarketDataPublisher) PublishCandle(c *Candle) error {
	log.Printf("[MarketData] Candle: %s %s O:%.2f H:%.2f L:%.2f C:%.2f V:%.2f", c.Symbol, c.Interval, c.Open, c.High, c.Low, c.Close, c.Volume)
	return nil
}

func (p *NoOpMarketDataPublisher) PublishOrderBook(snapshot OrderBookSnapshot) error {
	log.Printf("[MarketData] OrderBook: %s (bids: %d, asks: %d)", snapshot.Symbol, len(snapshot.Bids), len(snapshot.Asks))
	return nil
}

