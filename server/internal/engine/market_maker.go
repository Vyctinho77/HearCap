package engine

import (
	"math/rand"
	"time"
)

type MarketMakerConfig struct {
	UserID       string
	Symbol       string
	BasePrice    float64
	Spread       float64
	OrderSize    float64
	RefreshDelay time.Duration
}

type MarketMaker struct {
	engine *MatchingEngine
	cfg    MarketMakerConfig
	stop   chan struct{}
}

func NewMarketMaker(engine *MatchingEngine, cfg MarketMakerConfig) *MarketMaker {
	return &MarketMaker{
		engine: engine,
		cfg:    cfg,
		stop:   make(chan struct{}),
	}
}

func (mm *MarketMaker) Start() {
	go func() {
		ticker := time.NewTicker(mm.cfg.RefreshDelay)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				mm.quote()
			case <-mm.stop:
				return
			}
		}
	}()
}

func (mm *MarketMaker) Stop() {
	select {
	case <-mm.stop:
	default:
		close(mm.stop)
	}
}

func (mm *MarketMaker) quote() {
	base := mm.cfg.BasePrice * (1 + (rand.Float64()-0.5)*0.01)
	bid := base * (1 - mm.cfg.Spread)
	ask := base * (1 + mm.cfg.Spread)

	_, _ = mm.engine.PlaceOrder(NewOrderRequest{
		UserID:   mm.cfg.UserID,
		Symbol:   mm.cfg.Symbol,
		Side:     SideBuy,
		Type:     OrderTypeLimit,
		Price:    bid,
		Quantity: mm.cfg.OrderSize,
	})

	_, _ = mm.engine.PlaceOrder(NewOrderRequest{
		UserID:   mm.cfg.UserID,
		Symbol:   mm.cfg.Symbol,
		Side:     SideSell,
		Type:     OrderTypeLimit,
		Price:    ask,
		Quantity: mm.cfg.OrderSize,
	})
}
