package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/auction-studio/backend/internal/config"
	"github.com/auction-studio/backend/internal/dto"
	"github.com/auction-studio/backend/internal/models"
	"github.com/auction-studio/backend/internal/payment"
	"github.com/auction-studio/backend/internal/repository"
	"github.com/google/uuid"
)

type PaymentService struct {
	paymentRepo *repository.PaymentRepository
	orderRepo   *repository.OrderRepository
	itemRepo    *repository.ItemRepository
	cartRepo    *repository.CartRepository
	paymentProv payment.Provider
	cfg         *config.Config
}

func NewPaymentService(
	paymentRepo *repository.PaymentRepository,
	orderRepo *repository.OrderRepository,
	itemRepo *repository.ItemRepository,
	cartRepo *repository.CartRepository,
	paymentProv payment.Provider,
	cfg *config.Config,
) *PaymentService {
	return &PaymentService{
		paymentRepo: paymentRepo,
		orderRepo:   orderRepo,
		itemRepo:    itemRepo,
		cartRepo:    cartRepo,
		paymentProv: paymentProv,
		cfg:         cfg,
	}
}

func (s *PaymentService) InitiatePayment(ctx context.Context, orderID string, returnOrigin ...string) (*dto.PaymentInitiateResponse, error) {
	if strings.TrimSpace(orderID) == "" {
		return nil, errors.New("order_id is required")
	}

	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil || order == nil {
		return nil, errors.New("order not found")
	}

	// Calculate amount in paisa (1 NPR = 100 paisa)
	amountPaisa := order.Total * 100
	if order.TotalAmountPaisa > 0 {
		amountPaisa = order.TotalAmountPaisa
	}

	// Strict Khalti Rule: Minimum transaction amount is 1000 paisa (Rs. 10)
	if amountPaisa < 1000 {
		return nil, fmt.Errorf("transaction amount (%d paisa / Rs. %.2f) is below Khalti minimum required amount of 1000 paisa (Rs. 10)", amountPaisa, float64(amountPaisa)/100)
	}

	frontendURL := "http://localhost:5173"
	if len(returnOrigin) > 0 && strings.TrimSpace(returnOrigin[0]) != "" {
		frontendURL = strings.TrimRight(strings.TrimSpace(returnOrigin[0]), "/")
	} else if s.cfg != nil && s.cfg.FrontendURL != "" {
		frontendURL = strings.TrimRight(s.cfg.FrontendURL, "/")
	}
	returnURL := fmt.Sprintf("%s/payment/khalti/callback", frontendURL)

	initReq := payment.InitiateRequest{
		ReturnURL:         returnURL,
		WebsiteURL:        frontendURL,
		Amount:            amountPaisa,
		PurchaseOrderID:   orderID,
		PurchaseOrderName: fmt.Sprintf("Auction Studio Order %s", orderID),
		CustomerInfo: payment.CustomerInfo{
			Name:  fmt.Sprintf("%s %s", strings.TrimSpace(order.ContactInfo.FirstName), strings.TrimSpace(order.ContactInfo.LastName)),
			Email: order.ContactInfo.Email,
			Phone: order.ContactInfo.Phone,
		},
	}

	resp, err := s.paymentProv.Initiate(ctx, initReq)
	if err != nil {
		return nil, fmt.Errorf("initiate payment: %w", err)
	}

	// Persist PIDX and payment info to Order record
	_ = s.orderRepo.UpdatePaymentInfo(ctx, orderID, resp.PIDX, amountPaisa, "KHALTI", "PENDING")

	// Persist to payments table for audit trail
	pay := &models.Payment{
		ID:       "pay-" + uuid.New().String()[:8],
		OrderID:  orderID,
		Provider: s.paymentProv.Name(),
		PIDX:     resp.PIDX,
		Amount:   order.Total,
		Status:   models.PaymentStatusInitiated,
	}
	_ = s.paymentRepo.Create(ctx, pay)

	return &dto.PaymentInitiateResponse{
		PIDX:       resp.PIDX,
		PaymentURL: resp.PaymentURL,
		ExpiresAt:  resp.ExpiresAt,
	}, nil
}

func (s *PaymentService) VerifyPayment(ctx context.Context, pidx string) (*dto.PaymentVerifyResponse, error) {
	if strings.TrimSpace(pidx) == "" {
		return nil, errors.New("pidx is required")
	}

	// 1. Locate Order by PIDX (or via payment record)
	order, err := s.orderRepo.GetByPIDX(ctx, pidx)
	if err != nil || order == nil {
		pay, pErr := s.paymentRepo.GetByPIDX(ctx, pidx)
		if pErr == nil && pay != nil {
			order, _ = s.orderRepo.GetByID(ctx, pay.OrderID)
		}
	}
	if order == nil {
		return nil, errors.New("order record not found for the provided pidx")
	}

	// 2. Idempotency Check: if order is already completed/paid, return success immediately
	if order.PaymentStatus == "COMPLETED" || order.Status == models.OrderStatusPaid {
		return &dto.PaymentVerifyResponse{
			Status:        "Completed",
			TransactionID: order.TransactionID,
			Amount:        order.Total,
			OrderID:       order.ID,
			Message:       "Payment already verified and completed (idempotent)",
		}, nil
	}

	// 3. Server-to-server POST to Khalti lookup API
	vResp, err := s.paymentProv.Verify(ctx, pidx)
	if err != nil {
		return nil, fmt.Errorf("verify payment with gateway: %w", err)
	}

	// 4. Handle Status Outcomes
	switch vResp.Status {
	case "Completed":
		// Strict Amount Validation Check: Compare paisa from Khalti with stored database amount
		expectedPaisa := order.TotalAmountPaisa
		if expectedPaisa == 0 {
			expectedPaisa = order.Total * 100
		}
		if vResp.TotalAmount != expectedPaisa {
			_ = s.orderRepo.UpdatePaymentStatus(ctx, order.ID, "FAILED", string(order.Status), vResp.TransactionID)
			_ = s.paymentRepo.UpdateStatus(ctx, pidx, models.PaymentStatusFailed, vResp.TransactionID)
			return nil, fmt.Errorf("security alert: payment amount mismatch! Expected %d paisa, but gateway reported %d paisa", expectedPaisa, vResp.TotalAmount)
		}

		// Update order status to COMPLETED and paid
		_ = s.orderRepo.UpdatePaymentStatus(ctx, order.ID, "COMPLETED", string(models.OrderStatusPaid), vResp.TransactionID)
		_ = s.paymentRepo.UpdateStatus(ctx, pidx, models.PaymentStatusCompleted, vResp.TransactionID)

		// Trigger order fulfillment: mark purchased items as sold and clear DB cart
		if s.itemRepo != nil {
			for _, it := range order.Items {
				_ = s.itemRepo.UpdateStatus(ctx, it.ItemID, "sold")
			}
		}
		if s.cartRepo != nil {
			_ = s.cartRepo.ClearCart(ctx, order.UserID)
		}

		return &dto.PaymentVerifyResponse{
			Status:        "Completed",
			TransactionID: vResp.TransactionID,
			Amount:        vResp.TotalAmount / 100, // paisa to NPR
			OrderID:       order.ID,
			Message:       "Payment completed successfully",
		}, nil

	case "User canceled":
		_ = s.orderRepo.UpdatePaymentStatus(ctx, order.ID, "CANCELED", string(order.Status), vResp.TransactionID)
		_ = s.paymentRepo.UpdateStatus(ctx, pidx, models.PaymentStatusFailed, vResp.TransactionID)
		return &dto.PaymentVerifyResponse{
			Status:        "User canceled",
			TransactionID: vResp.TransactionID,
			Amount:        order.Total,
			OrderID:       order.ID,
			Message:       "Payment was canceled by the customer",
		}, nil

	case "Pending":
		_ = s.orderRepo.UpdatePaymentStatus(ctx, order.ID, "PENDING", string(order.Status), vResp.TransactionID)
		return &dto.PaymentVerifyResponse{
			Status:        "Pending",
			TransactionID: vResp.TransactionID,
			Amount:        order.Total,
			OrderID:       order.ID,
			Message:       "Payment is pending customer confirmation",
		}, nil

	case "Expired":
		_ = s.orderRepo.UpdatePaymentStatus(ctx, order.ID, "FAILED", string(order.Status), vResp.TransactionID)
		_ = s.paymentRepo.UpdateStatus(ctx, pidx, models.PaymentStatusFailed, vResp.TransactionID)
		return &dto.PaymentVerifyResponse{
			Status:        "Expired",
			TransactionID: vResp.TransactionID,
			Amount:        order.Total,
			OrderID:       order.ID,
			Message:       "Payment session has expired",
		}, nil

	default:
		_ = s.orderRepo.UpdatePaymentStatus(ctx, order.ID, "FAILED", string(order.Status), vResp.TransactionID)
		_ = s.paymentRepo.UpdateStatus(ctx, pidx, models.PaymentStatusFailed, vResp.TransactionID)
		return &dto.PaymentVerifyResponse{
			Status:        vResp.Status,
			TransactionID: vResp.TransactionID,
			Amount:        order.Total,
			OrderID:       order.ID,
			Message:       fmt.Sprintf("Payment status: %s", vResp.Status),
		}, nil
	}
}
