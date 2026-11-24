package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
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

	// If DB cart is empty, populate from client-submitted CartItemIDs
	if len(cartItems) == 0 && len(req.CartItemIDs) > 0 {
		for _, itemId := range req.CartItemIDs {
			it, itErr := s.itemRepo.GetByID(ctx, itemId)
			if itErr == nil && it != nil {
				cartItems = append(cartItems, dto.CartItemDetailResponse{
					ID:       "cart-" + it.ID,
					Quantity: 1,
					Item:     *it,
				})
			}
		}
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

	isCard := strings.EqualFold(req.PaymentMethod, "card")
	paymentMethod := "KHALTI"
	paymentStatus := "PENDING"
	orderStatus := models.OrderStatusPending
	if isCard {
		paymentMethod = "CARD"
		paymentStatus = "COMPLETED"
		orderStatus = models.OrderStatusPaid
	}

	orderID := fmt.Sprintf("ORD-%d", time.Now().Unix())
	order := &models.Order{
		ID:               orderID,
		UserID:           userID,
		Status:           orderStatus,
		ContactInfo:      req.Contact,
		ShippingAddress:  req.ShippingAddress,
		Subtotal:         subtotal,
		ShippingCost:     shippingCost,
		BuyersPremium:    buyersPremium,
		Total:            total,
		TotalAmountPaisa: total * 100,
		PaymentMethod:    paymentMethod,
		PaymentStatus:    paymentStatus,
		Items:            orderItems,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
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

	if isCard {
		// Immediate fulfillment for direct card orders
		for _, ci := range cartItems {
			_ = s.itemRepo.UpdateStatus(ctx, ci.Item.ID, "sold")
		}
		_ = s.cartRepo.ClearCart(ctx, userID)
		return &dto.OrderResponse{
			Order: *order,
		}, nil
	}

	// Initiate Khalti payment
	frontendURL := "http://localhost:5173"
	if req.ReturnOrigin != "" {
		frontendURL = strings.TrimRight(req.ReturnOrigin, "/")
	} else if s.cfg != nil && s.cfg.FrontendURL != "" {
		frontendURL = strings.TrimRight(s.cfg.FrontendURL, "/")
	}
	returnURL := fmt.Sprintf("%s/payment/khalti/callback", frontendURL)

	initReq := payment.InitiateRequest{
		ReturnURL:         returnURL,
		WebsiteURL:        frontendURL,
		Amount:            total * 100, // NPR to Paisa
		PurchaseOrderID:   orderID,
		PurchaseOrderName: fmt.Sprintf("Auction Studio Order %s", orderID),
		CustomerInfo: payment.CustomerInfo{
			Name:  fmt.Sprintf("%s %s", strings.TrimSpace(req.Contact.FirstName), strings.TrimSpace(req.Contact.LastName)),
			Email: req.Contact.Email,
			Phone: req.Contact.Phone,
		},
	}

	initResp, err := s.paymentProv.Initiate(ctx, initReq)
	var paymentInfo *dto.PaymentInfo
	if err != nil {
		log.Printf("[OrderService] Khalti initiate error for order %s: %v", orderID, err)
	} else if initResp != nil {
		paymentInfo = &dto.PaymentInfo{
			PaymentURL: initResp.PaymentURL,
			PIDX:       initResp.PIDX,
		}

		order.PIDX = initResp.PIDX
		_ = s.orderRepo.UpdatePaymentInfo(ctx, orderID, initResp.PIDX, order.TotalAmountPaisa, "KHALTI", "PENDING")

		// Record initiated payment
		_ = s.paymentRepo.Create(ctx, &models.Payment{
			ID:       "pay-" + uuid.New().String()[:8],
			OrderID:  orderID,
			Provider: s.paymentProv.Name(),
			PIDX:     initResp.PIDX,
			Amount:   total,
			Status:   models.PaymentStatusInitiated,
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
