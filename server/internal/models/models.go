package models

import (
	"time"

	"github.com/google/uuid"
)

// Artist representa um artista/tokenizado dentro do ecossistema HearCap Invest.
type Artist struct {
	ID              uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Name            string    `gorm:"size:255;not null"`
	Symbol          string    `gorm:"size:16;uniqueIndex;not null"`
	AvatarURL       string
	Description     string
	PopularityScore int
	CreatedAt       time.Time `gorm:"autoCreateTime"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime"`
	Tokens          []Token   `gorm:"foreignKey:ArtistID"`
}

// Token guarda as configurações financeiras do artista.
type Token struct {
	ID                 uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ArtistID           uuid.UUID `gorm:"type:uuid;not null;index"`
	Artist             Artist    `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	BasePrice          float64   `gorm:"type:numeric(12,4)"`
	Supply             int64     `gorm:"type:numeric"`
	CirculatingSupply  int64     `gorm:"type:numeric"`
	LastPopularitySeed int
	UpdatedAt          time.Time `gorm:"autoUpdateTime"`
	CreatedAt          time.Time `gorm:"autoCreateTime"`
}

// Price representa o snapshot de preço e variação atual exibido no app.
type Price struct {
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Symbol     string    `gorm:"size:16;index;not null"`
	Price      float64   `gorm:"type:numeric(12,4)"`
	Change24h  float64   `gorm:"type:numeric(8,4)"`
	Volatility float64   `gorm:"type:numeric(8,4)"`
	CreatedAt  time.Time `gorm:"autoCreateTime"`
}

// Candle guarda o histórico OHLCV utilizado pelos gráficos.
type Candle struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Symbol    string    `gorm:"size:16;index;not null"`
	Timestamp int64     `gorm:"index"`
	Open      float64   `gorm:"type:numeric(12,4)"`
	High      float64   `gorm:"type:numeric(12,4)"`
	Low       float64   `gorm:"type:numeric(12,4)"`
	Close     float64   `gorm:"type:numeric(12,4)"`
	Volume    float64   `gorm:"type:numeric(12,4)"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

// Playlist permite agrupar artistas/tokens seguindo a UI existente.
type Playlist struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;index"`
	Name      string    `gorm:"size:255;not null"`
	Type      string    `gorm:"size:32;default:'artist'"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

// User representa um investidor dentro do ecossistema custodial.
type User struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Email     string    `gorm:"size:255;uniqueIndex"`
	Name      string    `gorm:"size:255"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

// Wallet guarda saldos internos por usuário/símbolo (USDT ou tokens).
type Wallet struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;index:user_symbol,unique;not null"`
	Symbol    string    `gorm:"size:16;not null;index:user_symbol,unique"`
	Balance   float64   `gorm:"type:numeric(18,6);not null;default:0"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}

// Trade registra compras e vendas realizadas na exchange custodial.
type Trade struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;index;not null"`
	Symbol    string    `gorm:"size:16;index;not null"`
	Side      string    `gorm:"size:8;not null"` // buy ou sell
	Price     float64   `gorm:"type:numeric(12,4);not null"`
	Quantity  float64   `gorm:"type:numeric(18,6);not null"`
	Notional  float64   `gorm:"type:numeric(18,6);not null"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}
