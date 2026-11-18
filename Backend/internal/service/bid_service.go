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

type BidService struct {
	bidRepo  *repository.BidRepository
	itemRepo *repository.ItemRepository
	userRepo *repository.UserRepository
	wsHub    *ws.Hub
}

func NewBidService(bidRepo *repository.BidRepository, itemRepo *repository.ItemRepository, userRepo *repository.UserRepository, wsHub *ws.Hub) *BidService {
	return &BidService{
		bidRepo:  bidRepo,
		itemRepo: itemRepo,
		userRepo: userRepo,
		wsHub:    wsHub,
	}
}

func (s *BidService) PlaceBid(ctx context.Context, userID, itemID string, amount int64) (*dto.PlaceBidResponse, error) {
	tx, err := s.bidRepo.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Concurrency control: Lock the item row
	item, err := s.itemRepo.GetByIDForUpdate(ctx, tx, itemID)
	if err != nil {
		return nil, fmt.Errorf("lock item: %w", err)
	}
	if item == nil {
		return nil, errors.New("item not found")
	}

	if item.PurchaseMode != models.PurchaseModeAuction {
		return nil, errors.New("item is not an auction")
	}

	if item.EndTime != nil && item.EndTime.Before(time.Now()) {
		return nil, errors.New("this auction has ended")
	}

	// Consignor restriction: A consignor cannot place bids on their own lot
	if item.SellerID != "" && item.SellerID == userID {
		return nil, errors.New("consignors are not permitted to place bids on their own lots")
	}

	// Calculate minimum required bid
	var currentVal int64
	if item.CurrentBid != nil && *item.CurrentBid > 0 {
		currentVal = *item.CurrentBid
	} else if item.StartingBid != nil {
		currentVal = *item.StartingBid
	}

	var minIncr int64 = 100
	if item.MinimumIncrement != nil && *item.MinimumIncrement > 0 {
		minIncr = *item.MinimumIncrement
	}

	// If there are already bids, bid must be >= current + minIncrement
	// If 0 bids, bid must be >= startingBid
	minBid := currentVal + minIncr
	if item.BidCount == nil || *item.BidCount == 0 {
		minBid = currentVal
	}

	if amount < minBid {
		return nil, fmt.Errorf("bid must be at least NPR %d", minBid)
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}

	bidID := "bid-" + uuid.New().String()[:8]
	bid := &models.Bid{
		ID:        bidID,
		ItemID:    itemID,
		UserID:    userID,
		Amount:    amount,
		Status:    models.BidStatusActive,
		CreatedAt: time.Now(),
	}

	if err := s.bidRepo.Create(ctx, tx, bid); err != nil {
		return nil, fmt.Errorf("record bid: %w", err)
	}

	newCount := 1
	if item.BidCount != nil {
		newCount = *item.BidCount + 1
	}

	if err := s.itemRepo.UpdateBidInfo(ctx, tx, itemID, amount, newCount); err != nil {
		return nil, fmt.Errorf("update item bid info: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit bid: %w", err)
	}

	resp := &dto.PlaceBidResponse{
		Success: true,
		Message: fmt.Sprintf("Bid of NPR %d placed successfully", amount),
		Bid: &dto.BidResponse{
			ID:        bid.ID,
			ItemID:    bid.ItemID,
			Bidder:    user.Name,
			Amount:    bid.Amount,
			Status:    string(bid.Status),
			Timestamp: bid.CreatedAt,
		},
	}

	// Broadcast live bid via WebSocket
	s.wsHub.Broadcast("BID_PLACED", map[string]interface{}{
		"itemId":     itemID,
		"currentBid": amount,
		"bidCount":   newCount,
		"bidder":     user.Name,
		"timestamp":  bid.CreatedAt.Format(time.RFC3339),
	})

	return resp, nil
}

func (s *BidService) CancelBid(ctx context.Context, userID, bidID string) error {
	tx, err := s.bidRepo.BeginTx(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	bid, err := s.bidRepo.GetByID(ctx, bidID)
	if err != nil || bid == nil {
		return errors.New("bid not found")
	}

	if bid.UserID != userID {
		return errors.New("unauthorized: can only cancel your own bid")
	}

	// Lock the item
	item, err := s.itemRepo.GetByIDForUpdate(ctx, tx, bid.ItemID)
	if err != nil {
		return fmt.Errorf("lock item: %w", err)
	}
	if item == nil {
		return errors.New("item not found")
	}

	if item.EndTime != nil && item.EndTime.Before(time.Now()) {
		return errors.New("cannot cancel bid on an ended auction")
	}

	// Soft delete the bid
	if err := s.bidRepo.CancelBid(ctx, tx, bidID, userID); err != nil {
		return err
	}

	// Recalculate highest remaining active bid
	highest, err := s.bidRepo.GetHighestActiveBid(ctx, tx, bid.ItemID)
	if err != nil {
		return fmt.Errorf("recalculate highest bid: %w", err)
	}

	activeCount, err := s.bidRepo.GetActiveBidsCount(ctx, tx, bid.ItemID)
	if err != nil {
		return fmt.Errorf("count active bids: %w", err)
	}

	var newCurrentBid int64
	if highest != nil {
		newCurrentBid = highest.Amount
	} else if item.StartingBid != nil {
		newCurrentBid = *item.StartingBid
	}

	if err := s.itemRepo.UpdateBidInfo(ctx, tx, bid.ItemID, newCurrentBid, activeCount); err != nil {
		return fmt.Errorf("update item: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit cancellation: %w", err)
	}

	// Broadcast cancellation via WebSocket
	s.wsHub.Broadcast("BID_CANCELLED", map[string]interface{}{
		"itemId":     bid.ItemID,
		"bidId":      bidID,
		"currentBid": newCurrentBid,
		"bidCount":   activeCount,
	})

	return nil
}

func (s *BidService) GetHistory(ctx context.Context, itemID string) ([]models.BidHistoryEntry, error) {
	return s.bidRepo.GetHistory(ctx, itemID)
}

func (s *BidService) GetUserBids(ctx context.Context, userID string) ([]models.Bid, error) {
	return s.bidRepo.GetUserBids(ctx, userID)
}

func (s *BidService) GetUserWonItems(ctx context.Context, userID string) ([]models.Item, error) {
	return s.bidRepo.GetUserWonItems(ctx, userID)
}
