package services

import (
	"math/rand"
	"time"
)

// PopularityService gera métricas sintéticas enquanto o sistema musical real não está disponível.
type PopularityService struct {
	rand *rand.Rand
}

// NewPopularityService cria um gerador com seed automática.
func NewPopularityService() *PopularityService {
	source := rand.NewSource(time.Now().UnixNano())
	return &PopularityService{
		rand: rand.New(source),
	}
}

// CalculateScore gera o popularityScore usando a fórmula definida para a fase 1.
func (s *PopularityService) CalculateScore() int {
	plays7d := s.rand.Intn(9000) + 1000    // 1k - 10k plays semanais
	followers := s.rand.Intn(9000) + 1000  // 1k - 10k seguidores
	growthRate := s.rand.Float64()*2 + 0.2 // 0.2 - 2.2
	score := int(float64(plays7d)*0.001 + float64(followers)*0.01 + growthRate*25)

	if score < 20 {
		return 20
	}
	if score > 120 {
		return 120
	}

	return score
}
