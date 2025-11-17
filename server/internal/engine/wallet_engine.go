package engine

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type WalletEngine struct {
	assets    AssetRepository
	wallets   WalletRepository
	ledger    LedgerRepository
	deposits  DepositRepository
	withdraws WithdrawalRepository
}

func NewWalletEngine(assets AssetRepository, wallets WalletRepository, ledger LedgerRepository, deposits DepositRepository, withdraws WithdrawalRepository) *WalletEngine {
	return &WalletEngine{
		assets:    assets,
		wallets:   wallets,
		ledger:    ledger,
		deposits:  deposits,
		withdraws: withdraws,
	}
}

func (we *WalletEngine) getOrCreateBalance(userID, asset string) (*WalletAccount, *Balance, error) {
	acc, err := we.wallets.GetOrCreateAccount(userID, asset)
	if err != nil {
		return nil, nil, err
	}
	bal, err := we.wallets.GetBalance(acc.ID)
	if err != nil || bal == nil {
		bal = &Balance{
			AccountID: acc.ID,
			Available: 0,
			Locked:    0,
			UpdatedAt: time.Now(),
		}
		if err := we.wallets.SaveBalance(bal); err != nil {
			return nil, nil, err
		}
	}
	return acc, bal, nil
}

func (we *WalletEngine) creditAvailable(userID, asset string, amount float64, typ LedgerEntryType, ref string) error {
	if amount <= 0 {
		return errors.New("amount must be > 0")
	}
	acc, bal, err := we.getOrCreateBalance(userID, asset)
	if err != nil {
		return err
	}
	bal.Available += amount
	bal.UpdatedAt = time.Now()
	if err := we.wallets.UpdateBalance(bal); err != nil {
		return err
	}
	entry := &LedgerEntry{
		ID:        uuid.NewString(),
		AccountID: acc.ID,
		Asset:     asset,
		Type:      typ,
		Amount:    amount,
		Reference: ref,
		CreatedAt: time.Now(),
	}
	return we.ledger.SaveEntry(entry)
}

func (we *WalletEngine) debitAvailable(userID, asset string, amount float64, typ LedgerEntryType, ref string) error {
	if amount <= 0 {
		return errors.New("amount must be > 0")
	}
	acc, bal, err := we.getOrCreateBalance(userID, asset)
	if err != nil {
		return err
	}
	if bal.Available < amount {
		return errors.New("insufficient available balance")
	}
	bal.Available -= amount
	bal.UpdatedAt = time.Now()
	if err := we.wallets.UpdateBalance(bal); err != nil {
		return err
	}
	entry := &LedgerEntry{
		ID:        uuid.NewString(),
		AccountID: acc.ID,
		Asset:     asset,
		Type:      typ,
		Amount:    -amount,
		Reference: ref,
		CreatedAt: time.Now(),
	}
	return we.ledger.SaveEntry(entry)
}

func (we *WalletEngine) lock(userID, asset string, amount float64) error {
	if amount <= 0 {
		return errors.New("amount must be > 0")
	}
	_, bal, err := we.getOrCreateBalance(userID, asset)
	if err != nil {
		return err
	}
	if bal.Available < amount {
		return errors.New("insufficient available to lock")
	}
	bal.Available -= amount
	bal.Locked += amount
	bal.UpdatedAt = time.Now()
	return we.wallets.UpdateBalance(bal)
}

func (we *WalletEngine) unlock(userID, asset string, amount float64) error {
	if amount <= 0 {
		return errors.New("amount must be > 0")
	}
	_, bal, err := we.getOrCreateBalance(userID, asset)
	if err != nil {
		return err
	}
	if bal.Locked < amount {
		return errors.New("insufficient locked balance")
	}
	bal.Locked -= amount
	bal.Available += amount
	bal.UpdatedAt = time.Now()
	return we.wallets.UpdateBalance(bal)
}

func (we *WalletEngine) CreateDeposit(userID, asset string, amount float64) (*DepositRequest, error) {
	if amount <= 0 {
		return nil, errors.New("amount must be > 0")
	}
	now := time.Now()
	dep := &DepositRequest{
		ID:        uuid.NewString(),
		UserID:    userID,
		Asset:     asset,
		Amount:    amount,
		Status:    DepositStatusPending,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := we.deposits.SaveDeposit(dep); err != nil {
		return nil, err
	}
	return dep, nil
}

func (we *WalletEngine) ConfirmDeposit(depositID string, txHash *string) error {
	dep, err := we.deposits.FindDepositByID(depositID)
	if err != nil {
		return err
	}
	if dep.Status != DepositStatusPending {
		return errors.New("deposit not pending")
	}
	if err := we.creditAvailable(dep.UserID, dep.Asset, dep.Amount, LedgerEntryDeposit, dep.ID); err != nil {
		return err
	}
	dep.Status = DepositStatusConfirmed
	dep.TxHash = txHash
	dep.UpdatedAt = time.Now()
	return we.deposits.UpdateDeposit(dep)
}

func (we *WalletEngine) RequestWithdrawal(userID, asset string, amount float64, address string) (*WithdrawalRequest, error) {
	if amount <= 0 {
		return nil, errors.New("amount must be > 0")
	}
	if err := we.lock(userID, asset, amount); err != nil {
		return nil, err
	}
	now := time.Now()
	w := &WithdrawalRequest{
		ID:        uuid.NewString(),
		UserID:    userID,
		Asset:     asset,
		Amount:    amount,
		Address:   address,
		Status:    WithdrawalStatusRequested,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := we.withdraws.SaveWithdrawal(w); err != nil {
		return nil, err
	}
	return w, nil
}

func (we *WalletEngine) CompleteWithdrawal(withdrawalID string, txHash *string) error {
	w, err := we.withdraws.FindWithdrawalByID(withdrawalID)
	if err != nil {
		return err
	}
	if w.Status != WithdrawalStatusRequested && w.Status != WithdrawalStatusProcessing {
		return errors.New("withdrawal not in correct status")
	}

	_, bal, err := we.getOrCreateBalance(w.UserID, w.Asset)
	if err != nil {
		return err
	}
	if bal.Locked < w.Amount {
		return errors.New("locked balance insufficient")
	}
	bal.Locked -= w.Amount
	bal.UpdatedAt = time.Now()
	if err := we.wallets.UpdateBalance(bal); err != nil {
		return err
	}

	entry := &LedgerEntry{
		ID:        uuid.NewString(),
		AccountID: bal.AccountID,
		Asset:     w.Asset,
		Type:      LedgerEntryWithdrawal,
		Amount:    -w.Amount,
		Reference: w.ID,
		CreatedAt: time.Now(),
	}
	if err := we.ledger.SaveEntry(entry); err != nil {
		return err
	}

	w.Status = WithdrawalStatusCompleted
	w.TxHash = txHash
	w.UpdatedAt = time.Now()
	return we.withdraws.UpdateWithdrawal(w)
}
