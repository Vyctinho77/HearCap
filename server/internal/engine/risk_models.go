package engine

import "time"

type MarketStatus string

const (
	MarketStatusOpen   MarketStatus = "OPEN"
	MarketStatusHalted MarketStatus = "HALTED"
)

type Position struct {
	ID        string
	UserID    string
	Symbol    string
	Quantity  float64
	AvgPrice  float64
	CreatedAt time.Time
	UpdatedAt time.Time
}

type MarginAccount struct {
	UserID          string
	Equity          float64
	UsedMargin      float64
	MaintenanceReq  float64
	MarginCallLevel float64
	UpdatedAt       time.Time
}

type RiskConfig struct {
	MaxPriceDeviationPercent float64
	MaxNotionalPerOrder      float64
	MaxDailyNotional         float64
	MaxLeverage              float64
	MaintenanceMarginReq     float64

	CircuitBreakerMovePercent float64
	CircuitBreakerWindow      time.Duration
	CircuitBreakerHaltTime    time.Duration
}

type PriceTick struct {
	Symbol    string
	Price     float64
	Timestamp time.Time
}
