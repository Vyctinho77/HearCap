package engine

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type ListingEvaluationResult struct {
	ArtistID       string
	Eligible       bool
	Metrics        *ArtistMetrics
	FailedCriteria []string
	EvaluatedAt    time.Time
}

type IPOApplicationRequest struct {
	ArtistID         string
	Symbol           string
	Name             string
	Offering         OfferingType
	InitialPrice     float64
	TotalSupply      float64
	FreeFloatPercent float64
	MinRaiseUSD      float64
	MaxRaiseUSD      float64
	ProspectusURL    string
	ExtraDocsURL     []string
	Notes            string
}

type ListingEngineConfig struct {
	Criteria         ListingCriteria
	MinApprovalRatio float64
}

type ListingEngine struct {
	listings  ListingRepository
	metrics   ArtistMetricsService
	notify    GovernanceNotificationService
	committee CommitteeDirectory
	votes     CommitteeVoteRepository
	markets   MarketRegistry
	config    ListingEngineConfig
}

func NewListingEngine(
	listings ListingRepository,
	metrics ArtistMetricsService,
	notify GovernanceNotificationService,
	committee CommitteeDirectory,
	votes CommitteeVoteRepository,
	markets MarketRegistry,
	config ListingEngineConfig,
) *ListingEngine {
	return &ListingEngine{
		listings:  listings,
		metrics:   metrics,
		notify:    notify,
		committee: committee,
		votes:     votes,
		markets:   markets,
		config:    config,
	}
}

func (le *ListingEngine) EvaluateArtistForListing(artistID string) (*ListingEvaluationResult, error) {
	m, err := le.metrics.GetArtistMetrics(artistID)
	if err != nil {
		return nil, err
	}

	var failed []string
	c := le.config.Criteria

	if m.MonthlyStreams < c.MinMonthlyStreams {
		failed = append(failed, "MONTHLY_STREAMS")
	}
	if m.AnnualRevenueUSD < c.MinAnnualRevenueUSD {
		failed = append(failed, "ANNUAL_REVENUE")
	}
	if m.GovernanceScore < c.MinGovernanceScore {
		failed = append(failed, "GOVERNANCE_SCORE")
	}
	if m.Followers < c.MinFollowers {
		failed = append(failed, "FOLLOWERS")
	}

	return &ListingEvaluationResult{
		ArtistID:       artistID,
		Eligible:       len(failed) == 0,
		Metrics:        m,
		FailedCriteria: failed,
		EvaluatedAt:    time.Now(),
	}, nil
}

func (le *ListingEngine) SubmitIPO(req IPOApplicationRequest) (*ListingApplication, error) {
	eval, err := le.EvaluateArtistForListing(req.ArtistID)
	if err != nil {
		return nil, err
	}
	if !eval.Eligible {
		return nil, errors.New("artist does not meet listing criteria")
	}

	now := time.Now()
	app := &ListingApplication{
		ID:               uuid.NewString(),
		ArtistID:         req.ArtistID,
		Symbol:           req.Symbol,
		Name:             req.Name,
		Offering:         req.Offering,
		Status:           ListingStatusSubmitted,
		InitialPrice:     req.InitialPrice,
		TotalSupply:      req.TotalSupply,
		FreeFloatPercent: req.FreeFloatPercent,
		MinRaiseUSD:      req.MinRaiseUSD,
		MaxRaiseUSD:      req.MaxRaiseUSD,
		ProspectusURL:    req.ProspectusURL,
		ExtraDocsURL:     req.ExtraDocsURL,
		Notes:            req.Notes,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := le.listings.SaveListing(app); err != nil {
		return nil, err
	}
	_ = le.notify.NotifyListingSubmitted(app)
	return app, nil
}

func (le *ListingEngine) StartAudit(listingID, reviewerID string) (*ListingApplication, error) {
	app, err := le.listings.FindListingByID(listingID)
	if err != nil {
		return nil, err
	}
	if app.Status != ListingStatusSubmitted {
		return nil, errors.New("listing not in SUBMITTED state")
	}
	app.Status = ListingStatusUnderReview
	app.ReviewerID = &reviewerID
	app.UpdatedAt = time.Now()
	if err := le.listings.UpdateListing(app); err != nil {
		return nil, err
	}
	_ = le.notify.NotifyListingStatusChanged(app)
	return app, nil
}

type CommitteeVoteInput struct {
	ListingID string
	MemberID  string
	Decision  string
	Comment   string
}

func (le *ListingEngine) CastCommitteeVote(input CommitteeVoteInput) error {
	if !le.committee.IsCommitteeMember(input.MemberID) {
		return errors.New("user is not committee member")
	}

	decision := CommitteeDecision{
		MemberID:  input.MemberID,
		Decision:  input.Decision,
		Comment:   input.Comment,
		CreatedAt: time.Now(),
	}

	if err := le.votes.SaveDecision(input.ListingID, decision); err != nil {
		return err
	}

	return le.evaluateCommitteeOutcome(input.ListingID)
}

func (le *ListingEngine) evaluateCommitteeOutcome(listingID string) error {
	app, err := le.listings.FindListingByID(listingID)
	if err != nil {
		return err
	}
	if app.Status != ListingStatusUnderReview {
		return nil
	}

	members, err := le.committee.GetCommitteeMembers()
	if err != nil {
		return err
	}
	decisions, err := le.votes.ListDecisions(listingID)
	if err != nil {
		return err
	}

	totalMembers := len(members)
	if totalMembers == 0 {
		return nil
	}

	var approvals, rejections int
	for _, d := range decisions {
		switch d.Decision {
		case "APPROVE":
			approvals++
		case "REJECT":
			rejections++
		}
	}

	approvalRatio := float64(approvals) / float64(totalMembers)
	rejectionRatio := float64(rejections) / float64(totalMembers)

	if approvalRatio >= le.config.MinApprovalRatio {
		app.Status = ListingStatusApproved
		app.CommitteeLog = decisions
		app.UpdatedAt = time.Now()
		if err := le.listings.UpdateListing(app); err != nil {
			return err
		}
		_ = le.notify.NotifyListingStatusChanged(app)
		return nil
	}

	if rejectionRatio >= le.config.MinApprovalRatio {
		app.Status = ListingStatusRejected
		app.CommitteeLog = decisions
		app.UpdatedAt = time.Now()
		if err := le.listings.UpdateListing(app); err != nil {
			return err
		}
		_ = le.notify.NotifyListingStatusChanged(app)
	}

	return nil
}

func (le *ListingEngine) ActivateListing(listingID string) (*ListingApplication, error) {
	app, err := le.listings.FindListingByID(listingID)
	if err != nil {
		return nil, err
	}
	if app.Status != ListingStatusApproved {
		return nil, errors.New("listing not approved")
	}

	if err := le.markets.CreateMarket(app.Symbol); err != nil {
		return nil, err
	}

	app.Status = ListingStatusActive
	app.UpdatedAt = time.Now()
	if err := le.listings.UpdateListing(app); err != nil {
		return nil, err
	}
	_ = le.notify.NotifyListingStatusChanged(app)
	return app, nil
}
