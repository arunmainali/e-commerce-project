package repository

import (
	"context"
	"errors"
	"time"

	"github.com/auction-studio/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BidRepository struct {
	pool *pgxpool.Pool
}

func NewBidRepository(pool *pgxpool.Pool) *BidRepository {
	return &BidRepository{pool: pool}
}

func (r *BidRepository) BeginTx(ctx context.Context) (pgx.Tx, error) {
	return r.pool.Begin(ctx)
}

func (r *BidRepository) Create(ctx context.Context, tx pgx.Tx, b *models.Bid) error {
	query := `
		INSERT INTO bids (id, item_id, user_id, amount, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	now := time.Now()
	b.CreatedAt = now
	b.Status = models.BidStatusActive

	_, err := tx.Exec(ctx, query, b.ID, b.ItemID, b.UserID, b.Amount, b.Status, b.CreatedAt)
	return err
}

func (r *BidRepository) GetByID(ctx context.Context, id string) (*models.Bid, error) {
	query := `
		SELECT b.id, b.item_id, b.user_id, u.name, b.amount, b.status, b.created_at
		FROM bids b
		JOIN users u ON b.user_id = u.id
		WHERE b.id = $1
	`
	var b models.Bid
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&b.ID, &b.ItemID, &b.UserID, &b.Bidder, &b.Amount, &b.Status, &b.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &b, err
}

func (r *BidRepository) GetHighestActiveBid(ctx context.Context, tx pgx.Tx, itemID string) (*models.Bid, error) {
	query := `
		SELECT b.id, b.item_id, b.user_id, u.name, b.amount, b.status, b.created_at
		FROM bids b
		JOIN users u ON b.user_id = u.id
		WHERE b.item_id = $1 AND b.status = 'active'
		ORDER BY b.amount DESC, b.created_at ASC
		LIMIT 1
	`
	var b models.Bid
	var err error
	if tx != nil {
		err = tx.QueryRow(ctx, query, itemID).Scan(
			&b.ID, &b.ItemID, &b.UserID, &b.Bidder, &b.Amount, &b.Status, &b.CreatedAt,
		)
	} else {
		err = r.pool.QueryRow(ctx, query, itemID).Scan(
			&b.ID, &b.ItemID, &b.UserID, &b.Bidder, &b.Amount, &b.Status, &b.CreatedAt,
		)
	}

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &b, err
}

func (r *BidRepository) GetActiveBidsCount(ctx context.Context, tx pgx.Tx, itemID string) (int, error) {
	query := `SELECT COUNT(*) FROM bids WHERE item_id = $1 AND status = 'active'`
	var count int
	var err error
	if tx != nil {
		err = tx.QueryRow(ctx, query, itemID).Scan(&count)
	} else {
		err = r.pool.QueryRow(ctx, query, itemID).Scan(&count)
	}
	return count, err
}

func (r *BidRepository) GetHistory(ctx context.Context, itemID string) ([]models.BidHistoryEntry, error) {
	query := `
		SELECT u.name, b.amount, b.created_at
		FROM bids b
		JOIN users u ON b.user_id = u.id
		WHERE b.item_id = $1 AND b.status = 'active'
		ORDER BY b.amount DESC, b.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := make([]models.BidHistoryEntry, 0)
	for rows.Next() {
		var bidder string
		var amount int64
		var createdAt time.Time
		if err := rows.Scan(&bidder, &amount, &createdAt); err != nil {
			return nil, err
		}
		entries = append(entries, models.BidHistoryEntry{
			Bidder:    bidder,
			Amount:    amount,
			Timestamp: createdAt.Format(time.RFC3339),
		})
	}
	return entries, nil
}

func (r *BidRepository) CancelBid(ctx context.Context, tx pgx.Tx, bidID, userID string) error {
	query := `
		UPDATE bids
		SET status = 'cancelled', cancelled_at = NOW()
		WHERE id = $1 AND user_id = $2 AND status = 'active'
	`
	tag, err := tx.Exec(ctx, query, bidID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("bid not found or already cancelled")
	}
	return nil
}

func (r *BidRepository) GetUserBids(ctx context.Context, userID string) ([]models.Bid, error) {
	query := `
		SELECT 
			b.id, b.item_id, b.user_id, u.name, b.amount, b.status, b.created_at,
			COALESCE(i.title, ''), COALESCE(i.lot_number, ''), COALESCE(i.current_bid, b.amount), i.end_time
		FROM bids b
		JOIN users u ON b.user_id = u.id
		LEFT JOIN items i ON b.item_id = i.id
		WHERE b.user_id = $1
		ORDER BY b.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	bids := make([]models.Bid, 0)
	for rows.Next() {
		var b models.Bid
		if err := rows.Scan(
			&b.ID, &b.ItemID, &b.UserID, &b.Bidder, &b.Amount, &b.Status, &b.CreatedAt,
			&b.ItemTitle, &b.ItemLotNumber, &b.CurrentBid, &b.EndTime,
		); err != nil {
			return nil, err
		}
		bids = append(bids, b)
	}
	return bids, nil
}

func (r *BidRepository) GetUserWonItems(ctx context.Context, userID string) ([]models.Item, error) {
	// An auction item is won by user if item.purchase_mode='auction' AND item.status='ended' AND highest active bid is by userID
	query := `
		WITH highest_bids AS (
			SELECT DISTINCT ON (item_id) id, item_id, user_id, amount
			FROM bids
			WHERE status = 'active'
			ORDER BY item_id, amount DESC, created_at ASC
		)
		SELECT 
			i.id, i.title, i.lot_number, i.category_slug, i.subcategory, i.description,
			i.era, i.origin, i.material, i.dimensions, i.condition, i.provenance,
			i.images, i.purchase_mode, i.price, i.stock, i.current_bid, i.starting_bid,
			i.minimum_increment, i.bid_count, i.end_time, i.seller_id,
			i.shipping_cost, i.shipping_estimated_days, i.shipping_methods,
			i.created_at, i.updated_at,
			u.name, u.rating, u.location
		FROM items i
		JOIN highest_bids hb ON i.id = hb.item_id
		JOIN users u ON i.seller_id = u.id
		WHERE hb.user_id = $1 AND (i.status = 'ended' OR (i.status = 'active' AND i.end_time <= NOW()))
		ORDER BY i.end_time DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.Item, 0)
	for rows.Next() {
		var item models.Item
		var imagesBytes, methodsBytes []byte
		err := rows.Scan(
			&item.ID, &item.Title, &item.LotNumber, &item.CategorySlug, &item.Subcategory, &item.Description,
			&item.Specs.Era, &item.Specs.Origin, &item.Specs.Material, &item.Specs.Dimensions, &item.Specs.Condition, &item.Specs.Provenance,
			&imagesBytes, &item.PurchaseMode, &item.Price, &item.Stock, &item.CurrentBid, &item.StartingBid,
			&item.MinimumIncrement, &item.BidCount, &item.EndTime, &item.SellerID,
			&item.Shipping.Cost, &item.Shipping.EstimatedDays, &methodsBytes,
			&item.CreatedAt, &item.UpdatedAt,
			&item.SellerInfo.Name, &item.SellerInfo.Rating, &item.SellerInfo.Location,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}
