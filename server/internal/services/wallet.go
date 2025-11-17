package services

import (
	"context"
	"errors"
	"strings"

	"hearcap/server/internal/config"
	"hearcap/server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// WalletService gerencia saldos internos dos usuários.
type WalletService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewWalletService(db *gorm.DB, cfg *config.Config) *WalletService {
	return &WalletService{db: db, cfg: cfg}
}

// GetForUpdate bloqueia a carteira para atualização dentro de uma transação.
func (s *WalletService) GetForUpdate(tx *gorm.DB, userID uuid.UUID, symbol string) (*models.Wallet, error) {
	symbol = strings.ToUpper(symbol)

	var wallet models.Wallet
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("user_id = ? AND symbol = ?", userID, symbol).
		First(&wallet).Error

	if err == nil {
		return &wallet, nil
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		wallet = models.Wallet{
			UserID:  userID,
			Symbol:  symbol,
			Balance: s.initialBalance(symbol),
		}
		if createErr := tx.Create(&wallet).Error; createErr != nil {
			return nil, createErr
		}
		return &wallet, nil
	}

	return nil, err
}

// GetAll retorna todas as wallets de um usuário (fora de transação).
func (s *WalletService) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Wallet, error) {
	var wallets []models.Wallet
	if err := s.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("symbol ASC").
		Find(&wallets).Error; err != nil {
		return nil, err
	}
	return wallets, nil
}

func (s *WalletService) initialBalance(symbol string) float64 {
	if strings.EqualFold(symbol, "USDT") {
		return s.cfg.InitialUSDTBalance
	}
	return 0
}
