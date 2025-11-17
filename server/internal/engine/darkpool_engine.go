package engine

import (
	"errors"
	"sort"
	"time"

	"github.com/google/uuid"
)

type DarkPoolEngineConfig struct {
	PostTradeReportDelay time.Duration
	AggregationWindow    time.Duration
}

type DarkPoolEngine struct {
	repo       DarkPoolRepository
	refPrice   ReferencePriceService
	clearing   *ClearingEngine
	blockchain BlockchainService
	marketData *MarketDataEngine
	config     DarkPoolEngineConfig
}

func NewDarkPoolEngine(repo DarkPoolRepository, refPrice ReferencePriceService, clearing *ClearingEngine, blockchain BlockchainService, marketData *MarketDataEngine, cfg DarkPoolEngineConfig) *DarkPoolEngine {
	return &DarkPoolEngine{
		repo:       repo,
		refPrice:   refPrice,
		clearing:   clearing,
		blockchain: blockchain,
		marketData: marketData,
		config:     cfg,
	}
}

type CreateDarkPoolRequest struct {
	Name        string
	Symbol      string
	OwnerID     string
	Type        DarkPoolType
	MinBlockQty float64
	PricingMode string
}

func (dpe *DarkPoolEngine) CreatePool(req CreateDarkPoolRequest) (*DarkPool, error) {
	if req.MinBlockQty <= 0 {
		return nil, errors.New("min block qty must be > 0")
	}
	now := time.Now()
	pool := &DarkPool{
		ID:          uuid.NewString(),
		Name:        req.Name,
		Symbol:      req.Symbol,
		OwnerID:     req.OwnerID,
		Type:        req.Type,
		MinBlockQty: req.MinBlockQty,
		PricingMode: req.PricingMode,
		Status:      DarkPoolStatusActive,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := dpe.repo.SavePool(pool); err != nil {
		return nil, err
	}
	return pool, nil
}

type DarkPoolOrderRequest struct {
	PoolID    string
	UserID    string
	Symbol    string
	Side      Side
	Quantity  float64
	MinQty    float64
	PriceHint *float64
}

func (dpe *DarkPoolEngine) PlaceDarkOrder(req DarkPoolOrderRequest) (*DarkPoolOrder, error) {
	pool, err := dpe.repo.FindPoolByID(req.PoolID)
	if err != nil {
		return nil, err
	}
	if pool.Status != DarkPoolStatusActive {
		return nil, errors.New("pool not active")
	}
	if pool.Symbol != req.Symbol {
		return nil, errors.New("symbol mismatch")
	}
	if req.Quantity < pool.MinBlockQty {
		return nil, errors.New("quantity below min block size")
	}

	now := time.Now()
	order := &DarkPoolOrder{
		ID:        uuid.NewString(),
		PoolID:    pool.ID,
		UserID:    req.UserID,
		Symbol:    req.Symbol,
		Side:      req.Side,
		Quantity:  req.Quantity,
		MinQty:    req.MinQty,
		PriceHint: req.PriceHint,
		Status:    DarkPoolOrderStatusNew,
		FilledQty: 0,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := dpe.repo.SaveDarkOrder(order); err != nil {
		return nil, err
	}

	if err := dpe.matchInPool(pool, order); err != nil {
		return nil, err
	}

	return order, nil
}

func (dpe *DarkPoolEngine) matchInPool(pool *DarkPool, incoming *DarkPoolOrder) error {
	resting, err := dpe.repo.ListRestingOrders(pool.ID, incoming.Symbol)
	if err != nil {
		return err
	}

	var candidates []*DarkPoolOrder
	for _, order := range resting {
		if order.ID == incoming.ID {
			continue
		}
		if order.Side == incoming.Side {
			continue
		}
		if order.Status != DarkPoolOrderStatusNew && order.Status != DarkPoolOrderStatusPartFilled {
			continue
		}
		candidates = append(candidates, order)
	}

	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].CreatedAt.Before(candidates[j].CreatedAt)
	})

	for _, other := range candidates {
		if incoming.FilledQty >= incoming.Quantity {
			break
		}
		remainingIncoming := incoming.Quantity - incoming.FilledQty
		remainingOther := other.Quantity - other.FilledQty
		size := min(remainingIncoming, remainingOther)

		if incoming.MinQty > 0 && size < incoming.MinQty {
			continue
		}
		if other.MinQty > 0 && size < other.MinQty {
			continue
		}

		price, err := dpe.determineBlockPrice(pool, incoming.Symbol)
		if err != nil {
			return err
		}

		bt, err := dpe.createBlockTrade(pool, incoming, other, price, size)
		if err != nil {
			return err
		}

		if err := dpe.forwardToClearing(bt); err != nil {
			return err
		}
	}

	return nil
}

func (dpe *DarkPoolEngine) determineBlockPrice(pool *DarkPool, symbol string) (float64, error) {
	switch pool.PricingMode {
	case "MIDPOINT", "NBBO_MID":
		return dpe.refPrice.GetMidPrice(symbol)
	default:
		return dpe.refPrice.GetMidPrice(symbol)
	}
}

func (dpe *DarkPoolEngine) createBlockTrade(pool *DarkPool, o1, o2 *DarkPoolOrder, price, qty float64) (*BlockTrade, error) {
	now := time.Now()
	var buyer, seller *DarkPoolOrder
	if o1.Side == SideBuy {
		buyer = o1
		seller = o2
	} else {
		buyer = o2
		seller = o1
	}

	buyer.FilledQty += qty
	seller.FilledQty += qty

	if buyer.FilledQty >= buyer.Quantity {
		buyer.Status = DarkPoolOrderStatusFilled
	} else {
		buyer.Status = DarkPoolOrderStatusPartFilled
	}

	if seller.FilledQty >= seller.Quantity {
		seller.Status = DarkPoolOrderStatusFilled
	} else {
		seller.Status = DarkPoolOrderStatusPartFilled
	}

	buyer.UpdatedAt = now
	seller.UpdatedAt = now

	if err := dpe.repo.UpdateDarkOrder(buyer); err != nil {
		return nil, err
	}
	if err := dpe.repo.UpdateDarkOrder(seller); err != nil {
		return nil, err
	}

	bt := &BlockTrade{
		ID:        uuid.NewString(),
		PoolID:    pool.ID,
		Symbol:    pool.Symbol,
		Price:     price,
		Quantity:  qty,
		BuyerID:   buyer.UserID,
		SellerID:  seller.UserID,
		CreatedAt: now,
	}

	if err := dpe.repo.SaveBlockTrade(bt); err != nil {
		return nil, err
	}

	// Notificar MarketDataEngine
	if dpe.marketData != nil {
		_ = dpe.marketData.OnTradeEvent(TradeEvent{
			ID:        bt.ID,
			Symbol:    bt.Symbol,
			Price:     bt.Price,
			Quantity:  bt.Quantity,
			Side:      SideBuy, // block trade sempre tem buyer/seller definidos
			Source:    TradeSourceDarkPool,
			Timestamp: bt.CreatedAt,
		})
	}

	return bt, nil
}

func (dpe *DarkPoolEngine) forwardToClearing(bt *BlockTrade) error {
	if dpe.clearing == nil {
		return nil
	}
	trade := &Trade{
		ID:        bt.ID,
		Symbol:    bt.Symbol,
		Price:     bt.Price,
		Quantity:  bt.Quantity,
		CreatedAt: bt.CreatedAt,
	}
	return dpe.clearing.OnTrade(trade, bt.BuyerID, bt.SellerID)
}

func (dpe *DarkPoolEngine) RunPostTradeReporting(now time.Time) error {
	cutoff := now.Add(-dpe.config.PostTradeReportDelay)
	trades, err := dpe.repo.ListBlockTradesToReport(cutoff)
	if err != nil {
		return err
	}
	for _, bt := range trades {
		bt.ReportedToLit = true
		bt.ReportedAt = &now
		if err := dpe.repo.UpdateBlockTrade(bt); err != nil {
			return err
		}
	}
	return nil
}

func (dpe *DarkPoolEngine) AggregateAndPublishVolumes(from, to time.Time, reporter DarkPoolReportingService) error {
	trades, err := dpe.repo.ListBlockTradesByWindow(from, to)
	if err != nil {
		return err
	}

	type key struct {
		pool string
		sym  string
	}
	aggregates := make(map[key]*DarkPoolVolumeAggregate)

	for _, bt := range trades {
		k := key{pool: bt.PoolID, sym: bt.Symbol}
		if _, ok := aggregates[k]; !ok {
			aggregates[k] = &DarkPoolVolumeAggregate{
				PoolID: bt.PoolID,
				Symbol: bt.Symbol,
				From:   from,
				To:     to,
				Volume: 0,
				Trades: 0,
			}
		}
		aggregates[k].Volume += bt.Quantity
		aggregates[k].Trades++
	}

	for _, agg := range aggregates {
		if err := reporter.PublishAggregatedVolume(*agg); err != nil {
			return err
		}
	}
	return nil
}
