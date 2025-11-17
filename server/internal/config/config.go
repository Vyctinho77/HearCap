package config

import (
	"log"
	"os"
	"strconv"
	"sync"

	"github.com/joho/godotenv"
)

// Config concentra todas as variáveis necessárias para iniciar o backend.
type Config struct {
	AppPort              string
	DatabaseURL          string
	PriceCronSpec        string
	BasePriceMin         float64
	BasePriceMax         float64
	VolatilityMin        float64
	VolatilityMax        float64
	SupplyBase           int
	TradeImpactAlpha     float64
	TradeImpactLiquidity float64
	InitialUSDTBalance   float64
}

var (
	cfg  *Config
	once sync.Once
)

// Load retorna a configuração carregada do ambiente (.env ou variáveis do SO).
func Load() *Config {
	once.Do(func() {
		_ = godotenv.Overload()

		cfg = &Config{
			AppPort:              getEnv("APP_PORT", "8080"),
			DatabaseURL:          getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/hearcap?sslmode=disable"),
			PriceCronSpec:        getEnv("PRICE_CRON_SPEC", "@every 1h"),
			BasePriceMin:         getEnvAsFloat("BASE_PRICE_MIN", 1.0),
			BasePriceMax:         getEnvAsFloat("BASE_PRICE_MAX", 5.0),
			VolatilityMin:        getEnvAsFloat("VOLATILITY_MIN", -0.15),
			VolatilityMax:        getEnvAsFloat("VOLATILITY_MAX", 0.15),
			SupplyBase:           getEnvAsInt("SUPPLY_BASE", 100000),
			TradeImpactAlpha:     getEnvAsFloat("TRADE_IMPACT_ALPHA", 0.02),
			TradeImpactLiquidity: getEnvAsFloat("TRADE_IMPACT_LIQUIDITY", 10000),
			InitialUSDTBalance:   getEnvAsFloat("INITIAL_USDT_BALANCE", 1000),
		}
	})

	return cfg
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists && value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valStr := getEnv(key, "")
	if valStr == "" {
		return defaultValue
	}

	if val, err := strconv.Atoi(valStr); err == nil {
		return val
	}

	log.Printf("config: valor inválido para %s, usando default %d\n", key, defaultValue)
	return defaultValue
}

func getEnvAsFloat(key string, defaultValue float64) float64 {
	valStr := getEnv(key, "")
	if valStr == "" {
		return defaultValue
	}

	if val, err := strconv.ParseFloat(valStr, 64); err == nil {
		return val
	}

	log.Printf("config: valor inválido para %s, usando default %.2f\n", key, defaultValue)
	return defaultValue
}
