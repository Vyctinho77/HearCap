package engine

import (
	"sync"
	"time"
)

type MarketDataConfig struct {
	TickerWindow    time.Duration
	CandleIntervals []CandleInterval
}

type MarketDataEngine struct {
	cfg       MarketDataConfig
	candles   CandleRepository
	trades    TradeHistoryRepository
	tickers   TickerRepository
	publisher MarketDataPublisher

	muTickers    sync.RWMutex
	cacheTickers map[string]*Ticker24h

	muBooks    sync.RWMutex
	cacheBooks map[string]OrderBookSnapshot
}

func NewMarketDataEngine(cfg MarketDataConfig, candles CandleRepository, trades TradeHistoryRepository, tickers TickerRepository, publisher MarketDataPublisher) *MarketDataEngine {
	if cfg.TickerWindow <= 0 {
		cfg.TickerWindow = 24 * time.Hour
	}
	if len(cfg.CandleIntervals) == 0 {
		cfg.CandleIntervals = []CandleInterval{Candle1m, Candle1h, Candle1d}
	}
	return &MarketDataEngine{
		cfg:          cfg,
		candles:      candles,
		trades:       trades,
		tickers:      tickers,
		publisher:    publisher,
		cacheTickers: make(map[string]*Ticker24h),
		cacheBooks:   make(map[string]OrderBookSnapshot),
	}
}

func (m *MarketDataEngine) OnTradeEvent(ev TradeEvent) error {
	eventCopy := ev

	if m.trades != nil {
		if err := m.trades.SaveTradeEvent(&eventCopy); err != nil {
			return err
		}
	}
	if err := m.updateCandles(&eventCopy); err != nil {
		return err
	}
	if err := m.updateTicker(&eventCopy); err != nil {
		return err
	}
	if m.publisher != nil {
		_ = m.publisher.PublishTrade(&eventCopy)
	}
	return nil
}

func (m *MarketDataEngine) OnOrderBookSnapshot(snap OrderBookSnapshot) {
	if snap.Symbol == "" {
		return
	}
	copySnap := cloneOrderBookSnapshot(snap)

	m.muBooks.Lock()
	m.cacheBooks[copySnap.Symbol] = copySnap
	m.muBooks.Unlock()

	if m.publisher != nil {
		_ = m.publisher.PublishOrderBook(copySnap)
	}
}

func (m *MarketDataEngine) GetOrderBook(symbol string) (OrderBookSnapshot, bool) {
	m.muBooks.RLock()
	defer m.muBooks.RUnlock()
	snap, ok := m.cacheBooks[symbol]
	if !ok {
		return OrderBookSnapshot{}, false
	}
	return cloneOrderBookSnapshot(snap), true
}

func (m *MarketDataEngine) GetTicker(symbol string) (*Ticker24h, error) {
	m.muTickers.RLock()
	if t, ok := m.cacheTickers[symbol]; ok {
		defer m.muTickers.RUnlock()
		return t, nil
	}
	m.muTickers.RUnlock()

	if m.tickers == nil {
		return nil, nil
	}
	t, err := m.tickers.GetTicker(symbol)
	if err != nil || t == nil {
		return t, err
	}
	m.muTickers.Lock()
	m.cacheTickers[symbol] = t
	m.muTickers.Unlock()
	return t, nil
}

func (m *MarketDataEngine) ListTickers() ([]*Ticker24h, error) {
	if m.tickers == nil {
		m.muTickers.RLock()
		var result []*Ticker24h
		for _, t := range m.cacheTickers {
			result = append(result, t)
		}
		m.muTickers.RUnlock()
		return result, nil
	}
	return m.tickers.ListTickers()
}

func (m *MarketDataEngine) GetCandles(symbol string, interval CandleInterval, limit int) ([]*Candle, error) {
	if m.candles == nil {
		return nil, nil
	}
	return m.candles.GetRecentCandles(symbol, interval, limit)
}

func (m *MarketDataEngine) GetRecentTrades(symbol string, limit int) ([]*TradeEvent, error) {
	if m.trades == nil {
		return nil, nil
	}
	return m.trades.GetRecentTrades(symbol, limit)
}

func (m *MarketDataEngine) updateCandles(ev *TradeEvent) error {
	if m.candles == nil {
		return nil
	}
	for _, interval := range m.cfg.CandleIntervals {
		if err := m.updateCandleForInterval(ev, interval); err != nil {
			return err
		}
	}
	return nil
}

func (m *MarketDataEngine) updateCandleForInterval(ev *TradeEvent, interval CandleInterval) error {
	start, end := alignToInterval(ev.Timestamp, interval)

	c, err := m.candles.GetLastCandle(ev.Symbol, interval)
	if err != nil {
		return err
	}
	if c == nil || !c.OpenTime.Equal(start) {
		return m.createNewCandle(ev, interval, start, end)
	}

	if ev.Price > c.High {
		c.High = ev.Price
	}
	if ev.Price < c.Low {
		c.Low = ev.Price
	}

	c.Close = ev.Price
	c.Volume += ev.Quantity
	c.Trades++
	c.UpdatedAt = ev.Timestamp

	if err := m.candles.UpdateCandle(c); err != nil {
		return err
	}
	if m.publisher != nil {
		_ = m.publisher.PublishCandle(c)
	}
	return nil
}

func (m *MarketDataEngine) createNewCandle(ev *TradeEvent, interval CandleInterval, start, end time.Time) error {
	candle := &Candle{
		Symbol:    ev.Symbol,
		Interval:  interval,
		OpenTime:  start,
		CloseTime: end,
		Open:      ev.Price,
		High:      ev.Price,
		Low:       ev.Price,
		Close:     ev.Price,
		Volume:    ev.Quantity,
		Trades:    1,
		CreatedAt: ev.Timestamp,
		UpdatedAt: ev.Timestamp,
	}
	if err := m.candles.SaveCandle(candle); err != nil {
		return err
	}
	if m.publisher != nil {
		_ = m.publisher.PublishCandle(candle)
	}
	return nil
}

func (m *MarketDataEngine) updateTicker(ev *TradeEvent) error {
	m.muTickers.Lock()
	defer m.muTickers.Unlock()

	windowStart := ev.Timestamp.Add(-m.cfg.TickerWindow)

	t, ok := m.cacheTickers[ev.Symbol]
	if !ok || t == nil {
		t = &Ticker24h{
			Symbol:      ev.Symbol,
			LastPrice:   ev.Price,
			OpenPrice:   ev.Price,
			HighPrice:   ev.Price,
			LowPrice:    ev.Price,
			Volume:      ev.Quantity,
			QuoteVolume: ev.Price * ev.Quantity,
			Trades:      1,
			OpenTime:    windowStart,
			CloseTime:   ev.Timestamp,
			UpdatedAt:   ev.Timestamp,
		}
		t.PriceChange = t.LastPrice - t.OpenPrice
		if t.OpenPrice != 0 {
			t.PriceChangePercent = t.PriceChange / t.OpenPrice * 100
		}
		m.cacheTickers[ev.Symbol] = t
		if m.tickers != nil {
			if err := m.tickers.SaveTicker(t); err != nil {
				return err
			}
		}
		if m.publisher != nil {
			_ = m.publisher.PublishTicker(t)
		}
		return nil
	}

	t.LastPrice = ev.Price
	if ev.Price > t.HighPrice {
		t.HighPrice = ev.Price
	}
	if ev.Price < t.LowPrice {
		t.LowPrice = ev.Price
	}
	t.Volume += ev.Quantity
	t.QuoteVolume += ev.Price * ev.Quantity
	t.Trades++
	t.CloseTime = ev.Timestamp
	t.UpdatedAt = ev.Timestamp

	t.PriceChange = t.LastPrice - t.OpenPrice
	if t.OpenPrice != 0 {
		t.PriceChangePercent = t.PriceChange / t.OpenPrice * 100
	}

	if m.tickers != nil {
		if err := m.tickers.SaveTicker(t); err != nil {
			return err
		}
	}
	if m.publisher != nil {
		_ = m.publisher.PublishTicker(t)
	}
	return nil
}

func alignToInterval(ts time.Time, interval CandleInterval) (time.Time, time.Time) {
	switch interval {
	case Candle1m:
		start := ts.Truncate(time.Minute)
		return start, start.Add(time.Minute)
	case Candle5m:
		start := ts.Truncate(5 * time.Minute)
		return start, start.Add(5 * time.Minute)
	case Candle15m:
		start := ts.Truncate(15 * time.Minute)
		return start, start.Add(15 * time.Minute)
	case Candle1h:
		start := ts.Truncate(time.Hour)
		return start, start.Add(time.Hour)
	case Candle4h:
		hours := ts.Truncate(4 * time.Hour)
		return hours, hours.Add(4 * time.Hour)
	case Candle1d:
		y, m, d := ts.Date()
		start := time.Date(y, m, d, 0, 0, 0, 0, ts.Location())
		return start, start.Add(24 * time.Hour)
	default:
		start := ts.Truncate(time.Minute)
		return start, start.Add(time.Minute)
	}
}

func cloneOrderBookSnapshot(snap OrderBookSnapshot) OrderBookSnapshot {
	copySnap := OrderBookSnapshot{
		Symbol: snap.Symbol,
	}
	if len(snap.Bids) > 0 {
		copySnap.Bids = append(copySnap.Bids, snap.Bids...)
	}
	if len(snap.Asks) > 0 {
		copySnap.Asks = append(copySnap.Asks, snap.Asks...)
	}
	return copySnap
}
