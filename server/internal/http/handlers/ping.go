package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

func PingHandler(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "ok",
		"ts":     time.Now().Unix(),
	})
}
