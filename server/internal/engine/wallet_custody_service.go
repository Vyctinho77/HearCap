package engine

type WalletCustodyService struct {
	wallet      *WalletEngine
	marketBase  map[string]string
	marketQuote map[string]string
}

func NewWalletCustodyService(wallet *WalletEngine, marketBase, marketQuote map[string]string) *WalletCustodyService {
	return &WalletCustodyService{
		wallet:      wallet,
		marketBase:  marketBase,
		marketQuote: marketQuote,
	}
}

func (wcs *WalletCustodyService) baseAsset(symbol string) string {
	if a, ok := wcs.marketBase[symbol]; ok {
		return a
	}
	return symbol
}

func (wcs *WalletCustodyService) quoteAsset(symbol string) string {
	if a, ok := wcs.marketQuote[symbol]; ok {
		return a
	}
	return symbol + "_QUOTE"
}

func (wcs *WalletCustodyService) ApplySettlement(userID, symbol string, baseDelta, quoteDelta float64) error {
	base := wcs.baseAsset(symbol)
	quote := wcs.quoteAsset(symbol)

	if baseDelta > 0 {
		if err := wcs.wallet.unlock(userID, base, baseDelta); err != nil {
			_ = wcs.wallet.creditAvailable(userID, base, baseDelta, LedgerEntryTrade, "SETTLEMENT_BASE")
		}
	} else if baseDelta < 0 {
		amount := -baseDelta
		if err := wcs.wallet.unlock(userID, base, amount); err != nil {
			_ = wcs.wallet.debitAvailable(userID, base, amount, LedgerEntryTrade, "SETTLEMENT_BASE")
		}
	}

	if quoteDelta > 0 {
		if err := wcs.wallet.unlock(userID, quote, quoteDelta); err != nil {
			_ = wcs.wallet.creditAvailable(userID, quote, quoteDelta, LedgerEntryTrade, "SETTLEMENT_QUOTE")
		}
	} else if quoteDelta < 0 {
		amount := -quoteDelta
		if err := wcs.wallet.unlock(userID, quote, amount); err != nil {
			_ = wcs.wallet.debitAvailable(userID, quote, amount, LedgerEntryTrade, "SETTLEMENT_QUOTE")
		}
	}

	return nil
}
