package engine

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type ClearingConfig struct {
	Mode               SettlementMode
	SettlementDelay    time.Duration
	EnableInstantChain bool
}

type ClearingEngine struct {
	repo       ClearingRepository
	custody    CustodyService
	blockchain BlockchainService
	eventBus   EventBus
	config     ClearingConfig
}

func NewClearingEngine(repo ClearingRepository, custody CustodyService, blockchain BlockchainService, eventBus EventBus, cfg ClearingConfig) *ClearingEngine {
	return &ClearingEngine{
		repo:       repo,
		custody:    custody,
		blockchain: blockchain,
		eventBus:   eventBus,
		config:     cfg,
	}
}

func (ce *ClearingEngine) OnTrade(trade *Trade, buyUserID, sellUserID string) error {
	settlementDate := ce.calcSettlementDate(trade.CreatedAt)
	baseAsset, quoteAsset := parseSymbol(trade.Symbol)

	baseQty := trade.Quantity
	quoteQty := trade.Price * trade.Quantity

	if err := ce.addToPosition(buyUserID, trade.Symbol, settlementDate, baseQty, -quoteQty); err != nil {
		return err
	}
	if err := ce.addToPosition(sellUserID, trade.Symbol, settlementDate, -baseQty, quoteQty); err != nil {
		return err
	}

	if ce.config.EnableInstantChain {
		_ = ce.SettleInstantOnChain(trade, buyUserID, sellUserID, baseAsset, quoteAsset)
	}

	return nil
}

func (ce *ClearingEngine) calcSettlementDate(tradeTime time.Time) time.Time {
	return tradeTime.Add(ce.config.SettlementDelay)
}

func (ce *ClearingEngine) addToPosition(userID, symbol string, settlementDate time.Time, baseDelta, quoteDelta float64) error {
	pos, err := ce.repo.FindClearingPosition(userID, symbol, settlementDate)
	if err != nil {
		return err
	}
	now := time.Now()

	if pos == nil {
		pos = &ClearingPosition{
			ID:             uuid.NewString(),
			UserID:         userID,
			Symbol:         symbol,
			SettlementDate: settlementDate,
			BaseDelta:      baseDelta,
			QuoteDelta:     quoteDelta,
			Status:         SettlementStatusPending,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		return ce.repo.SaveClearingPosition(pos)
	}

	pos.BaseDelta += baseDelta
	pos.QuoteDelta += quoteDelta
	pos.UpdatedAt = now
	return ce.repo.UpdateClearingPosition(pos)
}

func (ce *ClearingEngine) RunTPlusOneSettle(ctx context.Context, now time.Time) error {
	positions, err := ce.repo.ListPositionsToSettle(now)
	if err != nil {
		return err
	}
	if len(positions) == 0 {
		return nil
	}

	batch := &SettlementBatch{
		ID:             uuid.NewString(),
		SettlementDate: now,
		Mode:           ce.config.Mode,
		Status:         SettlementStatusProcessing,
		CreatedAt:      now,
	}
	if err := ce.repo.SaveSettlementBatch(batch); err != nil {
		return err
	}

	for _, pos := range positions {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if err := ce.settlePosition(pos); err != nil {
			pos.Status = SettlementStatusFailed
			pos.UpdatedAt = time.Now()
			_ = ce.repo.UpdateClearingPosition(pos)
			continue
		}

		pos.Status = SettlementStatusSettled
		pos.UpdatedAt = time.Now()
		_ = ce.repo.UpdateClearingPosition(pos)
	}

	completed := time.Now()
	batch.Status = SettlementStatusSettled
	batch.CompletedAt = &completed
	return ce.repo.UpdateSettlementBatch(batch)
}

func (ce *ClearingEngine) settlePosition(pos *ClearingPosition) error {
	if err := ce.custody.ApplySettlement(pos.UserID, pos.Symbol, pos.BaseDelta, pos.QuoteDelta); err != nil {
		return err
	}

	if ce.config.Mode == SettlementModeOnChain || ce.config.Mode == SettlementModeHybrid {
		baseAsset, quoteAsset := parseSymbol(pos.Symbol)
		if pos.BaseDelta != 0 {
			if err := ce.settleOnChain(pos.UserID, baseAsset, pos.BaseDelta); err != nil {
				return err
			}
		}
		if pos.QuoteDelta != 0 {
			if err := ce.settleOnChain(pos.UserID, quoteAsset, pos.QuoteDelta); err != nil {
				return err
			}
		}
	}

	return nil
}

func (ce *ClearingEngine) settleOnChain(userID, asset string, amount float64) error {
	if ce.blockchain == nil || amount == 0 {
		return nil
	}

	to, err := ce.blockchain.GetSettlementAddress(userID, asset)
	if err != nil {
		return err
	}
	from := "EXCHANGE_CUSTODY_" + asset
	_, err = ce.blockchain.Transfer(asset, from, to, amount)
	return err
}

func (ce *ClearingEngine) SettleInstantOnChain(trade *Trade, buyUserID, sellUserID, baseAsset, quoteAsset string) error {
	if ce.blockchain == nil {
		return nil
	}

	baseQty := trade.Quantity
	quoteQty := trade.Price * trade.Quantity

	if err := ce.settleOnChain(buyUserID, baseAsset, baseQty); err != nil {
		return err
	}
	if err := ce.settleOnChain(sellUserID, quoteAsset, quoteQty); err != nil {
		return err
	}
	return nil
}

func (ce *ClearingEngine) StartTPlusOneScheduler(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case now := <-ticker.C:
				if now.Hour() == 0 {
					_ = ce.RunTPlusOneSettle(ctx, now)
				}
			case <-ctx.Done():
				return
			}
		}
	}()
}

func parseSymbol(symbol string) (base, quote string) {
	for i := 0; i < len(symbol); i++ {
		if symbol[i] == '/' {
			return symbol[:i], symbol[i+1:]
		}
	}
	return symbol, ""
}
