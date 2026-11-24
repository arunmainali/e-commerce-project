package repository

import (
	"context"
	"encoding/json"

	"github.com/auction-studio/backend/internal/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CartRepository struct {
	pool *pgxpool.Pool
}

func NewCartRepository(pool *pgxpool.Pool) *CartRepository {
	return &CartRepository{pool: pool}
}

func (r *CartRepository) GetByUserID(ctx context.Context, userID string) ([]dto.CartItemDetailResponse, error) {
	query := `
		SELECT 
			c.id, c.quantity,
			i.id, i.title, i.lot_number, i.category_slug, i.subcategory, i.description,
			i.era, i.origin, i.material, i.dimensions, i.condition, i.provenance,
			i.images, i.purchase_mode, i.price, i.stock, i.current_bid, i.starting_bid,
			i.minimum_increment, i.bid_count, i.end_time, i.seller_id,
			i.shipping_cost, i.shipping_estimated_days, i.shipping_methods,
			i.created_at, i.updated_at,
			u.name, u.rating, u.location
		FROM cart_items c
		JOIN items i ON c.item_id = i.id
		JOIN users u ON i.seller_id = u.id
		WHERE c.user_id = $1
		ORDER BY c.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]dto.CartItemDetailResponse, 0)
	for rows.Next() {
		var detail dto.CartItemDetailResponse
		var imagesBytes, methodsBytes []byte
		err := rows.Scan(
			&detail.ID, &detail.Quantity,
			&detail.Item.ID, &detail.Item.Title, &detail.Item.LotNumber, &detail.Item.CategorySlug, &detail.Item.Subcategory, &detail.Item.Description,
			&detail.Item.Specs.Era, &detail.Item.Specs.Origin, &detail.Item.Specs.Material, &detail.Item.Specs.Dimensions, &detail.Item.Specs.Condition, &detail.Item.Specs.Provenance,
			&imagesBytes, &detail.Item.PurchaseMode, &detail.Item.Price, &detail.Item.Stock, &detail.Item.CurrentBid, &detail.Item.StartingBid,
			&detail.Item.MinimumIncrement, &detail.Item.BidCount, &detail.Item.EndTime, &detail.Item.SellerID,
			&detail.Item.Shipping.Cost, &detail.Item.Shipping.EstimatedDays, &methodsBytes,
			&detail.Item.CreatedAt, &detail.Item.UpdatedAt,
			&detail.Item.SellerInfo.Name, &detail.Item.SellerInfo.Rating, &detail.Item.SellerInfo.Location,
		)
		if err != nil {
			return nil, err
		}
		if len(imagesBytes) > 0 {
			_ = json.Unmarshal(imagesBytes, &detail.Item.Images)
		}
		if len(methodsBytes) > 0 {
			_ = json.Unmarshal(methodsBytes, &detail.Item.Shipping.Methods)
		}
		items = append(items, detail)
	}
	return items, nil
}

func (r *CartRepository) AddItem(ctx context.Context, id, userID, itemID string, quantity int) error {
	// Unique lots: max quantity is 1, and duplicate adds do not increase quantity
	query := `
		INSERT INTO cart_items (id, user_id, item_id, quantity, created_at)
		VALUES ($1, $2, $3, 1, NOW())
		ON CONFLICT (user_id, item_id)
		DO NOTHING
	`
	_, err := r.pool.Exec(ctx, query, id, userID, itemID)
	return err
}

func (r *CartRepository) UpdateQuantity(ctx context.Context, userID, itemID string, quantity int) error {
	if quantity <= 0 {
		return r.RemoveItem(ctx, userID, itemID)
	}
	// Quantity is fixed to 1 for unique lots
	query := `UPDATE cart_items SET quantity = 1 WHERE user_id = $1 AND item_id = $2`
	_, err := r.pool.Exec(ctx, query, userID, itemID)
	return err
}

func (r *CartRepository) RemoveItem(ctx context.Context, userID, itemID string) error {
	query := `DELETE FROM cart_items WHERE user_id = $1 AND item_id = $2`
	_, err := r.pool.Exec(ctx, query, userID, itemID)
	return err
}

func (r *CartRepository) ClearCart(ctx context.Context, userID string) error {
	query := `DELETE FROM cart_items WHERE user_id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}
