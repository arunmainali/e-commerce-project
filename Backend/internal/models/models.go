package models

import "time"

// ── Users ─────────────────────────────────────────

type UserRole string

const (
	RoleBuyer  UserRole = "buyer"
	RoleSeller UserRole = "seller"
	RoleAdmin  UserRole = "admin"
)

type User struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         UserRole  `json:"role"`
	Phone        string    `json:"phone,omitempty"`
	Location     string    `json:"location,omitempty"`
	Rating       float64   `json:"rating"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// ── Categories ────────────────────────────────────

type Category struct {
	ID       string     `json:"id"`
	Label    string     `json:"label"`
	Slug     string     `json:"slug"`
	ParentID *string    `json:"parentId,omitempty"`
	Children []Category `json:"children,omitempty"`
}

// ── Items ─────────────────────────────────────────

type PurchaseMode string

const (
	PurchaseModeAuction PurchaseMode = "auction"
	PurchaseModeBuyNow  PurchaseMode = "buy-now"
)

type ItemCondition string

const (
	ConditionExcellent ItemCondition = "Excellent"
	ConditionVeryGood  ItemCondition = "Very Good"
	ConditionGood      ItemCondition = "Good"
	ConditionFair      ItemCondition = "Fair"
	ConditionAsFound   ItemCondition = "As Found"
)

type ItemSpecs struct {
	Era        string `json:"era,omitempty"`
	Origin     string `json:"origin,omitempty"`
	Material   string `json:"material,omitempty"`
	Dimensions string `json:"dimensions,omitempty"`
	Condition  string `json:"condition"`
	Provenance string `json:"provenance,omitempty"`
}

type Seller struct {
	Name     string  `json:"name"`
	Rating   float64 `json:"rating"`
	Location string  `json:"location"`
}

type ShippingInfo struct {
	Cost          int64    `json:"cost"`
	EstimatedDays string   `json:"estimatedDays"`
	Methods       []string `json:"methods"`
}

type Item struct {
	ID               string       `json:"id"`
	Title            string       `json:"title"`
	LotNumber        string       `json:"lotNumber"`
	CategorySlug     string       `json:"category"`
	Subcategory      string       `json:"subcategory"`
	Description      string       `json:"description"`
	Specs            ItemSpecs    `json:"specs"`
	Images           []string     `json:"images"`
	PurchaseMode     PurchaseMode `json:"purchaseMode"`
	Price            *int64       `json:"price,omitempty"`
	Stock            *int         `json:"stock,omitempty"`
	CurrentBid       *int64       `json:"currentBid,omitempty"`
	StartingBid      *int64       `json:"startingBid,omitempty"`
	MinimumIncrement *int64       `json:"minimumIncrement,omitempty"`
	BidCount         *int         `json:"bidCount,omitempty"`
	EndTime          *time.Time   `json:"endTime,omitempty"`
	SellerID         string       `json:"sellerId,omitempty"`
	Status           string       `json:"status,omitempty"`
	SellerInfo       Seller            `json:"seller"`
	Shipping         ShippingInfo      `json:"shipping"`
	CreatedAt        time.Time         `json:"createdAt"`
	UpdatedAt        time.Time         `json:"updatedAt"`
	BidHistory       []BidHistoryEntry `json:"bidHistory"`
}

// ── Bids ──────────────────────────────────────────

type BidStatus string

const (
	BidStatusActive    BidStatus = "active"
	BidStatusCancelled BidStatus = "cancelled"
	BidStatusWon       BidStatus = "won"
	BidStatusOutbid    BidStatus = "outbid"
)

type Bid struct {
	ID            string     `json:"id"`
	ItemID        string     `json:"itemId"`
	UserID        string     `json:"userId"`
	Bidder        string     `json:"bidder"`
	Amount        int64      `json:"amount"`
	Status        BidStatus  `json:"status"`
	CreatedAt     time.Time  `json:"timestamp"`
	ItemTitle     string     `json:"itemTitle,omitempty"`
	ItemLotNumber string     `json:"itemLotNumber,omitempty"`
	CurrentBid    int64      `json:"currentBid,omitempty"`
	EndTime       *time.Time `json:"endTime,omitempty"`
}

type BidHistoryEntry struct {
	Bidder    string `json:"bidder"`
	Amount    int64  `json:"amount"`
	Timestamp string `json:"timestamp"`
}

// ── Cart ──────────────────────────────────────────

type CartItem struct {
	ID       string `json:"id"`
	UserID   string `json:"userId"`
	ItemID   string `json:"itemId"`
	Quantity int    `json:"quantity"`
}

// ── Wishlist ──────────────────────────────────────

type WishlistItem struct {
	UserID    string    `json:"userId"`
	ItemID    string    `json:"itemId"`
	CreatedAt time.Time `json:"createdAt"`
}

// ── Orders ────────────────────────────────────────

type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "pending"
	OrderStatusPaid      OrderStatus = "paid"
	OrderStatusShipped   OrderStatus = "shipped"
	OrderStatusDelivered OrderStatus = "delivered"
	OrderStatusCancelled OrderStatus = "cancelled"
)

type Order struct {
	ID              string       `json:"id"`
	UserID          string       `json:"userId"`
	Status          OrderStatus  `json:"status"`
	ContactInfo     ContactInfo  `json:"contact"`
	ShippingAddress Address      `json:"shippingAddress"`
	Subtotal        int64        `json:"subtotal"`
	ShippingCost    int64        `json:"shippingCost"`
	BuyersPremium   int64        `json:"buyersPremium"`
	Total           int64        `json:"total"`
	Items           []OrderItem  `json:"items"`
	CreatedAt       time.Time    `json:"createdAt"`
	UpdatedAt       time.Time    `json:"updatedAt"`
}

type OrderItem struct {
	ItemID   string `json:"itemId"`
	Title    string `json:"title"`
	Quantity int    `json:"quantity"`
	Price    int64  `json:"price"`
	Item     *Item  `json:"item,omitempty"`
}

type ContactInfo struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
}

type Address struct {
	Line1   string `json:"line1"`
	Line2   string `json:"line2"`
	City    string `json:"city"`
	State   string `json:"state"`
	Zip     string `json:"zip"`
	Country string `json:"country"`
}

// ── Payments ──────────────────────────────────────

type PaymentStatus string

const (
	PaymentStatusInitiated PaymentStatus = "initiated"
	PaymentStatusCompleted PaymentStatus = "completed"
	PaymentStatusFailed    PaymentStatus = "failed"
	PaymentStatusRefunded  PaymentStatus = "refunded"
)

type Payment struct {
	ID            string        `json:"id"`
	OrderID       string        `json:"orderId"`
	Provider      string        `json:"provider"`
	PIDX          string        `json:"pidx"`
	ProviderTxnID string        `json:"providerTxnId"`
	Amount        int64         `json:"amount"`
	Status        PaymentStatus `json:"status"`
	CreatedAt     time.Time     `json:"createdAt"`
	UpdatedAt     time.Time     `json:"updatedAt"`
}

// ── Pagination ────────────────────────────────────

type PaginatedResult[T any] struct {
	Items      []T `json:"items"`
	Total      int `json:"total"`
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	TotalPages int `json:"totalPages"`
}

// ── Refresh Token ─────────────────────────────────

type RefreshToken struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
}
