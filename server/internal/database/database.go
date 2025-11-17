package database

import (
	"log"
	"os"
	"time"

	"hearcap/server/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// New abre uma conexão com Postgres usando GORM.
func New(dsn string) (*gorm.DB, error) {
	// Configura logger customizado que ignora "record not found"
	customLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             200 * time.Millisecond,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true, // Ignora erros de "record not found"
			Colorful:                  true,
		},
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: customLogger,
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(25)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	return db, nil
}

// AutoMigrate garante a criação das tabelas essenciais.
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.Artist{},
		&models.Token{},
		&models.Price{},
		&models.Candle{},
		&models.Playlist{},
		&models.User{},
		&models.Wallet{},
		&models.Trade{},
		// Market Data models
		&models.MarketDataCandle{},
		&models.MarketDataTradeEvent{},
		&models.MarketDataTicker24h{},
	)
}
