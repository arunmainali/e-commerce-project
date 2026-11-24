package dto

import (
	"time"

	"github.com/auction-studio/backend/internal/models"
)

// ── Auth DTOs ─────────────────────────────────────

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Phone    string `json:"phone,omitempty"`
	Location string `json:"location,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type AuthResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
}

type UserResponse struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Email     string          `json:"email"`
	Role      models.UserRole `json:"role"`
	Phone     string          `json:"phone,omitempty"`
	Location  string          `json:"location,omitempty"`
	Rating    float64         `json:"rating"`
	CreatedAt time.Time       `json:"createdAt"`
}

// ── Items DTOs ────────────────────────────────────

type CreateItemRequest struct {
	Title            string              `json:"title"`
	LotNumber        string              `json:"lotNumber"`
	CategorySlug     string              `json:"category"`
	Subcategory      string              `json:"subcategory"`
	Description      string              `json:"description"`
	Specs            models.ItemSpecs    `json:"specs"`
	Images           []string            `json:"images"`
	PurchaseMode     models.PurchaseMode `json:"purchaseMode"`
	Price            *int64              `json:"price,omitempty"`
	Stock            *int                `json:"stock,omitempty"`
	StartingBid      *int64              `json:"startingBid,omitempty"`
	MinimumIncrement *int64              `json:"minimumIncrement,omitempty"`
	EndTime          *time.Time          `json:"endTime,omitempty"`
	ShippingCost     int64               `json:"shippingCost"`
	EstimatedDays    string              `json:"estimatedDays"`
	ShippingMethods  []string            `json:"shippingMethods"`
}

type ItemFilterParams struct {
	Category     string
	Subcategory  string
	PurchaseMode string
	Condition    string
	Q            string
	PriceMin     *int64
	PriceMax     *int64
	Era          string
	EndingWithin string
	Sort         string
	Page         int
	PageSize     int
}

// ── Bids DTOs ─────────────────────────────────────

type PlaceBidRequest struct {
	Amount int64 `json:"amount"`
}

type BidResponse struct {
	ID        string    `json:"id"`
	ItemID    string    `json:"itemId"`
	Bidder    string    `json:"bidder"`
	Amount    int64     `json:"amount"`
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
}

type PlaceBidResponse struct {
	Success bool         `json:"success"`
	Message string       `json:"message"`
	Bid     *BidResponse `json:"bid,omitempty"`
}

// ── Cart DTOs ─────────────────────────────────────

type AddCartItemRequest struct {
	ItemID   string `json:"itemId"`
	Quantity int    `json:"quantity"`
}

type UpdateCartItemRequest struct {
	Quantity int `json:"quantity"`
}

type CartItemDetailResponse struct {
	ID       string      `json:"id"`
	Item     models.Item `json:"item"`
	Quantity int         `json:"quantity"`
}

// ── Wishlist DTOs ─────────────────────────────────

type WishlistActionRequest struct {
	ItemID string `json:"itemId"`
}

// ── Order DTOs ────────────────────────────────────

type CreateOrderRequest struct {
	Contact         models.ContactInfo `json:"contact"`
	ShippingAddress models.Address     `json:"shippingAddress"`
	CartItemIDs     []string           `json:"cartItemIds,omitempty"` // If omitted, uses current user's whole cart
	ReturnOrigin    string             `json:"returnOrigin,omitempty"`
	PaymentMethod   string             `json:"paymentMethod,omitempty"`
}

type OrderResponse struct {
	Order   models.Order `json:"order"`
	Payment *PaymentInfo `json:"payment,omitempty"`
}

type PaymentInfo struct {
	PaymentURL string `json:"paymentUrl,omitempty"`
	PIDX       string `json:"pidx,omitempty"`
}

// ── Payment DTOs ──────────────────────────────────

type PaymentInitiateRequest struct {
	OrderID      string `json:"orderId"`
	OrderIDAlt   string `json:"order_id"`
	ReturnOrigin string `json:"returnOrigin,omitempty"`
}

func (r *PaymentInitiateRequest) GetOrderID() string {
	if r.OrderID != "" {
		return r.OrderID
	}
	return r.OrderIDAlt
}

type PaymentInitiateResponse struct {
	PIDX       string `json:"pidx"`
	PaymentURL string `json:"paymentUrl"`
	ExpiresAt  string `json:"expiresAt"`
}

type PaymentVerifyRequest struct {
	PIDX string `json:"pidx"`
}

type PaymentVerifyResponse struct {
	Status        string `json:"status"`
	TransactionID string `json:"transactionId"`
	Amount        int64  `json:"amount"`
	OrderID       string `json:"orderId,omitempty"`
	Message       string `json:"message"`
}
