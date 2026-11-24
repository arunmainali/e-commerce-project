package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/auction-studio/backend/internal/dto"
	"github.com/auction-studio/backend/internal/models"
	"github.com/auction-studio/backend/internal/repository"
	"github.com/auction-studio/backend/internal/ws"
	"github.com/google/uuid"
)

type ItemService struct {
	itemRepo *repository.ItemRepository
	userRepo *repository.UserRepository
	bidRepo  *repository.BidRepository
	wsHub    *ws.Hub
}

func NewItemService(itemRepo *repository.ItemRepository, userRepo *repository.UserRepository, bidRepo *repository.BidRepository, wsHub *ws.Hub) *ItemService {
	return &ItemService{
		itemRepo: itemRepo,
		userRepo: userRepo,
		bidRepo:  bidRepo,
		wsHub:    wsHub,
	}
}

func (s *ItemService) List(ctx context.Context, f dto.ItemFilterParams) (*models.PaginatedResult[models.Item], error) {
	return s.itemRepo.List(ctx, f)
}

func (s *ItemService) GetByID(ctx context.Context, id string) (*models.Item, error) {
	item, err := s.itemRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, errors.New("item not found")
	}

	item.BidHistory = make([]models.BidHistoryEntry, 0)
	if s.bidRepo != nil && item.PurchaseMode == models.PurchaseModeAuction {
		history, err := s.bidRepo.GetHistory(ctx, id)
		if err == nil && history != nil {
			item.BidHistory = history
		}
	}

	return item, nil
}

func (s *ItemService) Search(ctx context.Context, q string, limit int) ([]models.Item, error) {
	return s.itemRepo.Search(ctx, q, limit)
}

func (s *ItemService) GetEndingSoon(ctx context.Context, limit int) ([]models.Item, error) {
	return s.itemRepo.GetEndingSoon(ctx, limit)
}

func (s *ItemService) Create(ctx context.Context, sellerID string, req dto.CreateItemRequest) (*models.Item, error) {
	if req.Title == "" || req.CategorySlug == "" || req.PurchaseMode == "" {
		return nil, errors.New("title, category, and purchaseMode are required")
	}

	itemID := "item-" + uuid.New().String()[:8]
	lotNumber := req.LotNumber
	if lotNumber == "" {
		lotNumber = fmt.Sprintf("L%04d", (time.Now().UnixNano()/1000000)%10000)
	}

	subcat := req.Subcategory
	if subcat == "" {
		subcat = req.CategorySlug
	}

	cond := req.Specs.Condition
	if cond == "" {
		cond = "Good"
	}
	req.Specs.Condition = cond

	images := req.Images
	if len(images) == 0 {
		images = []string{fmt.Sprintf("https://picsum.photos/seed/%s/800/600", itemID)}
	}

	shipCost := req.ShippingCost
	if shipCost <= 0 {
		shipCost = 500
	}

	estDays := req.EstimatedDays
	if estDays == "" {
		estDays = "3-5 business days"
	}

	shipMethods := req.ShippingMethods
	if len(shipMethods) == 0 {
		shipMethods = []string{"Standard insured parcel"}
	}

	minIncr := int64(100)
	if req.MinimumIncrement != nil && *req.MinimumIncrement > 0 {
		minIncr = *req.MinimumIncrement
	}

	zeroCount := 0
	item := &models.Item{
		ID:               itemID,
		Title:            req.Title,
		LotNumber:        lotNumber,
		CategorySlug:     req.CategorySlug,
		Subcategory:      subcat,
		Description:      req.Description,
		Specs:            req.Specs,
		Images:           images,
		PurchaseMode:     req.PurchaseMode,
		SellerID:         sellerID,
		Shipping: models.ShippingInfo{
			Cost:          shipCost,
			EstimatedDays: estDays,
			Methods:       shipMethods,
		},
	}

	if req.PurchaseMode == models.PurchaseModeAuction {
		if req.StartingBid == nil || *req.StartingBid <= 0 {
			return nil, errors.New("startingBid must be greater than 0 for auction items")
		}
		if req.EndTime == nil || req.EndTime.Before(time.Now()) {
			return nil, errors.New("endTime must be a future date and time for auction items")
		}
		item.StartingBid = req.StartingBid
		item.CurrentBid = req.StartingBid
		item.MinimumIncrement = &minIncr
		item.BidCount = &zeroCount
		item.EndTime = req.EndTime
	} else if req.PurchaseMode == models.PurchaseModeBuyNow {
		if req.Price == nil || *req.Price <= 0 {
			return nil, errors.New("price must be greater than 0 for buy-now items")
		}
		stock := 1
		if req.Stock != nil && *req.Stock > 0 {
			stock = *req.Stock
		}
		item.Price = req.Price
		item.Stock = &stock
	}

	if err := s.itemRepo.Create(ctx, item); err != nil {
		return nil, err
	}

	createdItem, err := s.GetByID(ctx, itemID)
	if err != nil {
		return nil, err
	}

	// Broadcast live item creation via WebSocket
	if s.wsHub != nil {
		s.wsHub.Broadcast("ITEM_CREATED", map[string]interface{}{
			"id":           createdItem.ID,
			"title":        createdItem.Title,
			"lotNumber":    createdItem.LotNumber,
			"category":     createdItem.CategorySlug,
			"purchaseMode": string(createdItem.PurchaseMode),
		})
	}

	return createdItem, nil
}

func (s *ItemService) StopAuction(ctx context.Context, sellerID, itemID string) (*models.Item, error) {
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, errors.New("item not found")
	}

	if item.SellerID != sellerID {
		return nil, errors.New("only the consignor can stop bidding for this lot")
	}

	if item.PurchaseMode != models.PurchaseModeAuction {
		return nil, errors.New("only auction lots can be stopped")
	}

	if item.Status == "ended" || item.Status == "sold" {
		return nil, errors.New("auction has already ended or been sold")
	}

	if err := s.itemRepo.EndAuction(ctx, itemID); err != nil {
		_ = s.itemRepo.UpdateStatus(ctx, itemID, "ended")
	}

	// Fetch updated item
	updated, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, err
	}

	// Find winner if any
	highest, err := s.bidRepo.GetHighestActiveBid(ctx, nil, itemID)
	winnerName := ""
	winnerID := ""
	var winningAmount int64
	if err == nil && highest != nil {
		winnerName = highest.Bidder
		winnerID = highest.UserID
		winningAmount = highest.Amount
	}

	// Broadcast AUCTION_ENDED
	s.wsHub.Broadcast("AUCTION_ENDED", map[string]interface{}{
		"itemId":        itemID,
		"title":         item.Title,
		"winnerName":    winnerName,
		"winnerId":      winnerID,
		"winningAmount": winningAmount,
		"stoppedBy":     "consignor",
	})

	return updated, nil
}

func (s *ItemService) GetBySellerID(ctx context.Context, sellerID string) ([]models.Item, error) {
	return s.itemRepo.GetBySellerID(ctx, sellerID)
}
