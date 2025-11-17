package engine

import "time"

// Repository abstrai persistência de ordens e trades.
type Repository interface {
	SaveOrder(order *Order) error
	UpdateOrder(order *Order) error
	SaveTrade(trade *Trade) error
}

// BalanceService coordena travas e verificações de saldo.
type BalanceService interface {
	CanLockBase(userID, symbol string, qty float64) bool
	CanLockQuote(userID, symbol string, notional float64) bool
	LockBase(userID, symbol string, qty float64) error
	LockQuote(userID, symbol string, notional float64) error
	ReleaseBase(userID, symbol string, qty float64) error
	ReleaseQuote(userID, symbol string, notional float64) error
}

// EventBus publica atualizações de book e trades em tempo real.
type EventBus interface {
	PublishOrderBookUpdate(symbol string, snapshot OrderBookSnapshot) error
	PublishTrade(trade *Trade) error
}

// Repositório específico da camada de clearing.
type ClearingRepository interface {
	SaveClearingPosition(pos *ClearingPosition) error
	UpdateClearingPosition(pos *ClearingPosition) error
	FindClearingPosition(userID, symbol string, settlementDate time.Time) (*ClearingPosition, error)
	ListPositionsToSettle(beforeOrEqual time.Time) ([]*ClearingPosition, error)
	SaveSettlementBatch(batch *SettlementBatch) error
	UpdateSettlementBatch(batch *SettlementBatch) error
}

type CustodyService interface {
	ApplySettlement(userID, symbol string, baseDelta, quoteDelta float64) error
}

type BlockchainService interface {
	GetSettlementAddress(userID, asset string) (string, error)
	Transfer(asset, from, to string, amount float64) (string, error)
}

// -------- Governance / Listing --------

type ArtistMetricsService interface {
	GetArtistMetrics(artistID string) (*ArtistMetrics, error)
}

type ListingRepository interface {
	SaveListing(app *ListingApplication) error
	UpdateListing(app *ListingApplication) error
	FindListingByID(id string) (*ListingApplication, error)
	FindListingBySymbol(symbol string) (*ListingApplication, error)
	ListActiveListings() ([]*ListingApplication, error)
}

type GovernanceNotificationService interface {
	NotifyListingSubmitted(app *ListingApplication) error
	NotifyListingStatusChanged(app *ListingApplication) error
}

type CommitteeDirectory interface {
	IsCommitteeMember(userID string) bool
	GetCommitteeMembers() ([]string, error)
}

type CommitteeVoteRepository interface {
	SaveDecision(listingID string, decision CommitteeDecision) error
	ListDecisions(listingID string) ([]CommitteeDecision, error)
}

type MarketRegistry interface {
	CreateMarket(symbol string) error
	SuspendMarket(symbol string) error
	ResumeMarket(symbol string) error
	DelistMarket(symbol string) error
}

// -------- Corporate Actions --------

type CorporateActionRepository interface {
	SaveCorporateAction(ca *CorporateAction) error
	UpdateCorporateAction(ca *CorporateAction) error
	FindCorporateActionByID(id string) (*CorporateAction, error)
	ListPlannedActions(before time.Time) ([]*CorporateAction, error)
}

type HolderPosition struct {
	UserID   string
	Symbol   string
	Quantity float64
}

type HolderPositionService interface {
	GetHoldersOnRecordDate(symbol string, recordDate time.Time) ([]HolderPosition, error)
	ApplyCashDividend(userID, asset string, amount float64) error
	ApplyStockDividendOrSplit(userID, symbol string, oldQty, newQty float64) error
	GrantRights(userID, symbol string, rightsQty float64, subscriptionPrice float64, subscriptionAsset string) error
}

// -------- Dark Pools / ATS --------

type DarkPoolRepository interface {
	SavePool(pool *DarkPool) error
	UpdatePool(pool *DarkPool) error
	FindPoolByID(id string) (*DarkPool, error)
	ListActivePoolsForSymbol(symbol string) ([]*DarkPool, error)

	SaveDarkOrder(order *DarkPoolOrder) error
	UpdateDarkOrder(order *DarkPoolOrder) error
	FindDarkOrderByID(id string) (*DarkPoolOrder, error)
	ListRestingOrders(poolID, symbol string) ([]*DarkPoolOrder, error)

	SaveBlockTrade(bt *BlockTrade) error
	UpdateBlockTrade(bt *BlockTrade) error
	ListBlockTradesToReport(before time.Time) ([]*BlockTrade, error)
	ListBlockTradesByWindow(from, to time.Time) ([]*BlockTrade, error)
}

type ReferencePriceService interface {
	GetMidPrice(symbol string) (float64, error)
}

type DarkPoolReportingService interface {
	PublishAggregatedVolume(agg DarkPoolVolumeAggregate) error
}

type DarkPoolVolumeAggregate struct {
	PoolID string
	Symbol string
	From   time.Time
	To     time.Time
	Volume float64
	Trades int64
}

// -------- Risk & Margin --------

type PositionRepository interface {
	GetPosition(userID, symbol string) (*Position, error)
	SavePosition(pos *Position) error
	UpdatePosition(pos *Position) error
	ListPositions(userID string) ([]Position, error)
}

type MarginRepository interface {
	GetMarginAccount(userID string) (*MarginAccount, error)
	SaveMarginAccount(acc *MarginAccount) error
	UpdateMarginAccount(acc *MarginAccount) error
}

type PriceFeed interface {
	GetLastPrice(symbol string) (float64, error)
}

type RiskNotificationService interface {
	NotifyRiskEvent(userID string, symbol string, msg string) error
	NotifyMarketHalt(symbol string, reason string) error
	NotifyMarketResume(symbol string) error
}

type MarketStatusRepository interface {
	GetMarketStatus(symbol string) (MarketStatus, error)
	SetMarketStatus(symbol string, status MarketStatus) error
}

type RiskEventRepository interface {
	LogRiskEvent(userID, symbol, eventType, description string, at time.Time) error
}

// -------- Wallet / Custódia --------

type AssetRepository interface {
	GetAsset(symbol string) (*Asset, error)
	ListAssets() ([]*Asset, error)
	SaveAsset(asset *Asset) error
	UpdateAsset(asset *Asset) error
}

type WalletRepository interface {
	GetOrCreateAccount(userID, asset string) (*WalletAccount, error)
	GetAccount(userID, asset string) (*WalletAccount, error)
	GetBalance(accountID string) (*Balance, error)
	SaveBalance(b *Balance) error
	UpdateBalance(b *Balance) error
}

type LedgerRepository interface {
	SaveEntry(entry *LedgerEntry) error
	ListEntriesByAccount(accountID string, limit int) ([]*LedgerEntry, error)
}

type DepositRepository interface {
	SaveDeposit(dep *DepositRequest) error
	UpdateDeposit(dep *DepositRequest) error
	FindDepositByID(id string) (*DepositRequest, error)
}

type WithdrawalRepository interface {
	SaveWithdrawal(w *WithdrawalRequest) error
	UpdateWithdrawal(w *WithdrawalRequest) error
	FindWithdrawalByID(id string) (*WithdrawalRequest, error)
}

// -------- Market Data --------

type CandleRepository interface {
	SaveCandle(c *Candle) error
	UpdateCandle(c *Candle) error
	GetRecentCandles(symbol string, interval CandleInterval, limit int) ([]*Candle, error)
	GetLastCandle(symbol string, interval CandleInterval) (*Candle, error)
}

type TradeHistoryRepository interface {
	SaveTradeEvent(ev *TradeEvent) error
	GetRecentTrades(symbol string, limit int) ([]*TradeEvent, error)
}

type TickerRepository interface {
	SaveTicker(t *Ticker24h) error
	GetTicker(symbol string) (*Ticker24h, error)
	ListTickers() ([]*Ticker24h, error)
}

type MarketDataPublisher interface {
	PublishTicker(t *Ticker24h) error
	PublishTrade(ev *TradeEvent) error
	PublishCandle(c *Candle) error
	PublishOrderBook(snapshot OrderBookSnapshot) error
}
