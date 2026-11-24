package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/auction-studio/backend/internal/dto"
	"github.com/auction-studio/backend/internal/middleware"
	"github.com/auction-studio/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type ItemHandler struct {
	itemService *service.ItemService
}

func NewItemHandler(itemService *service.ItemService) *ItemHandler {
	return &ItemHandler{itemService: itemService}
}

func (h *ItemHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	params := dto.ItemFilterParams{
		Category:     q.Get("category"),
		Subcategory:  q.Get("subcategory"),
		PurchaseMode: q.Get("purchaseMode"),
		Condition:    q.Get("condition"),
		Q:            q.Get("q"),
		Era:          q.Get("era"),
		EndingWithin: q.Get("endingWithin"),
		Sort:         q.Get("sort"),
	}

	if pMin := q.Get("priceMin"); pMin != "" {
		if val, err := strconv.ParseInt(pMin, 10, 64); err == nil {
			params.PriceMin = &val
		}
	}
	if pMax := q.Get("priceMax"); pMax != "" {
		if val, err := strconv.ParseInt(pMax, 10, 64); err == nil {
			params.PriceMax = &val
		}
	}
	if pageStr := q.Get("page"); pageStr != "" {
		if val, err := strconv.Atoi(pageStr); err == nil {
			params.Page = val
		}
	}
	if sizeStr := q.Get("pageSize"); sizeStr != "" {
		if val, err := strconv.Atoi(sizeStr); err == nil {
			params.PageSize = val
		}
	}

	result, err := h.itemService.List(r.Context(), params)
	if err != nil {
		ErrorJSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, result)
}

func (h *ItemHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		ErrorJSON(w, http.StatusBadRequest, "id is required")
		return
	}

	item, err := h.itemService.GetByID(r.Context(), id)
	if err != nil {
		ErrorJSON(w, http.StatusNotFound, err.Error())
		return
	}

	JSON(w, http.StatusOK, item)
}

func (h *ItemHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	limit := 8
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	items, err := h.itemService.Search(r.Context(), query, limit)
	if err != nil {
		ErrorJSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, items)
}

func (h *ItemHandler) GetEndingSoon(w http.ResponseWriter, r *http.Request) {
	limit := 5
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	items, err := h.itemService.GetEndingSoon(r.Context(), limit)
	if err != nil {
		ErrorJSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, items)
}

func (h *ItemHandler) Create(w http.ResponseWriter, r *http.Request) {
	sellerID := middleware.GetUserID(r.Context())
	if sellerID == "" {
		ErrorJSON(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req dto.CreateItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	item, err := h.itemService.Create(r.Context(), sellerID, req)
	if err != nil {
		ErrorJSON(w, http.StatusBadRequest, err.Error())
		return
	}

	JSON(w, http.StatusCreated, item)
}

func (h *ItemHandler) StopAuction(w http.ResponseWriter, r *http.Request) {
	sellerID := middleware.GetUserID(r.Context())
	if sellerID == "" {
		ErrorJSON(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	itemID := chi.URLParam(r, "id")
	if itemID == "" {
		ErrorJSON(w, http.StatusBadRequest, "item id is required")
		return
	}

	item, err := h.itemService.StopAuction(r.Context(), sellerID, itemID)
	if err != nil {
		ErrorJSON(w, http.StatusBadRequest, err.Error())
		return
	}

	JSON(w, http.StatusOK, item)
}

func (h *ItemHandler) GetMyListings(w http.ResponseWriter, r *http.Request) {
	sellerID := middleware.GetUserID(r.Context())
	if sellerID == "" {
		ErrorJSON(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	items, err := h.itemService.GetBySellerID(r.Context(), sellerID)
	if err != nil {
		ErrorJSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, items)
}
