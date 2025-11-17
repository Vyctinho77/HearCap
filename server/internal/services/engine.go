package services

import (
	"context"
	"errors"
	"math"
	"math/rand"
	"strings"
	"time"

	"hearcap/server/internal/config"
	"hearcap/server/internal/models"

	"gorm.io/gorm"
)

// PriceEngine orquestra popularityScore, supply e candles.
type PriceEngine struct {
	db         *gorm.DB
	cfg        *config.Config
	popularity *PopularityService
	pricing    *PricingService
	randomizer *rand.Rand
}

func NewPriceEngine(db *gorm.DB, cfg *config.Config) *PriceEngine {
	return &PriceEngine{
		db:         db,
		cfg:        cfg,
		popularity: NewPopularityService(),
		pricing:    NewPricingService(cfg),
		randomizer: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// GeneratePrices executa a rotina principal.
func (p *PriceEngine) GeneratePrices(ctx context.Context) error {
	var artists []models.Artist
	if err := p.db.WithContext(ctx).Preload("Tokens").Find(&artists).Error; err != nil {
		return err
	}

	for _, artist := range artists {
		score := p.popularity.CalculateScore()
		if err := p.db.WithContext(ctx).Model(&models.Artist{}).
			Where("id = ?", artist.ID).
			Update("popularity_score", score).Error; err != nil {
			return err
		}

		if len(artist.Tokens) == 0 {
			if err := p.createDefaultToken(ctx, &artist); err != nil {
				return err
			}
			if err := p.db.WithContext(ctx).Preload("Tokens").First(&artist, "id = ?", artist.ID).Error; err != nil {
				return err
			}
		}

		for _, token := range artist.Tokens {
			if err := p.processToken(ctx, &artist, &token, score); err != nil {
				return err
			}
		}
	}

	return nil
}

func (p *PriceEngine) createDefaultToken(ctx context.Context, artist *models.Artist) error {
	token := models.Token{
		ArtistID:          artist.ID,
		BasePrice:         p.cfg.BasePriceMin,
		Supply:            int64(p.cfg.SupplyBase),
		CirculatingSupply: int64(p.cfg.SupplyBase / 2),
	}
	return p.db.WithContext(ctx).Create(&token).Error
}

func (p *PriceEngine) processToken(ctx context.Context, artist *models.Artist, token *models.Token, score int) error {
	price, volatility := p.pricing.CalculatePrice(token.BasePrice, score)

	lastPrice, err := p.fetchLastPrice(ctx, artist.Symbol)
	var change float64
	if err == nil && lastPrice.Price > 0 {
		change = ((price - lastPrice.Price) / lastPrice.Price) * 100
		change = math.Round(change*10000) / 10000
	} else {
		change = 0
	}

	token.Supply = int64(p.cfg.SupplyBase)
	token.CirculatingSupply = CalculateSupply(p.cfg.SupplyBase, score)
	token.LastPopularitySeed = score
	token.BasePrice = price

	if err := p.db.WithContext(ctx).Save(token).Error; err != nil {
		return err
	}

	priceEntry := models.Price{
		Symbol:     artist.Symbol,
		Price:      price,
		Change24h:  change,
		Volatility: volatility,
	}
	if err := p.db.WithContext(ctx).Create(&priceEntry).Error; err != nil {
		return err
	}

	var previous float64
	if err == nil {
		previous = lastPrice.Price
	}

	candle := p.buildCandle(artist.Symbol, previous, price, score)
	return p.db.WithContext(ctx).Create(&candle).Error
}

func (p *PriceEngine) fetchLastPrice(ctx context.Context, symbol string) (models.Price, error) {
	var price models.Price
	err := p.db.WithContext(ctx).
		Where("symbol = ?", symbol).
		Order("created_at DESC").
		First(&price).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Price{}, err
	}

	return price, err
}

func (p *PriceEngine) buildCandle(symbol string, lastPrice, newPrice float64, popularity int) models.Candle {
	now := time.Now()
	open := newPrice
	if lastPrice > 0 {
		open = lastPrice
	}

	high := math.Max(open, newPrice) + p.randomizer.Float64()*0.25
	low := math.Min(open, newPrice) - p.randomizer.Float64()*0.25
	if low < 0 {
		low = 0
	}

	volume := float64(popularity*10) + p.randomizer.Float64()*250

	return models.Candle{
		Symbol:    symbol,
		Timestamp: now.Unix(),
		Open:      math.Round(open*10000) / 10000,
		High:      math.Round(high*10000) / 10000,
		Low:       math.Round(low*10000) / 10000,
		Close:     math.Round(newPrice*10000) / 10000,
		Volume:    math.Round(volume*100) / 100,
	}
}

// GetLatestPrice retorna o preço mais recente do símbolo ou o basePrice do token.
func (p *PriceEngine) GetLatestPrice(db *gorm.DB, symbol string) (float64, error) {
	if db == nil {
		db = p.db
	}

	symbol = strings.ToUpper(symbol)

	var price models.Price
	err := db.
		Where("symbol = ?", symbol).
		Order("created_at DESC").
		First(&price).Error
	if err == nil && price.Price > 0 {
		return price.Price, nil
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		type tokenWithPrice struct {
			BasePrice float64
		}
		var token tokenWithPrice
		if errToken := db.
			Table("tokens").
			Select("tokens.base_price").
			Joins("JOIN artists ON artists.id = tokens.artist_id").
			Where("artists.symbol = ?", symbol).
			Order("tokens.created_at DESC").
			First(&token).Error; errToken == nil && token.BasePrice > 0 {
			return token.BasePrice, nil
		}
	}

	return 0, err
}

// ApplyTradeImpact ajusta o preço após uma negociação e registra snapshot/candle.
func (p *PriceEngine) ApplyTradeImpact(tx *gorm.DB, symbol string, side string, currentPrice, quantity, notional float64) (float64, *models.Price, *models.Candle, error) {
	if tx == nil {
		tx = p.db
	}

	symbol = strings.ToUpper(symbol)
	impact := p.cfg.TradeImpactAlpha * (quantity / p.cfg.TradeImpactLiquidity)
	if impact < 0 {
		impact = 0
	}

	multiplier := 1.0
	if strings.EqualFold(side, "buy") {
		multiplier += impact
	} else {
		multiplier -= impact
		if multiplier < 0.1 {
			multiplier = 0.1
		}
	}

	newPrice := math.Max(currentPrice*multiplier, 0.0001)
	changePct := 0.0
	if currentPrice > 0 {
		changePct = ((newPrice - currentPrice) / currentPrice) * 100
	}

	priceEntry := models.Price{
		Symbol:     symbol,
		Price:      math.Round(newPrice*10000) / 10000,
		Change24h:  math.Round(changePct*1000) / 1000,
		Volatility: impact,
	}
	if err := tx.Create(&priceEntry).Error; err != nil {
		return 0, nil, nil, err
	}

	candle := models.Candle{
		Symbol:    symbol,
		Timestamp: time.Now().Unix(),
		Open:      math.Round(currentPrice*10000) / 10000,
		High:      math.Round(math.Max(currentPrice, newPrice)*10000) / 10000,
		Low:       math.Round(math.Min(currentPrice, newPrice)*10000) / 10000,
		Close:     math.Round(newPrice*10000) / 10000,
		Volume:    math.Round(notional*100) / 100,
	}
	if err := tx.Create(&candle).Error; err != nil {
		return 0, nil, nil, err
	}

	return priceEntry.Price, &priceEntry, &candle, nil
}
