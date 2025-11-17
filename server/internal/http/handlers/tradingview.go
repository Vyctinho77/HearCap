package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"hearcap/server/internal/services"
)

// TradingViewHandler expõe endpoints UDF suportados pelo widget.
type TradingViewHandler struct {
	service *services.TradingViewService
}

func NewTradingViewHandler(service *services.TradingViewService) *TradingViewHandler {
	return &TradingViewHandler{service: service}
}

func (h *TradingViewHandler) GetConfig(c *fiber.Ctx) error {
	return c.JSON(h.service.Config())
}

func (h *TradingViewHandler) GetTime(c *fiber.Ctx) error {
	return c.JSON(h.service.ServerTime())
}

func (h *TradingViewHandler) GetSymbol(c *fiber.Ctx) error {
	symbol := c.Query("symbol")
	resp, err := h.service.GetSymbol(symbol)
	if err != nil {
		return handleTradingViewError(c, err)
	}
	return c.JSON(resp)
}

func (h *TradingViewHandler) SearchSymbols(c *fiber.Ctx) error {
	query := c.Query("query")
	results, err := h.service.SearchSymbols(query, 20)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "db error",
		})
	}
	return c.JSON(results)
}

func (h *TradingViewHandler) GetHistory(c *fiber.Ctx) error {
	symbol := c.Query("symbol")
	fromStr := c.Query("from")
	toStr := c.Query("to")

	if symbol == "" || fromStr == "" || toStr == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "missing params",
		})
	}

	fromUnix, err := strconv.ParseInt(fromStr, 10, 64)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid from param",
		})
	}

	toUnix, err := strconv.ParseInt(toStr, 10, 64)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid to param",
		})
	}

	resp, err := h.service.GetHistory(symbol, fromUnix, toUnix)
	if err != nil {
		return handleTradingViewError(c, err)
	}

	return c.JSON(resp)
}

func handleTradingViewError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, services.ErrSymbolRequired):
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "symbol is required",
		})
	case errors.Is(err, services.ErrSymbolNotFound):
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"error": "symbol not found",
		})
	default:
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "internal error",
		})
	}
}
