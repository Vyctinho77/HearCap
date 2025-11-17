package engine

import "time"

type TradeSource string

const (
	TradeSourceLit      TradeSource = "LIT"
	TradeSourceDarkPool TradeSource = "DARK_POOL"
)

type TradeEvent struct {
	ID        string
	Symbol    string
	Price     float64
	Quantity  float64
	Side      Side
	Source    TradeSource
	Timestamp time.Time
}

type CandleInterval string

const (
	Candle1m  CandleInterval = "1m"
	Candle5m  CandleInterval = "5m"
	Candle15m CandleInterval = "15m"
	Candle1h  CandleInterval = "1h"
	Candle4h  CandleInterval = "4h"
	Candle1d  CandleInterval = "1d"
)

type Candle struct {
	Symbol    string
	Interval  CandleInterval
	OpenTime  time.Time
	CloseTime time.Time

	Open   float64
	High   float64
	Low    float64
	Close  float64
	Volume float64
	Trades int64

	CreatedAt time.Time
	UpdatedAt time.Time
}

type Ticker24h struct {
	Symbol string

	LastPrice float64
	OpenPrice float64
	HighPrice float64
	LowPrice  float64

	Volume      float64
	QuoteVolume float64
	Trades      int64

	PriceChange        float64
	PriceChangePercent float64

	OpenTime  time.Time
	CloseTime time.Time
	UpdatedAt time.Time
}

