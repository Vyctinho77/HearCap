package handlers

import "hearcap/server/internal/engine"

// WSPublisher implementa MarketDataPublisher para broadcast via WebSocket
type WSPublisher struct {
	wsHandler *MarketDataWSHandler
}

func NewWSPublisher(wsHandler *MarketDataWSHandler) *WSPublisher {
	return &WSPublisher{
		wsHandler: wsHandler,
	}
}

func (p *WSPublisher) PublishTicker(t *engine.Ticker24h) error {
	p.wsHandler.BroadcastTicker(t.Symbol, t)
	return nil
}

func (p *WSPublisher) PublishTrade(ev *engine.TradeEvent) error {
	p.wsHandler.BroadcastTrade(ev.Symbol, ev)
	return nil
}

func (p *WSPublisher) PublishCandle(c *engine.Candle) error {
	p.wsHandler.BroadcastCandle(c)
	return nil
}

func (p *WSPublisher) PublishOrderBook(snapshot engine.OrderBookSnapshot) error {
	p.wsHandler.BroadcastOrderBook(snapshot.Symbol, snapshot)
	return nil
}

