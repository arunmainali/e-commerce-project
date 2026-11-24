package handler

import (
	"encoding/json"
	"net/http"

	"github.com/auction-studio/backend/internal/dto"
	"github.com/auction-studio/backend/internal/service"
)

type PaymentHandler struct {
	paymentService *service.PaymentService
}

func NewPaymentHandler(paymentService *service.PaymentService) *PaymentHandler {
	return &PaymentHandler{paymentService: paymentService}
}

func (h *PaymentHandler) Initiate(w http.ResponseWriter, r *http.Request) {
	var req dto.PaymentInitiateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	orderID := req.GetOrderID()
	if orderID == "" {
		ErrorJSON(w, http.StatusBadRequest, "order_id is required")
		return
	}

	returnOrigin := req.ReturnOrigin
	if returnOrigin == "" {
		returnOrigin = r.Header.Get("Origin")
	}

	resp, err := h.paymentService.InitiatePayment(r.Context(), orderID, returnOrigin)
	if err != nil {
		ErrorJSON(w, http.StatusBadRequest, err.Error())
		return
	}

	JSON(w, http.StatusOK, resp)
}

func (h *PaymentHandler) Verify(w http.ResponseWriter, r *http.Request) {
	var req dto.PaymentVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.PIDX == "" {
		ErrorJSON(w, http.StatusBadRequest, "pidx is required")
		return
	}

	resp, err := h.paymentService.VerifyPayment(r.Context(), req.PIDX)
	if err != nil {
		ErrorJSON(w, http.StatusBadRequest, err.Error())
		return
	}

	JSON(w, http.StatusOK, resp)
}
