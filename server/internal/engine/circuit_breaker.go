package engine

import (
	"sync"
	"time"
)

type CircuitBreakerEngine struct {
	cfg        RiskConfig
	marketRepo MarketStatusRepository
	notifier   RiskNotificationService

	mu    sync.Mutex
	ticks map[string][]PriceTick
	halts map[string]time.Time
}

func NewCircuitBreakerEngine(cfg RiskConfig, marketRepo MarketStatusRepository, notifier RiskNotificationService) *CircuitBreakerEngine {
	return &CircuitBreakerEngine{
		cfg:        cfg,
		marketRepo: marketRepo,
		notifier:   notifier,
		ticks:      make(map[string][]PriceTick),
		halts:      make(map[string]time.Time),
	}
}

func (c *CircuitBreakerEngine) OnTradeTick(symbol string, price float64, t time.Time) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if until, ok := c.halts[symbol]; ok && t.Before(until) {
		return nil
	}

	c.ticks[symbol] = append(c.ticks[symbol], PriceTick{
		Symbol:    symbol,
		Price:     price,
		Timestamp: t,
	})

	windowStart := t.Add(-c.cfg.CircuitBreakerWindow)
	var filtered []PriceTick
	for _, tick := range c.ticks[symbol] {
		if tick.Timestamp.After(windowStart) {
			filtered = append(filtered, tick)
		}
	}
	c.ticks[symbol] = filtered

	if len(filtered) == 0 {
		return nil
	}

	first := filtered[0].Price
	low, high := first, first
	for _, tick := range filtered {
		if tick.Price < low {
			low = tick.Price
		}
		if tick.Price > high {
			high = tick.Price
		}
	}

	moveUp := (high - first) / first * 100
	moveDown := (first - low) / first * 100

	if moveUp >= c.cfg.CircuitBreakerMovePercent || moveDown >= c.cfg.CircuitBreakerMovePercent {
		until := t.Add(c.cfg.CircuitBreakerHaltTime)
		c.halts[symbol] = until
		_ = c.marketRepo.SetMarketStatus(symbol, MarketStatusHalted)
		if c.notifier != nil {
			_ = c.notifier.NotifyMarketHalt(symbol, "Circuit breaker triggered")
		}
	}

	return nil
}

func (c *CircuitBreakerEngine) CanTrade(symbol string, now time.Time) bool {
	c.mu.Lock()
	defer c.mu.Unlock()

	if until, ok := c.halts[symbol]; ok {
		if now.Before(until) {
			return false
		}
		delete(c.halts, symbol)
		_ = c.marketRepo.SetMarketStatus(symbol, MarketStatusOpen)
		if c.notifier != nil {
			_ = c.notifier.NotifyMarketResume(symbol)
		}
	}
	return true
}
