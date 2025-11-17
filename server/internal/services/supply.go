package services

// CalculateSupply aplica a fórmula baseSupply + (popularityScore * 100).
func CalculateSupply(baseSupply int, popularityScore int) int64 {
	return int64(baseSupply + (popularityScore * 100))
}
