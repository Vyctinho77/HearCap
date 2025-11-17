package services

import (
	"context"
	"errors"
	"strings"

	"hearcap/server/internal/config"
	"hearcap/server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrInsufficientBalance = errors.New("saldo insuficiente")
	ErrSymbolNotSupported  = errors.New("ativo não encontrado")
)

type TradeResult struct {
	Trade    models.Trade       `json:"trade"`
	NewPrice float64            `json:"new_price"`
	Wallets  map[string]float64 `json:"wallets"`
	Snapshot *models.Price      `json:"snapshot"`
	Candle   *models.Candle     `json:"candle"`
}

type TradeService struct {
	db          *gorm.DB
	cfg         *config.Config
	wallets     *WalletService
	priceEngine *PriceEngine
}

func NewTradeService(db *gorm.DB, cfg *config.Config, walletSvc *WalletService, engine *PriceEngine) *TradeService {
	return &TradeService{
		db:          db,
		cfg:         cfg,
		wallets:     walletSvc,
		priceEngine: engine,
	}
}

func (s *TradeService) Buy(ctx context.Context, userID uuid.UUID, symbol string, quantity float64) (*TradeResult, error) {
	return s.executeTrade(ctx, userID, symbol, quantity, "buy")
}

func (s *TradeService) Sell(ctx context.Context, userID uuid.UUID, symbol string, quantity float64) (*TradeResult, error) {
	return s.executeTrade(ctx, userID, symbol, quantity, "sell")
}

func (s *TradeService) executeTrade(ctx context.Context, userID uuid.UUID, symbol string, quantity float64, side string) (*TradeResult, error) {
	if quantity <= 0 {
		return nil, errors.New("quantidade inválida")
	}

	symbol = strings.ToUpper(symbol)

	var result *TradeResult
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// valida usuário
		var user models.User
		if err := tx.First(&user, "id = ?", userID).Error; err != nil {
			return err
		}

		usdtWallet, err := s.wallets.GetForUpdate(tx, userID, "USDT")
		if err != nil {
			return err
		}
		tokenWallet, err := s.wallets.GetForUpdate(tx, userID, symbol)
		if err != nil {
			return err
		}

		currentPrice, err := s.priceEngine.GetLatestPrice(tx, symbol)
		if err != nil {
			return err
		}
		if currentPrice <= 0 {
			return ErrSymbolNotSupported
		}

		notional := currentPrice * quantity

		if side == "buy" {
			if usdtWallet.Balance < notional {
				return ErrInsufficientBalance
			}
			usdtWallet.Balance -= notional
			tokenWallet.Balance += quantity
		} else {
			if tokenWallet.Balance < quantity {
				return ErrInsufficientBalance
			}
			tokenWallet.Balance -= quantity
			usdtWallet.Balance += notional
		}

		if err := tx.Save(usdtWallet).Error; err != nil {
			return err
		}
		if err := tx.Save(tokenWallet).Error; err != nil {
			return err
		}

		newPrice, snapshot, candle, err := s.priceEngine.ApplyTradeImpact(tx, symbol, side, currentPrice, quantity, notional)
		if err != nil {
			return err
		}

		trade := models.Trade{
			UserID:   userID,
			Symbol:   symbol,
			Side:     side,
			Price:    currentPrice,
			Quantity: quantity,
			Notional: notional,
		}
		if err := tx.Create(&trade).Error; err != nil {
			return err
		}

		result = &TradeResult{
			Trade:    trade,
			NewPrice: newPrice,
			Wallets: map[string]float64{
				"USDT": usdtWallet.Balance,
				symbol: tokenWallet.Balance,
			},
			Snapshot: snapshot,
			Candle:   candle,
		}

		return nil
	})

	return result, err
}
