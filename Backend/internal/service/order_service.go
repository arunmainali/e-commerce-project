package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/auction-studio/backend/internal/config"
	"github.com/auction-studio/backend/internal/dto"
	"github.com/auction-studio/backend/internal/models"
	"github.com/auction-studio/backend/internal/payment"
	"github.com/auction-studio/backend/internal/repository"
	"github.com/google/uuid"
)

type OrderService struct {
	orderRepo   *repository.OrderRepository
	cartRepo    *repository.CartRepository
	itemRepo    *repository.ItemRepository
	paymentRepo *repository.PaymentRepository
	paymentProv payment.Provider
	cfg         *config.Config
}

func NewOrderService(
	orderRepo *repository.OrderRepository,
	cartRepo *repository.CartRepository,
	itemRepo *repository.ItemRepository,
	paymentRepo *repository.PaymentRepository,
	paymentProv payment.Provider,
	cfg *config.Config,
) *OrderService {
	return &OrderService{
		orderRepo:   orderRepo,
		cartRepo:    cartRepo,
		itemRepo:    itemRepo,
		paymentRepo: paymentRepo,
		paymentProv: paymentProv,
		cfg:         cfg,
	}
}

func (s *OrderService) CreateOrder(ctx context.Context, userID string, req dto.CreateOrderRequest) (*dto.OrderResponse, error) {
	cartItems, err := s.cartRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("fetch cart items: %w", err)
	}
	if len(cartItems) == 0 {
		return nil, errors.New("cart is empty")
	}

	var subtotal int64
	var shippingCost int64 = s.cfg.ShippingFlatRate
	orderItems := make([]models.OrderItem, 0, len(cartItems))

	for _, ci := range cartItems {
		var itemPrice int64
		if ci.Item.PurchaseMode == models.PurchaseModeAuction {
			if ci.Item.CurrentBid != nil {
				itemPrice = *ci.Item.CurrentBid
			} else if ci.Item.StartingBid != nil {
				itemPrice = *ci.Item.StartingBid
			}
		} else {
			if ci.Item.Price != nil {
				itemPrice = *ci.Item.Price
			}
		}

		subtotal += itemPrice * int64(ci.Quantity)
		if ci.Item.Shipping.Cost > 0 {
			shippingCost = ci.Item.Shipping.Cost
		}

		orderItems = append(orderItems, models.OrderItem{
			ItemID:   ci.Item.ID,
			Title:    ci.Item.Title,
			Quantity: ci.Quantity,
			Price:    itemPrice,
		})
	}

	// 10% buyer's premium using integer arithmetic
	buyersPremium := (subtotal * int64(s.cfg.BuyersPremiumPct)) / 100
	total := subtotal + shippingCost + buyersPremium

	orderID := fmt.Sprintf("ORD-%d", time.Now().Unix())
	order := &models.Order{
		ID:              orderID,
		UserID:          userID,
		Status:          models.OrderStatusPending,
		ContactInfo:     req.Contact,
		ShippingAddress: req.ShippingAddress,
		Subtotal:        subtotal,
		ShippingCost:    shippingCost,
		BuyersPremium:   buyersPremium,
		Total:           total,
		Items:           orderItems,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	tx, err := s.orderRepo.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := s.orderRepo.Create(ctx, tx, order); err != nil {
		return nil, fmt.Errorf("create order: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit order: %w", err)
	}

	// Mark purchased items as sold so they no longer appear in available listings
	for _, ci := range cartItems {
		_ = s.itemRepo.UpdateStatus(ctx, ci.Item.ID, "sold")
	}

	// Clear the user's cart
	_ = s.cartRepo.ClearCart(ctx, userID)

	// Initiate Khalti payment
	initReq := payment.InitiateRequest{
		ReturnURL:         "http://localhost:5173/order/" + orderID,
		WebsiteURL:        "http://localhost:5173",
		Amount:            total * 100, // NPR to Paisa
		PurchaseOrderID:   orderID,
		PurchaseOrderName: fmt.Sprintf("Auction Studio Order %s", orderID),
		CustomerInfo: payment.CustomerInfo{
			Name:  fmt.Sprintf("%s %s", req.Contact.FirstName, req.Contact.LastName),
			Email: req.Contact.Email,
			Phone: req.Contact.Phone,
		},
	}

	initResp, err := s.paymentProv.Initiate(ctx, initReq)
	var paymentInfo *dto.PaymentInfo
	if err == nil && initResp != nil {
		paymentInfo = &dto.PaymentInfo{
			PaymentURL: initResp.PaymentURL,
			PIDX:       initResp.PIDX,
		}

		// Record initiated payment
		_ = s.paymentRepo.Create(ctx, &models.Payment{
			ID:            "pay-" + uuid.New().String()[:8],
			OrderID:       orderID,
			Provider:      s.paymentProv.Name(),
			PIDX:          initResp.PIDX,
			Amount:        total,
			Status:        models.PaymentStatusInitiated,
		})
	}

	return &dto.OrderResponse{
		Order:   *order,
		Payment: paymentInfo,
	}, nil
}

func (s *OrderService) GetOrders(ctx context.Context, userID string) ([]models.Order, error) {
	return s.orderRepo.GetByUserID(ctx, userID)
}

func (s *OrderService) GetByID(ctx context.Context, orderID string) (*models.Order, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order == nil {
		return nil, errors.New("order not found")
	}
	return order, nil
}
