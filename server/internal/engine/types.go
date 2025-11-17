package engine

import (
	"time"
)

type Side string

const (
	SideBuy  Side = "BUY"
	SideSell Side = "SELL"
)

type OrderType string

const (
	OrderTypeMarket OrderType = "MARKET"
	OrderTypeLimit  OrderType = "LIMIT"
	OrderTypeStop   OrderType = "STOP"
)

type OrderStatus string

const (
	OrderStatusNew        OrderStatus = "NEW"
	OrderStatusPartFilled OrderStatus = "PARTIALLY_FILLED"
	OrderStatusFilled     OrderStatus = "FILLED"
	OrderStatusCanceled   OrderStatus = "CANCELED"
)

type Order struct {
	ID        string
	UserID    string
	Symbol    string
	Side      Side
	Type      OrderType
	Price     float64
	StopPrice float64
	Quantity  float64
	FilledQty float64

	Status    OrderStatus
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (o *Order) RemainingQty() float64 {
	return o.Quantity - o.FilledQty
}

type Trade struct {
	ID        string
	Symbol    string
	BuyOrder  string
	SellOrder string
	Price     float64
	Quantity  float64
	CreatedAt time.Time
}

type NewOrderRequest struct {
	UserID    string
	Symbol    string
	Side      Side
	Type      OrderType
	Price     float64
	StopPrice float64
	Quantity  float64
}
