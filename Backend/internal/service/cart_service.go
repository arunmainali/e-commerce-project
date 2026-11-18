package service

import (
	"context"
	"errors"

	"github.com/auction-studio/backend/internal/dto"
	"github.com/auction-studio/backend/internal/repository"
	"github.com/google/uuid"
)

type CartService struct {
	cartRepo *repository.CartRepository
	itemRepo *repository.ItemRepository
}

func NewCartService(cartRepo *repository.CartRepository, itemRepo *repository.ItemRepository) *CartService {
	return &CartService{
		cartRepo: cartRepo,
		itemRepo: itemRepo,
	}
}

func (s *CartService) GetCart(ctx context.Context, userID string) ([]dto.CartItemDetailResponse, error) {
	return s.cartRepo.GetByUserID(ctx, userID)
}

func (s *CartService) AddItem(ctx context.Context, userID, itemID string, quantity int) error {
	if quantity <= 0 {
		quantity = 1
	}

	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil || item == nil {
		return errors.New("item not found")
	}

	if item.SellerID != "" && item.SellerID == userID {
		return errors.New("consignors cannot purchase their own listed items")
	}

	cartID := "cart-" + uuid.New().String()[:8]
	return s.cartRepo.AddItem(ctx, cartID, userID, itemID, quantity)
}

func (s *CartService) UpdateQuantity(ctx context.Context, userID, itemID string, quantity int) error {
	return s.cartRepo.UpdateQuantity(ctx, userID, itemID, quantity)
}

func (s *CartService) RemoveItem(ctx context.Context, userID, itemID string) error {
	return s.cartRepo.RemoveItem(ctx, userID, itemID)
}

func (s *CartService) ClearCart(ctx context.Context, userID string) error {
	return s.cartRepo.ClearCart(ctx, userID)
}
