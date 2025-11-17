package services

import (
	"errors"
	"time"

	"hearcap/server/internal/models"

	"gorm.io/gorm"
)

var (
	ErrSymbolRequired = errors.New("symbol is required")
	ErrSymbolNotFound = errors.New("symbol not found")
)

// TradingViewService adapta as tabelas internas para o formato UDF.
type TradingViewService struct {
	db *gorm.DB
}

func NewTradingViewService(db *gorm.DB) *TradingViewService {
	return &TradingViewService{db: db}
}

func (s *TradingViewService) Config() map[string]interface{} {
	return map[string]interface{}{
		"supports_search":          true,
		"supports_group_request":   false,
		"supports_marks":           false,
		"supports_timescale_marks": false,
		"supports_time":            true,
		"supported_resolutions": []string{
			"1", "5", "15", "60", "240", "1D", "1W",
		},
	}
}

func (s *TradingViewService) ServerTime() int64 {
	return time.Now().Unix()
}

// TradingViewSymbol representa o payload esperado por /symbols.
type TradingViewSymbol struct {
	Name                 string   `json:"name"`
	Ticker               string   `json:"ticker"`
	Description          string   `json:"description"`
	Type                 string   `json:"type"`
	Session              string   `json:"session"`
	Timezone             string   `json:"timezone"`
	Exchange             string   `json:"exchange"`
	MinMov               int      `json:"minmov"`
	PriceScale           int      `json:"pricescale"`
	HasIntraday          bool     `json:"has_intraday"`
	HasDaily             bool     `json:"has_daily"`
	HasWeeklyAndMonthly  bool     `json:"has_weekly_and_monthly"`
	SupportedResolutions []string `json:"supported_resolutions"`
	VolumePrecision      int      `json:"volume_precision"`
	DataStatus           string   `json:"data_status"`
}

func (s *TradingViewService) GetSymbol(symbol string) (*TradingViewSymbol, error) {
	if symbol == "" {
		return nil, ErrSymbolRequired
	}

	var artist models.Artist
	if err := s.db.Where("symbol = ?", symbol).First(&artist).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSymbolNotFound
		}
		return nil, err
	}

	description := artist.Description
	if description == "" {
		description = artist.Name + " Artist Token"
	}

	return &TradingViewSymbol{
		Name:                 artist.Symbol,
		Ticker:               artist.Symbol,
		Description:          description,
		Type:                 "crypto",
		Session:              "24x7",
		Timezone:             "UTC",
		Exchange:             "HearCap",
		MinMov:               1,
		PriceScale:           100,
		HasIntraday:          true,
		HasDaily:             true,
		HasWeeklyAndMonthly:  true,
		SupportedResolutions: []string{"1", "5", "60", "1D", "1W"},
		VolumePrecision:      0,
		DataStatus:           "streaming",
	}, nil
}

// TradingViewSearchItem representa o retorno do endpoint /search.
type TradingViewSearchItem struct {
	Symbol      string `json:"symbol"`
	FullName    string `json:"full_name"`
	Description string `json:"description"`
	Ticker      string `json:"ticker"`
	Type        string `json:"type"`
	Exchange    string `json:"exchange"`
}

func (s *TradingViewService) SearchSymbols(query string, limit int) ([]TradingViewSearchItem, error) {
	if query == "" {
		return []TradingViewSearchItem{}, nil
	}

	if limit <= 0 || limit > 50 {
		limit = 20
	}

	like := "%" + query + "%"
	var artists []models.Artist
	if err := s.db.
		Where("symbol ILIKE ? OR name ILIKE ?", like, like).
		Limit(limit).
		Order("symbol ASC").
		Find(&artists).Error; err != nil {
		return nil, err
	}

	results := make([]TradingViewSearchItem, 0, len(artists))
	for _, artist := range artists {
		desc := artist.Description
		if desc == "" {
			desc = artist.Name
		}
		results = append(results, TradingViewSearchItem{
			Symbol:      artist.Symbol,
			FullName:    "HearCap:" + artist.Symbol,
			Description: desc,
			Ticker:      artist.Symbol,
			Type:        "crypto",
			Exchange:    "HearCap",
		})
	}

	return results, nil
}

// TradingViewHistory representa o payload enviado para o widget de gráfico.
type TradingViewHistory struct {
	Status   string    `json:"s"`
	Time     []int64   `json:"t,omitempty"`
	Open     []float64 `json:"o,omitempty"`
	High     []float64 `json:"h,omitempty"`
	Low      []float64 `json:"l,omitempty"`
	Close    []float64 `json:"c,omitempty"`
	Volume   []float64 `json:"v,omitempty"`
	NextTime int64     `json:"nextTime,omitempty"`
}

func (s *TradingViewService) GetHistory(symbol string, from, to int64) (TradingViewHistory, error) {
	if symbol == "" {
		return TradingViewHistory{}, ErrSymbolRequired
	}

	var candles []models.Candle
	if err := s.db.
		Where("symbol = ? AND timestamp >= ? AND timestamp <= ?", symbol, from, to).
		Order("timestamp ASC").
		Find(&candles).Error; err != nil {
		return TradingViewHistory{}, err
	}

	if len(candles) == 0 {
		return TradingViewHistory{
			Status:   "no_data",
			NextTime: to,
		}, nil
	}

	t := make([]int64, 0, len(candles))
	o := make([]float64, 0, len(candles))
	h := make([]float64, 0, len(candles))
	l := make([]float64, 0, len(candles))
	cArr := make([]float64, 0, len(candles))
	v := make([]float64, 0, len(candles))

	for _, cd := range candles {
		t = append(t, cd.Timestamp)
		o = append(o, cd.Open)
		h = append(h, cd.High)
		l = append(l, cd.Low)
		cArr = append(cArr, cd.Close)
		v = append(v, cd.Volume)
	}

	return TradingViewHistory{
		Status: "ok",
		Time:   t,
		Open:   o,
		High:   h,
		Low:    l,
		Close:  cArr,
		Volume: v,
	}, nil
}
