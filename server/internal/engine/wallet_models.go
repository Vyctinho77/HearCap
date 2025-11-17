package engine

import "time"

type AssetType string

const (
	AssetTypeCrypto AssetType = "CRYPTO"
	AssetTypeFiat   AssetType = "FIAT"
	AssetTypeMusic  AssetType = "MUSIC_STOCK"
)

type Asset struct {
	Symbol      string
	Type        AssetType
	Decimals    int
	Description string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type WalletAccount struct {
	ID        string
	UserID    string
	Asset     string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Balance struct {
	AccountID string
	Available float64
	Locked    float64
	UpdatedAt time.Time
}

type LedgerEntryType string

const (
	LedgerEntryDeposit       LedgerEntryType = "DEPOSIT"
	LedgerEntryWithdrawal    LedgerEntryType = "WITHDRAWAL"
	LedgerEntryTrade         LedgerEntryType = "TRADE"
	LedgerEntryFee           LedgerEntryType = "FEE"
	LedgerEntryDividend      LedgerEntryType = "DIVIDEND"
	LedgerEntryCorporateAct  LedgerEntryType = "CORPORATE_ACTION"
	LedgerEntryAdjustment    LedgerEntryType = "ADJUSTMENT"
	LedgerEntryInternalTrans LedgerEntryType = "INTERNAL_TRANSFER"
)

type LedgerEntry struct {
	ID        string
	AccountID string
	Asset     string
	Type      LedgerEntryType
	Amount    float64
	Reference string
	CreatedAt time.Time
}

type DepositStatus string

const (
	DepositStatusPending   DepositStatus = "PENDING"
	DepositStatusConfirmed DepositStatus = "CONFIRMED"
	DepositStatusCanceled  DepositStatus = "CANCELED"
)

type DepositRequest struct {
	ID        string
	UserID    string
	Asset     string
	Amount    float64
	Status    DepositStatus
	TxHash    *string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type WithdrawalStatus string

const (
	WithdrawalStatusRequested  WithdrawalStatus = "REQUESTED"
	WithdrawalStatusProcessing WithdrawalStatus = "PROCESSING"
	WithdrawalStatusCompleted  WithdrawalStatus = "COMPLETED"
	WithdrawalStatusRejected   WithdrawalStatus = "REJECTED"
)

type WithdrawalRequest struct {
	ID        string
	UserID    string
	Asset     string
	Amount    float64
	Address   string
	Status    WithdrawalStatus
	TxHash    *string
	CreatedAt time.Time
	UpdatedAt time.Time
}

