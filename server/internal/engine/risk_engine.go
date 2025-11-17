package engine

import (
	"errors"
	"math"
	"time"

	"github.com/google/uuid"
)

type RiskEngine struct {
	cfg        RiskConfig
	posRepo    PositionRepository
	marginRepo MarginRepository
	priceFeed  PriceFeed
	riskRepo   RiskEventRepository
	notifier   RiskNotificationService
}

func NewRiskEngine(cfg RiskConfig, posRepo PositionRepository, marginRepo MarginRepository, priceFeed PriceFeed, riskRepo RiskEventRepository, notifier RiskNotificationService) *RiskEngine {
	return &RiskEngine{
		cfg:        cfg,
		posRepo:    posRepo,
		marginRepo: marginRepo,
		priceFeed:  priceFeed,
		riskRepo:   riskRepo,
		notifier:   notifier,
	}
}

func (re *RiskEngine) ValidateNewOrder(userID string, order *Order) error {
	if order.Type == OrderTypeLimit {
		if err := re.checkPriceBand(order.Symbol, order.Price); err != nil {
			re.logAndNotify(userID, order.Symbol, "PRICE_BAND", err.Error())
			return err
		}
	}

	if err := re.checkMaxNotionalPerOrder(order); err != nil {
		re.logAndNotify(userID, order.Symbol, "MAX_NOTIONAL", err.Error())
		return err
	}

	if err := re.checkMarginPreTrade(userID, order); err != nil {
		re.logAndNotify(userID, order.Symbol, "MARGIN_PRE_TRADE", err.Error())
		return err
	}

	return nil
}

func (re *RiskEngine) checkPriceBand(symbol string, price float64) error {
	ref, err := re.priceFeed.GetLastPrice(symbol)
	if err != nil || ref <= 0 {
		return nil
	}
	diff := math.Abs(price-ref) / ref * 100
	if diff > re.cfg.MaxPriceDeviationPercent {
		return errors.New("order price outside allowed band")
	}
	return nil
}

func (re *RiskEngine) checkMaxNotionalPerOrder(order *Order) error {
	refPrice := order.Price
	if order.Type == OrderTypeMarket {
		if last, err := re.priceFeed.GetLastPrice(order.Symbol); err == nil && last > 0 {
			refPrice = last
		}
	}
	notional := refPrice * order.Quantity
	if notional > re.cfg.MaxNotionalPerOrder {
		return errors.New("order notional exceeds limit")
	}
	return nil
}

func (re *RiskEngine) checkMarginPreTrade(userID string, order *Order) error {
	acc, err := re.ensureMarginAccount(userID)
	if err != nil {
		return err
	}
	refPrice := order.Price
	if order.Type == OrderTypeMarket {
		if last, err := re.priceFeed.GetLastPrice(order.Symbol); err == nil && last > 0 {
			refPrice = last
		}
	}
	orderNotional := refPrice * order.Quantity
	additionalMargin := orderNotional / re.cfg.MaxLeverage
	postUsed := acc.UsedMargin + additionalMargin
	requiredEquity := postUsed * re.cfg.MaintenanceMarginReq
	if acc.Equity < requiredEquity {
		return errors.New("insufficient margin for this order")
	}
	return nil
}

func (re *RiskEngine) ensureMarginAccount(userID string) (*MarginAccount, error) {
	acc, err := re.marginRepo.GetMarginAccount(userID)
	if acc == nil || err != nil {
		acc = &MarginAccount{
			UserID:    userID,
			Equity:    0,
			UpdatedAt: time.Now(),
		}
		if err := re.marginRepo.SaveMarginAccount(acc); err != nil {
			return nil, err
		}
	}
	return acc, nil
}

func (re *RiskEngine) OnTrade(trade *Trade, buyUserID, sellUserID string) error {
	if err := re.applyTradeToPosition(buyUserID, trade.Symbol, trade.Quantity, trade.Price, SideBuy); err != nil {
		return err
	}
	if err := re.applyTradeToPosition(sellUserID, trade.Symbol, trade.Quantity, trade.Price, SideSell); err != nil {
		return err
	}
	if err := re.recalcMarginForUser(buyUserID); err != nil {
		return err
	}
	if err := re.recalcMarginForUser(sellUserID); err != nil {
		return err
	}
	return nil
}

func (re *RiskEngine) applyTradeToPosition(userID, symbol string, qty, price float64, side Side) error {
	pos, err := re.posRepo.GetPosition(userID, symbol)
	if err != nil || pos == nil {
		pos = &Position{
			ID:        uuid.NewString(),
			UserID:    userID,
			Symbol:    symbol,
			Quantity:  0,
			AvgPrice:  0,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		if err := re.posRepo.SavePosition(pos); err != nil {
			return err
		}
	}

	if side == SideBuy {
		totalCost := pos.AvgPrice*pos.Quantity + price*qty
		newQty := pos.Quantity + qty
		if newQty != 0 {
			pos.AvgPrice = totalCost / newQty
		} else {
			pos.AvgPrice = 0
		}
		pos.Quantity = newQty
	} else {
		pos.Quantity -= qty
		if pos.Quantity == 0 {
			pos.AvgPrice = 0
		}
	}
	pos.UpdatedAt = time.Now()
	return re.posRepo.UpdatePosition(pos)
}

func (re *RiskEngine) recalcMarginForUser(userID string) error {
	acc, err := re.ensureMarginAccount(userID)
	if err != nil {
		return err
	}
	posList, err := re.posRepo.ListPositions(userID)
	if err != nil {
		return err
	}

	var equity float64
	for _, pos := range posList {
		if pos.Quantity == 0 {
			continue
		}
		mark, err := re.priceFeed.GetLastPrice(pos.Symbol)
		if err != nil || mark <= 0 {
			continue
		}
		pnl := (mark - pos.AvgPrice) * pos.Quantity
		equity += pnl
	}

	acc.Equity = equity
	acc.UpdatedAt = time.Now()
	if acc.UsedMargin > 0 {
		required := acc.UsedMargin * re.cfg.MaintenanceMarginReq
		acc.MaintenanceReq = required
		if acc.Equity < required {
			re.logAndNotify(userID, "", "MARGIN_CALL", "equity below maintenance requirement")
		}
	}

	return re.marginRepo.UpdateMarginAccount(acc)
}

func (re *RiskEngine) logAndNotify(userID, symbol, eventType, msg string) {
	now := time.Now()
	if re.riskRepo != nil {
		_ = re.riskRepo.LogRiskEvent(userID, symbol, eventType, msg, now)
	}
	if re.notifier != nil {
		_ = re.notifier.NotifyRiskEvent(userID, symbol, msg)
	}
}
