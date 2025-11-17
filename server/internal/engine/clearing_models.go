package engine

import "time"

type SettlementMode int

const (
	SettlementModeOffChain SettlementMode = iota
	SettlementModeOnChain
	SettlementModeHybrid
)

type SettlementStatus string

const (
	SettlementStatusPending    SettlementStatus = "PENDING"
	SettlementStatusProcessing SettlementStatus = "PROCESSING"
	SettlementStatusSettled    SettlementStatus = "SETTLED"
	SettlementStatusFailed     SettlementStatus = "FAILED"
)

type ClearingPosition struct {
	ID             string
	UserID         string
	Symbol         string
	SettlementDate time.Time
	BaseDelta      float64
	QuoteDelta     float64
	Status         SettlementStatus
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type SettlementBatch struct {
	ID             string
	Symbol         string
	SettlementDate time.Time
	Mode           SettlementMode

	Status       SettlementStatus
	CreatedAt    time.Time
	CompletedAt  *time.Time
	ErrorMessage *string
}
