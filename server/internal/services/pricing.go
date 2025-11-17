package services

import (
	"math"
	"math/rand"
	"time"

	"hearcap/server/internal/config"
)

// PricingService aplica a fórmula de preço base + popularidade + volatilidade controlada.
type PricingService struct {
	cfg  *config.Config
	rand *rand.Rand
}

func NewPricingService(cfg *config.Config) *PricingService {
	source := rand.NewSource(time.Now().UnixNano())
	return &PricingService{
		cfg:  cfg,
		rand: rand.New(source),
	}
}

// CalculatePrice retorna o novo preço e o fator de volatilidade aplicado.
func (s *PricingService) CalculatePrice(base float64, popularity int) (float64, float64) {
	if base <= 0 {
		base = s.cfg.BasePriceMin + s.rand.Float64()*(s.cfg.BasePriceMax-s.cfg.BasePriceMin)
	}

	volatility := s.cfg.VolatilityMin + s.rand.Float64()*(s.cfg.VolatilityMax-s.cfg.VolatilityMin)
	price := base + (float64(popularity) * 0.1) + volatility

	return math.Round(price*10000) / 10000, volatility
}
