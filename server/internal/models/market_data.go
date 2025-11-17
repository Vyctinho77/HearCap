package models

import (
	"time"

	"hearcap/server/internal/engine"

	"github.com/google/uuid"
)

// MarketDataCandle representa um candle OHLCV persistido no banco
type MarketDataCandle struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Symbol    string    `gorm:"size:16;index:idx_symbol_interval_time,unique;not null"`
	Interval  string    `gorm:"size:8;index:idx_symbol_interval_time,unique;not null"` // 1m, 5m, 1h, 1d
	OpenTime  time.Time `gorm:"index:idx_symbol_interval_time,unique;not null"`
	CloseTime time.Time
	Open      float64 `gorm:"type:numeric(18,8);not null"`
	High      float64 `gorm:"type:numeric(18,8);not null"`
	Low       float64 `gorm:"type:numeric(18,8);not null"`
	Close     float64 `gorm:"type:numeric(18,8);not null"`
	Volume    float64 `gorm:"type:numeric(18,8);not null;default:0"`
	Trades    int64   `gorm:"not null;default:0"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

// MarketDataTradeEvent representa um trade event persistido
type MarketDataTradeEvent struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Symbol    string    `gorm:"size:16;index:idx_symbol_time;not null"`
	Price     float64   `gorm:"type:numeric(18,8);not null"`
	Quantity  float64   `gorm:"type:numeric(18,8);not null"`
	Side      string    `gorm:"size:8;not null"`  // BUY ou SELL
	Source    string    `gorm:"size:16;not null"` // LIT ou DARK_POOL
	Timestamp time.Time `gorm:"index:idx_symbol_time;not null"`
	CreatedAt time.Time
}

// MarketDataTicker24h representa o ticker 24h persistido
type MarketDataTicker24h struct {
	Symbol             string  `gorm:"size:16;primaryKey"`
	LastPrice          float64 `gorm:"type:numeric(18,8);not null"`
	OpenPrice          float64 `gorm:"type:numeric(18,8);not null"`
	HighPrice          float64 `gorm:"type:numeric(18,8);not null"`
	LowPrice           float64 `gorm:"type:numeric(18,8);not null"`
	Volume             float64 `gorm:"type:numeric(18,8);not null;default:0"`
	QuoteVolume        float64 `gorm:"type:numeric(18,8);not null;default:0"`
	Trades             int64   `gorm:"not null;default:0"`
	PriceChange        float64 `gorm:"type:numeric(18,8);not null;default:0"`
	PriceChangePercent float64 `gorm:"type:numeric(8,4);not null;default:0"`
	OpenTime           time.Time
	CloseTime          time.Time
	UpdatedAt          time.Time
}

// ToEngine converte para o modelo do engine
func (m *MarketDataCandle) ToEngine() *engine.Candle {
	return &engine.Candle{
		Symbol:    m.Symbol,
		Interval:  engine.CandleInterval(m.Interval),
		OpenTime:  m.OpenTime,
		CloseTime: m.CloseTime,
		Open:      m.Open,
		High:      m.High,
		Low:       m.Low,
		Close:     m.Close,
		Volume:    m.Volume,
		Trades:    m.Trades,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}

}

// FromEngine cria a partir do modelo do engine
func (m *MarketDataCandle) FromEngine(c *engine.Candle) {
	m.Symbol = c.Symbol
	m.Interval = string(c.Interval)
	m.OpenTime = c.OpenTime
	m.CloseTime = c.CloseTime
	m.Open = c.Open
	m.High = c.High
	m.Low = c.Low
	m.Close = c.Close
	m.Volume = c.Volume
	m.Trades = c.Trades
	m.CreatedAt = c.CreatedAt
	m.UpdatedAt = c.UpdatedAt
}

// ToEngine converte para o modelo do engine
func (m *MarketDataTradeEvent) ToEngine() *engine.TradeEvent {
	return &engine.TradeEvent{
		ID:        m.ID.String(),
		Symbol:    m.Symbol,
		Price:     m.Price,
		Quantity:  m.Quantity,
		Side:      engine.Side(m.Side),
		Source:    engine.TradeSource(m.Source),
		Timestamp: m.Timestamp,
	}
}

// FromEngine cria a partir do modelo do engine
func (m *MarketDataTradeEvent) FromEngine(ev *engine.TradeEvent) {
	if ev.ID != "" {
		if id, err := uuid.Parse(ev.ID); err == nil {
			m.ID = id
		}
	}
	m.Symbol = ev.Symbol
	m.Price = ev.Price
	m.Quantity = ev.Quantity
	m.Side = string(ev.Side)
	m.Source = string(ev.Source)
	m.Timestamp = ev.Timestamp
	m.CreatedAt = time.Now()
}

// ToEngine converte para o modelo do engine
func (m *MarketDataTicker24h) ToEngine() *engine.Ticker24h {
	return &engine.Ticker24h{
		Symbol:             m.Symbol,
		LastPrice:          m.LastPrice,
		OpenPrice:          m.OpenPrice,
		HighPrice:          m.HighPrice,
		LowPrice:           m.LowPrice,
		Volume:             m.Volume,
		QuoteVolume:        m.QuoteVolume,
		Trades:             m.Trades,
		PriceChange:        m.PriceChange,
		PriceChangePercent: m.PriceChangePercent,
		OpenTime:           m.OpenTime,
		CloseTime:          m.CloseTime,
		UpdatedAt:          m.UpdatedAt,
	}
}

// FromEngine cria a partir do modelo do engine
func (m *MarketDataTicker24h) FromEngine(t *engine.Ticker24h) {
	m.Symbol = t.Symbol
	m.LastPrice = t.LastPrice
	m.OpenPrice = t.OpenPrice
	m.HighPrice = t.HighPrice
	m.LowPrice = t.LowPrice
	m.Volume = t.Volume
	m.QuoteVolume = t.QuoteVolume
	m.Trades = t.Trades
	m.PriceChange = t.PriceChange
	m.PriceChangePercent = t.PriceChangePercent
	m.OpenTime = t.OpenTime
	m.CloseTime = t.CloseTime
	m.UpdatedAt = t.UpdatedAt
}

