package engine

import "time"

type ListingStatus string

const (
	ListingStatusDraft       ListingStatus = "DRAFT"
	ListingStatusSubmitted   ListingStatus = "SUBMITTED"
	ListingStatusUnderReview ListingStatus = "UNDER_REVIEW"
	ListingStatusApproved    ListingStatus = "APPROVED"
	ListingStatusRejected    ListingStatus = "REJECTED"
	ListingStatusActive      ListingStatus = "ACTIVE"
	ListingStatusSuspended   ListingStatus = "SUSPENDED"
	ListingStatusDelisted    ListingStatus = "DELISTED"
)

type OfferingType string

const (
	OfferingTypeIPO       OfferingType = "IPO"
	OfferingTypeFollowOn  OfferingType = "FOLLOW_ON"
	OfferingTypeRights    OfferingType = "RIGHTS_OFFERING"
	OfferingTypeSecondary OfferingType = "SECONDARY"
)

type ArtistMetrics struct {
	ArtistID             string
	MonthlyStreams       int64
	TotalStreams         int64
	AnnualRevenueUSD     float64
	GovernanceScore      float64
	Followers            int64
	Last12MonthsReleases int
	UpdatedAt            time.Time
}

type ListingCriteria struct {
	MinMonthlyStreams   int64
	MinAnnualRevenueUSD float64
	MinGovernanceScore  float64
	MinFollowers        int64
}

type ListingApplication struct {
	ID       string
	ArtistID string
	Symbol   string
	Name     string
	Offering OfferingType
	Status   ListingStatus

	InitialPrice     float64
	TotalSupply      float64
	FreeFloatPercent float64
	MinRaiseUSD      float64
	MaxRaiseUSD      float64

	ProspectusURL string
	ExtraDocsURL  []string
	Notes         string

	ReviewerID   *string
	CommitteeLog []CommitteeDecision
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type CommitteeDecision struct {
	MemberID  string
	Decision  string
	Comment   string
	CreatedAt time.Time
}
