package engine

import "time"

type DarkPoolType string

const (
	DarkPoolTypeBrokerOwned   DarkPoolType = "BROKER_OWNED"
	DarkPoolTypeExchangeOwned DarkPoolType = "EXCHANGE_OWNED"
)

type DarkPoolStatus string

const (
	DarkPoolStatusActive   DarkPoolStatus = "ACTIVE"
	DarkPoolStatusPaused   DarkPoolStatus = "PAUSED"
	DarkPoolStatusDisabled DarkPoolStatus = "DISABLED"
)

type DarkPool struct {
	ID          string
	Name        string
	Symbol      string
	OwnerID     string
	Type        DarkPoolType
	MinBlockQty float64
	Status      DarkPoolStatus
	PricingMode string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type DarkPoolOrderStatus string

const (
	DarkPoolOrderStatusNew        DarkPoolOrderStatus = "NEW"
	DarkPoolOrderStatusPartFilled DarkPoolOrderStatus = "PART_FILLED"
	DarkPoolOrderStatusFilled     DarkPoolOrderStatus = "FILLED"
	DarkPoolOrderStatusCanceled   DarkPoolOrderStatus = "CANCELED"
)

type DarkPoolOrder struct {
	ID        string
	PoolID    string
	UserID    string
	Symbol    string
	Side      Side
	Quantity  float64
	MinQty    float64
	PriceHint *float64
	Status    DarkPoolOrderStatus
	FilledQty float64
	CreatedAt time.Time
	UpdatedAt time.Time
}

type BlockTrade struct {
	ID             string
	PoolID         string
	Symbol         string
	Price          float64
	Quantity       float64
	BuyerID        string
	SellerID       string
	ReportedToLit  bool
	ReportedAt     *time.Time
	OnChainSettled bool
	OnChainTxHash  *string
	CreatedAt      time.Time
}
