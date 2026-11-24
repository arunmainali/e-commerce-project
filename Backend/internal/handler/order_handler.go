package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/auction-studio/backend/internal/dto"
	"github.com/auction-studio/backend/internal/middleware"
	"github.com/auction-studio/backend/internal/models"
	"github.com/auction-studio/backend/internal/repository"
	"github.com/auction-studio/backend/internal/service"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type OrderHandler struct {
	orderService *service.OrderService
	userRepo     *repository.UserRepository
}

func NewOrderHandler(orderService *service.OrderService, userRepo *repository.UserRepository) *OrderHandler {
	return &OrderHandler{orderService: orderService, userRepo: userRepo}
}

func (h *OrderHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req dto.CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ReturnOrigin == "" {
		if origin := r.Header.Get("Origin"); origin != "" {
			req.ReturnOrigin = origin
		}
	}

	if userID == "" {
		if req.Contact.Email != "" && h.userRepo != nil {
			existingUser, _ := h.userRepo.GetByEmail(r.Context(), req.Contact.Email)
			if existingUser != nil {
				userID = existingUser.ID
			} else {
				newID := "usr-" + uuid.New().String()[:8]
				name := strings.TrimSpace(req.Contact.FirstName + " " + req.Contact.LastName)
				if name == "" {
					name = "Valued Collector"
				}
				guestUser := &models.User{
					ID:           newID,
					Name:         name,
					Email:        req.Contact.Email,
					Role:         models.RoleBuyer,
					Phone:        req.Contact.Phone,
					PasswordHash: "guest-checkout",
					Rating:       5.0,
				}
				if err := h.userRepo.Create(r.Context(), guestUser); err == nil {
					userID = newID
				}
			}
		}
		if userID == "" {
			userID = "usr-buyer-1"
		}
	}

	resp, err := h.orderService.CreateOrder(r.Context(), userID, req)
	if err != nil {
		ErrorJSON(w, http.StatusBadRequest, err.Error())
		return
	}

	JSON(w, http.StatusCreated, resp)
}

func (h *OrderHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		ErrorJSON(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	orders, err := h.orderService.GetOrders(r.Context(), userID)
	if err != nil {
		ErrorJSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, orders)
}

func (h *OrderHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	if orderID == "" {
		ErrorJSON(w, http.StatusBadRequest, "order id is required")
		return
	}

	order, err := h.orderService.GetByID(r.Context(), orderID)
	if err != nil {
		ErrorJSON(w, http.StatusNotFound, err.Error())
		return
	}

	JSON(w, http.StatusOK, order)
}
