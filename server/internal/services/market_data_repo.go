package services

import (
	"hearcap/server/internal/engine"
	"hearcap/server/internal/models"

	"gorm.io/gorm"
)

// GORMCandleRepository implementa CandleRepository usando GORM
type GORMCandleRepository struct {
	db *gorm.DB
}

func NewGORMCandleRepository(db *gorm.DB) *GORMCandleRepository {
	return &GORMCandleRepository{db: db}
}

func (r *GORMCandleRepository) SaveCandle(c *engine.Candle) error {
	var m models.MarketDataCandle
	m.FromEngine(c)
	return r.db.Where("symbol = ? AND interval = ? AND open_time = ?", m.Symbol, m.Interval, m.OpenTime).
		Assign(models.MarketDataCandle{
			CloseTime: m.CloseTime,
			Open:      m.Open,
			High:      m.High,
			Low:       m.Low,
			Close:     m.Close,
			Volume:    m.Volume,
			Trades:    m.Trades,
			UpdatedAt: m.UpdatedAt,
		}).
		FirstOrCreate(&m).Error
}

func (r *GORMCandleRepository) UpdateCandle(c *engine.Candle) error {
	var m models.MarketDataCandle
	m.FromEngine(c)
	return r.db.Where("symbol = ? AND interval = ? AND open_time = ?", m.Symbol, m.Interval, m.OpenTime).
		Updates(&m).Error
}

func (r *GORMCandleRepository) GetRecentCandles(symbol string, interval engine.CandleInterval, limit int) ([]*engine.Candle, error) {
	var ms []models.MarketDataCandle
	if err := r.db.Where("symbol = ? AND interval = ?", symbol, string(interval)).
		Order("open_time DESC").
		Limit(limit).
		Find(&ms).Error; err != nil {
		return nil, err
	}

	result := make([]*engine.Candle, len(ms))
	for i := range ms {
		result[i] = ms[i].ToEngine()
	}
	return result, nil
}

func (r *GORMCandleRepository) GetLastCandle(symbol string, interval engine.CandleInterval) (*engine.Candle, error) {
	var m models.MarketDataCandle
	if err := r.db.Where("symbol = ? AND interval = ?", symbol, string(interval)).
		Order("open_time DESC").
		First(&m).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return m.ToEngine(), nil
}

// GORMTradeHistoryRepository implementa TradeHistoryRepository usando GORM
type GORMTradeHistoryRepository struct {
	db *gorm.DB
}

func NewGORMTradeHistoryRepository(db *gorm.DB) *GORMTradeHistoryRepository {
	return &GORMTradeHistoryRepository{db: db}
}

func (r *GORMTradeHistoryRepository) SaveTradeEvent(ev *engine.TradeEvent) error {
	var m models.MarketDataTradeEvent
	m.FromEngine(ev)
	return r.db.Create(&m).Error
}

func (r *GORMTradeHistoryRepository) GetRecentTrades(symbol string, limit int) ([]*engine.TradeEvent, error) {
	var ms []models.MarketDataTradeEvent
	if err := r.db.Where("symbol = ?", symbol).
		Order("timestamp DESC").
		Limit(limit).
		Find(&ms).Error; err != nil {
		return nil, err
	}

	result := make([]*engine.TradeEvent, len(ms))
	for i := range ms {
		result[i] = ms[i].ToEngine()
	}
	return result, nil
}

// GORMTickerRepository implementa TickerRepository usando GORM
type GORMTickerRepository struct {
	db *gorm.DB
}

func NewGORMTickerRepository(db *gorm.DB) *GORMTickerRepository {
	return &GORMTickerRepository{db: db}
}

func (r *GORMTickerRepository) SaveTicker(t *engine.Ticker24h) error {
	var m models.MarketDataTicker24h
	m.FromEngine(t)
	return r.db.Where("symbol = ?", m.Symbol).
		Assign(m).
		FirstOrCreate(&m).Error
}

func (r *GORMTickerRepository) GetTicker(symbol string) (*engine.Ticker24h, error) {
	var m models.MarketDataTicker24h
	if err := r.db.Where("symbol = ?", symbol).First(&m).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Silencioso - não loga "record not found" como erro (comportamento esperado)
			return nil, nil
		}
		return nil, err
	}
	return m.ToEngine(), nil
}

func (r *GORMTickerRepository) ListTickers() ([]*engine.Ticker24h, error) {
	var ms []models.MarketDataTicker24h
	if err := r.db.Find(&ms).Error; err != nil {
		return nil, err
	}

	result := make([]*engine.Ticker24h, len(ms))
	for i := range ms {
		result[i] = ms[i].ToEngine()
	}
	return result, nil
}
