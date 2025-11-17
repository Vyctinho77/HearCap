package handlers

import (
	"errors"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"hearcap/server/internal/services"
)

type TradeHandler struct {
	service *services.TradeService
	wallets *services.WalletService
}

func NewTradeHandler(service *services.TradeService, wallets *services.WalletService) *TradeHandler {
	return &TradeHandler{
		service: service,
		wallets: wallets,
	}
}

type tradeRequest struct {
	UserID   string  `json:"user_id"`
	Symbol   string  `json:"symbol"`
	Quantity float64 `json:"quantity"`
}

func (h *TradeHandler) Buy(c *fiber.Ctx) error {
	var req tradeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "corpo inválido"})
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "user_id inválido"})
	}

	result, err := h.service.Buy(c.Context(), userID, req.Symbol, req.Quantity)
	if err != nil {
		return translateTradeError(c, err)
	}

	return c.JSON(result)
}

func (h *TradeHandler) Sell(c *fiber.Ctx) error {
	var req tradeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "corpo inválido"})
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "user_id inválido"})
	}

	result, err := h.service.Sell(c.Context(), userID, req.Symbol, req.Quantity)
	if err != nil {
		return translateTradeError(c, err)
	}

	return c.JSON(result)
}

func (h *TradeHandler) GetWallets(c *fiber.Ctx) error {
	userParam := c.Params("userID")
	userID, err := uuid.Parse(userParam)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "user_id inválido"})
	}

	wallets, err := h.wallets.GetAll(c.Context(), userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao carregar wallets"})
	}

	return c.JSON(fiber.Map{
		"user_id": userID,
		"wallets": wallets,
	})
}

func translateTradeError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, services.ErrInsufficientBalance):
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "saldo insuficiente"})
	case errors.Is(err, services.ErrSymbolNotSupported):
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "ativo inválido"})
	default:
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "não foi possível executar o trade"})
	}
}
