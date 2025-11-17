package engine

import (
	"time"

	"github.com/google/uuid"
)

type CorporateActionType string

const (
	CorporateActionDividendCash   CorporateActionType = "DIVIDEND_CASH"
	CorporateActionDividendToken  CorporateActionType = "DIVIDEND_TOKEN"
	CorporateActionStockSplit     CorporateActionType = "STOCK_SPLIT"
	CorporateActionReverseSplit   CorporateActionType = "REVERSE_STOCK_SPLIT"
	CorporateActionRightsOffering CorporateActionType = "RIGHTS_OFFERING"
)

type CorporateActionStatus string

const (
	CAStatusPlanned    CorporateActionStatus = "PLANNED"
	CAStatusAnnounced  CorporateActionStatus = "ANNOUNCED"
	CAStatusRecordDate CorporateActionStatus = "ON_RECORD_DATE"
	CAStatusProcessing CorporateActionStatus = "PROCESSING"
	CAStatusCompleted  CorporateActionStatus = "COMPLETED"
	CAStatusCanceled   CorporateActionStatus = "CANCELED"
)

type CorporateAction struct {
	ID          string
	Symbol      string
	Type        CorporateActionType
	Status      CorporateActionStatus
	Description string

	AnnouncementDate time.Time
	RecordDate       time.Time
	ExDate           time.Time
	PaymentDate      time.Time

	DividendPerShare float64
	DividendAsset    string

	SplitNumerator   int
	SplitDenominator int

	RightsRatioNumerator   int
	RightsRatioDenominator int
	SubscriptionPrice      float64
	SubscriptionAsset      string
	SubscriptionEnd        time.Time

	CreatedAt time.Time
	UpdatedAt time.Time
}

type CorporateActionEngine struct {
	repo    CorporateActionRepository
	holders HolderPositionService
	notify  GovernanceNotificationService
}

func NewCorporateActionEngine(repo CorporateActionRepository, holders HolderPositionService, notify GovernanceNotificationService) *CorporateActionEngine {
	return &CorporateActionEngine{
		repo:    repo,
		holders: holders,
		notify:  notify,
	}
}

type ScheduleDividendRequest struct {
	Symbol           string
	DividendPerShare float64
	DividendAsset    string
	RecordDate       time.Time
	PaymentDate      time.Time
	Description      string
}

func (cae *CorporateActionEngine) ScheduleCashDividend(req ScheduleDividendRequest) (*CorporateAction, error) {
	now := time.Now()
	ca := &CorporateAction{
		ID:               uuid.NewString(),
		Symbol:           req.Symbol,
		Type:             CorporateActionDividendCash,
		Status:           CAStatusPlanned,
		Description:      req.Description,
		DividendPerShare: req.DividendPerShare,
		DividendAsset:    req.DividendAsset,
		RecordDate:       req.RecordDate,
		PaymentDate:      req.PaymentDate,
		AnnouncementDate: now,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if err := cae.repo.SaveCorporateAction(ca); err != nil {
		return nil, err
	}
	_ = cae.notify.NotifyListingStatusChanged(nil)
	return ca, nil
}

func (cae *CorporateActionEngine) ProcessRecordDate(now time.Time) error {
	actions, err := cae.repo.ListPlannedActions(now)
	if err != nil {
		return err
	}
	for _, ca := range actions {
		if !sameDay(ca.RecordDate, now) || ca.Status != CAStatusPlanned {
			continue
		}
		ca.Status = CAStatusRecordDate
		ca.UpdatedAt = time.Now()
		_ = cae.repo.UpdateCorporateAction(ca)
	}
	return nil
}

func (cae *CorporateActionEngine) ProcessPaymentDate(now time.Time) error {
	actions, err := cae.repo.ListPlannedActions(now)
	if err != nil {
		return err
	}
	for _, ca := range actions {
		if !sameDay(ca.PaymentDate, now) || ca.Status == CAStatusCompleted {
			continue
		}
		if err := cae.processActionPayment(ca); err != nil {
			return err
		}
	}
	return nil
}

func (cae *CorporateActionEngine) processActionPayment(ca *CorporateAction) error {
	holders, err := cae.holders.GetHoldersOnRecordDate(ca.Symbol, ca.RecordDate)
	if err != nil {
		return err
	}

	switch ca.Type {
	case CorporateActionDividendCash, CorporateActionDividendToken:
		for _, h := range holders {
			amount := h.Quantity * ca.DividendPerShare
			if amount <= 0 {
				continue
			}
			if err := cae.holders.ApplyCashDividend(h.UserID, ca.DividendAsset, amount); err != nil {
				return err
			}
		}
	case CorporateActionStockSplit, CorporateActionReverseSplit:
		for _, h := range holders {
			if ca.SplitDenominator == 0 {
				continue
			}
			ratio := float64(ca.SplitNumerator) / float64(ca.SplitDenominator)
			newQty := h.Quantity * ratio
			if err := cae.holders.ApplyStockDividendOrSplit(h.UserID, ca.Symbol, h.Quantity, newQty); err != nil {
				return err
			}
		}
	case CorporateActionRightsOffering:
		for _, h := range holders {
			if ca.RightsRatioDenominator == 0 {
				continue
			}
			ratio := float64(ca.RightsRatioNumerator) / float64(ca.RightsRatioDenominator)
			rightsQty := h.Quantity * ratio
			if rightsQty <= 0 {
				continue
			}
			if err := cae.holders.GrantRights(h.UserID, ca.Symbol, rightsQty, ca.SubscriptionPrice, ca.SubscriptionAsset); err != nil {
				return err
			}
		}
	}

	ca.Status = CAStatusCompleted
	ca.UpdatedAt = time.Now()
	return cae.repo.UpdateCorporateAction(ca)
}

func sameDay(a, b time.Time) bool {
	y1, m1, d1 := a.Date()
	y2, m2, d2 := b.Date()
	return y1 == y2 && m1 == m2 && d1 == d2
}
