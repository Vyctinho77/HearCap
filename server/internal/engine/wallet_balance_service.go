package engine

type WalletBalanceService struct {
	wallet      *WalletEngine
	marketBase  map[string]string
	marketQuote map[string]string
}

func NewWalletBalanceService(wallet *WalletEngine, marketBase, marketQuote map[string]string) *WalletBalanceService {
	return &WalletBalanceService{
		wallet:      wallet,
		marketBase:  marketBase,
		marketQuote: marketQuote,
	}
}

func (w *WalletBalanceService) baseAsset(symbol string) string {
	if a, ok := w.marketBase[symbol]; ok {
		return a
	}
	return symbol
}

func (w *WalletBalanceService) quoteAsset(symbol string) string {
	if a, ok := w.marketQuote[symbol]; ok {
		return a
	}
	return symbol + "_QUOTE"
}

func (w *WalletBalanceService) CanLockBase(userID, symbol string, qty float64) bool {
	asset := w.baseAsset(symbol)
	_, bal, err := w.wallet.getOrCreateBalance(userID, asset)
	if err != nil {
		return false
	}
	return bal.Available >= qty
}

func (w *WalletBalanceService) CanLockQuote(userID, symbol string, notional float64) bool {
	asset := w.quoteAsset(symbol)
	_, bal, err := w.wallet.getOrCreateBalance(userID, asset)
	if err != nil {
		return false
	}
	return bal.Available >= notional
}

func (w *WalletBalanceService) LockBase(userID, symbol string, qty float64) error {
	asset := w.baseAsset(symbol)
	return w.wallet.lock(userID, asset, qty)
}

func (w *WalletBalanceService) LockQuote(userID, symbol string, notional float64) error {
	asset := w.quoteAsset(symbol)
	return w.wallet.lock(userID, asset, notional)
}

func (w *WalletBalanceService) ReleaseBase(userID, symbol string, qty float64) error {
	asset := w.baseAsset(symbol)
	return w.wallet.unlock(userID, asset, qty)
}

func (w *WalletBalanceService) ReleaseQuote(userID, symbol string, notional float64) error {
	asset := w.quoteAsset(symbol)
	return w.wallet.unlock(userID, asset, notional)
}
