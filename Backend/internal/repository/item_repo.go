package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/auction-studio/backend/internal/dto"
	"github.com/auction-studio/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ItemRepository struct {
	pool *pgxpool.Pool
}

func NewItemRepository(pool *pgxpool.Pool) *ItemRepository {
	return &ItemRepository{pool: pool}
}

func (r *ItemRepository) Pool() *pgxpool.Pool {
	return r.pool
}

func (r *ItemRepository) EndAuction(ctx context.Context, itemID string) error {
	query := `UPDATE items SET status = 'ended', end_time = NOW(), updated_at = NOW() WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, itemID)
	return err
}

func (r *ItemRepository) Create(ctx context.Context, item *models.Item) error {
	imagesJSON, _ := json.Marshal(item.Images)
	shippingMethodsJSON, _ := json.Marshal(item.Shipping.Methods)

	query := `
		INSERT INTO items (
			id, title, lot_number, category_slug, subcategory, description,
			era, origin, material, dimensions, condition, provenance,
			images, purchase_mode, price, stock, current_bid, starting_bid,
			minimum_increment, bid_count, end_time, status, seller_id,
			shipping_cost, shipping_estimated_days, shipping_methods,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17, $18,
			$19, $20, $21, $22, $23,
			$24, $25, $26,
			$27, $28
		)
	`
	now := time.Now()
	item.CreatedAt = now
	item.UpdatedAt = now

	_, err := r.pool.Exec(ctx, query,
		item.ID, item.Title, item.LotNumber, item.CategorySlug, item.Subcategory, item.Description,
		item.Specs.Era, item.Specs.Origin, item.Specs.Material, item.Specs.Dimensions, item.Specs.Condition, item.Specs.Provenance,
		imagesJSON, item.PurchaseMode, item.Price, item.Stock, item.CurrentBid, item.StartingBid,
		item.MinimumIncrement, item.BidCount, item.EndTime, "active", item.SellerID,
		item.Shipping.Cost, item.Shipping.EstimatedDays, shippingMethodsJSON,
		item.CreatedAt, item.UpdatedAt,
	)
	return err
}

func (r *ItemRepository) GetByID(ctx context.Context, id string) (*models.Item, error) {
	query := `
		SELECT 
			i.id, i.title, i.lot_number, i.category_slug, i.subcategory, i.description,
			i.era, i.origin, i.material, i.dimensions, i.condition, i.provenance,
			i.images, i.purchase_mode, i.price, i.stock, i.current_bid, i.starting_bid,
			i.minimum_increment, i.bid_count, i.end_time, i.seller_id,
			i.shipping_cost, i.shipping_estimated_days, i.shipping_methods,
			i.created_at, i.updated_at,
			u.name, u.rating, u.location,
			i.status
		FROM items i
		JOIN users u ON i.seller_id = u.id
		WHERE i.id = $1
	`
	return r.scanItemWithStatus(r.pool.QueryRow(ctx, query, id))
}

func (r *ItemRepository) GetByIDForUpdate(ctx context.Context, tx pgx.Tx, id string) (*models.Item, error) {
	query := `
		SELECT 
			i.id, i.title, i.lot_number, i.category_slug, i.subcategory, i.description,
			i.era, i.origin, i.material, i.dimensions, i.condition, i.provenance,
			i.images, i.purchase_mode, i.price, i.stock, i.current_bid, i.starting_bid,
			i.minimum_increment, i.bid_count, i.end_time, i.seller_id,
			i.shipping_cost, i.shipping_estimated_days, i.shipping_methods,
			i.created_at, i.updated_at,
			u.name, u.rating, u.location
		FROM items i
		JOIN users u ON i.seller_id = u.id
		WHERE i.id = $1
		FOR UPDATE OF i
	`
	return r.scanItem(tx.QueryRow(ctx, query, id))
}

func (r *ItemRepository) UpdateBidInfo(ctx context.Context, tx pgx.Tx, itemID string, currentBid int64, bidCount int) error {
	query := `
		UPDATE items
		SET current_bid = $1, bid_count = $2, updated_at = NOW()
		WHERE id = $3
	`
	_, err := tx.Exec(ctx, query, currentBid, bidCount, itemID)
	return err
}

func (r *ItemRepository) UpdateStatus(ctx context.Context, itemID string, status string) error {
	query := `UPDATE items SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, status, itemID)
	return err
}

func (r *ItemRepository) GetExpiredActiveAuctions(ctx context.Context) ([]*models.Item, error) {
	query := `
		SELECT 
			i.id, i.title, i.lot_number, i.category_slug, i.subcategory, i.description,
			i.era, i.origin, i.material, i.dimensions, i.condition, i.provenance,
			i.images, i.purchase_mode, i.price, i.stock, i.current_bid, i.starting_bid,
			i.minimum_increment, i.bid_count, i.end_time, i.seller_id,
			i.shipping_cost, i.shipping_estimated_days, i.shipping_methods,
			i.created_at, i.updated_at,
			u.name, u.rating, u.location
		FROM items i
		JOIN users u ON i.seller_id = u.id
		WHERE i.purchase_mode = 'auction' AND i.status = 'active' AND i.end_time <= NOW()
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*models.Item
	for rows.Next() {
		item, err := r.scanItemFromRows(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *ItemRepository) GetEndingSoon(ctx context.Context, limit int) ([]models.Item, error) {
	if limit <= 0 {
		limit = 5
	}
	query := `
		SELECT 
			i.id, i.title, i.lot_number, i.category_slug, i.subcategory, i.description,
			i.era, i.origin, i.material, i.dimensions, i.condition, i.provenance,
			i.images, i.purchase_mode, i.price, i.stock, i.current_bid, i.starting_bid,
			i.minimum_increment, i.bid_count, i.end_time, i.seller_id,
			i.shipping_cost, i.shipping_estimated_days, i.shipping_methods,
			i.created_at, i.updated_at,
			u.name, u.rating, u.location
		FROM items i
		JOIN users u ON i.seller_id = u.id
		WHERE i.purchase_mode = 'auction' AND i.end_time > NOW() AND i.status = 'active'
		ORDER BY i.end_time ASC
		LIMIT $1
	`
	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.Item, 0)
	for rows.Next() {
		item, err := r.scanItemFromRows(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	return items, nil
}

func (r *ItemRepository) GetBySellerID(ctx context.Context, sellerID string) ([]models.Item, error) {
	query := `
		SELECT 
			i.id, i.title, i.lot_number, i.category_slug, i.subcategory, i.description,
			i.era, i.origin, i.material, i.dimensions, i.condition, i.provenance,
			i.images, i.purchase_mode, i.price, i.stock, i.current_bid, i.starting_bid,
			i.minimum_increment, i.bid_count, i.end_time, i.seller_id,
			i.shipping_cost, i.shipping_estimated_days, i.shipping_methods,
			i.created_at, i.updated_at,
			u.name, u.rating, u.location
		FROM items i
		JOIN users u ON i.seller_id = u.id
		WHERE i.seller_id = $1
		ORDER BY i.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, sellerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.Item, 0)
	for rows.Next() {
		item, err := r.scanItemFromRows(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	return items, nil
}

func (r *ItemRepository) Search(ctx context.Context, q string, limit int) ([]models.Item, error) {
	if limit <= 0 {
		limit = 8
	}
	likePattern := "%" + strings.ToLower(q) + "%"
	query := `
		SELECT 
			i.id, i.title, i.lot_number, i.category_slug, i.subcategory, i.description,
			i.era, i.origin, i.material, i.dimensions, i.condition, i.provenance,
			i.images, i.purchase_mode, i.price, i.stock, i.current_bid, i.starting_bid,
			i.minimum_increment, i.bid_count, i.end_time, i.seller_id,
			i.shipping_cost, i.shipping_estimated_days, i.shipping_methods,
			i.created_at, i.updated_at,
			u.name, u.rating, u.location
		FROM items i
		JOIN users u ON i.seller_id = u.id
		WHERE i.status = 'active' AND (
			LOWER(i.title) LIKE $1 OR
			LOWER(i.category_slug) LIKE $1 OR
			LOWER(i.subcategory) LIKE $1 OR
			LOWER(i.era) LIKE $1
		)
		ORDER BY i.created_at DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, likePattern, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.Item, 0)
	for rows.Next() {
		item, err := r.scanItemFromRows(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	return items, nil
}

func (r *ItemRepository) List(ctx context.Context, f dto.ItemFilterParams) (*models.PaginatedResult[models.Item], error) {
	where := []string{"i.status = 'active'"}
	args := []interface{}{}
	argIdx := 1

	if f.Category != "" {
		where = append(where, fmt.Sprintf("i.category_slug = $%d", argIdx))
		args = append(args, f.Category)
		argIdx++
	}
	if f.Subcategory != "" {
		where = append(where, fmt.Sprintf("i.subcategory = $%d", argIdx))
		args = append(args, f.Subcategory)
		argIdx++
	}
	if f.PurchaseMode != "" {
		where = append(where, fmt.Sprintf("i.purchase_mode = $%d", argIdx))
		args = append(args, f.PurchaseMode)
		argIdx++
	}
	if f.Condition != "" {
		where = append(where, fmt.Sprintf("i.condition = $%d", argIdx))
		args = append(args, f.Condition)
		argIdx++
	}
	if f.Era != "" {
		where = append(where, fmt.Sprintf("LOWER(i.era) LIKE $%d", argIdx))
		args = append(args, "%"+strings.ToLower(f.Era)+"%")
		argIdx++
	}
	if f.Q != "" {
		where = append(where, fmt.Sprintf("(LOWER(i.title) LIKE $%d OR LOWER(i.description) LIKE $%d OR LOWER(i.era) LIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+strings.ToLower(f.Q)+"%")
		argIdx++
	}
	if f.PriceMin != nil {
		where = append(where, fmt.Sprintf("COALESCE(i.current_bid, i.price, i.starting_bid, 0) >= $%d", argIdx))
		args = append(args, *f.PriceMin)
		argIdx++
	}
	if f.PriceMax != nil {
		where = append(where, fmt.Sprintf("COALESCE(i.current_bid, i.price, i.starting_bid, 0) <= $%d", argIdx))
		args = append(args, *f.PriceMax)
		argIdx++
	}
	if f.EndingWithin != "" {
		hoursMap := map[string]int{"1h": 1, "6h": 6, "24h": 24, "7d": 168}
		if hours, ok := hoursMap[f.EndingWithin]; ok {
			where = append(where, fmt.Sprintf("i.purchase_mode = 'auction' AND i.end_time > NOW() AND i.end_time <= NOW() + INTERVAL '%d hour'", hours))
		}
	}

	whereClause := strings.Join(where, " AND ")

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM items i WHERE %s", whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}

	// Order by
	orderBy := "i.created_at DESC"
	switch f.Sort {
	case "ending-soon":
		orderBy = "i.end_time ASC NULLS LAST"
	case "price-asc":
		orderBy = "COALESCE(i.current_bid, i.price, i.starting_bid, 0) ASC"
	case "price-desc":
		orderBy = "COALESCE(i.current_bid, i.price, i.starting_bid, 0) DESC"
	case "bids":
		orderBy = "COALESCE(i.bid_count, 0) DESC"
	case "newest":
		orderBy = "i.created_at DESC"
	}

	pageSize := f.PageSize
	if pageSize <= 0 {
		pageSize = 12
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	query := fmt.Sprintf(`
		SELECT 
			i.id, i.title, i.lot_number, i.category_slug, i.subcategory, i.description,
			i.era, i.origin, i.material, i.dimensions, i.condition, i.provenance,
			i.images, i.purchase_mode, i.price, i.stock, i.current_bid, i.starting_bid,
			i.minimum_increment, i.bid_count, i.end_time, i.seller_id,
			i.shipping_cost, i.shipping_estimated_days, i.shipping_methods,
			i.created_at, i.updated_at,
			u.name, u.rating, u.location
		FROM items i
		JOIN users u ON i.seller_id = u.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereClause, orderBy, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.Item, 0)
	for rows.Next() {
		item, err := r.scanItemFromRows(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}

	totalPages := (total + pageSize - 1) / pageSize
	if totalPages == 0 {
		totalPages = 1
	}

	return &models.PaginatedResult[models.Item]{
		Items:      items,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (r *ItemRepository) scanItemWithStatus(row pgx.Row) (*models.Item, error) {
	var item models.Item
	var imagesBytes []byte
	var methodsBytes []byte

	err := row.Scan(
		&item.ID, &item.Title, &item.LotNumber, &item.CategorySlug, &item.Subcategory, &item.Description,
		&item.Specs.Era, &item.Specs.Origin, &item.Specs.Material, &item.Specs.Dimensions, &item.Specs.Condition, &item.Specs.Provenance,
		&imagesBytes, &item.PurchaseMode, &item.Price, &item.Stock, &item.CurrentBid, &item.StartingBid,
		&item.MinimumIncrement, &item.BidCount, &item.EndTime, &item.SellerID,
		&item.Shipping.Cost, &item.Shipping.EstimatedDays, &methodsBytes,
		&item.CreatedAt, &item.UpdatedAt,
		&item.SellerInfo.Name, &item.SellerInfo.Rating, &item.SellerInfo.Location,
		&item.Status,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if len(imagesBytes) > 0 {
		_ = json.Unmarshal(imagesBytes, &item.Images)
	}
	if item.Images == nil {
		item.Images = []string{}
	}

	if len(methodsBytes) > 0 {
		_ = json.Unmarshal(methodsBytes, &item.Shipping.Methods)
	}
	if item.Shipping.Methods == nil {
		item.Shipping.Methods = []string{}
	}

	return &item, nil
}

func (r *ItemRepository) scanItem(row pgx.Row) (*models.Item, error) {
	var item models.Item
	var imagesBytes []byte
	var methodsBytes []byte

	err := row.Scan(
		&item.ID, &item.Title, &item.LotNumber, &item.CategorySlug, &item.Subcategory, &item.Description,
		&item.Specs.Era, &item.Specs.Origin, &item.Specs.Material, &item.Specs.Dimensions, &item.Specs.Condition, &item.Specs.Provenance,
		&imagesBytes, &item.PurchaseMode, &item.Price, &item.Stock, &item.CurrentBid, &item.StartingBid,
		&item.MinimumIncrement, &item.BidCount, &item.EndTime, &item.SellerID,
		&item.Shipping.Cost, &item.Shipping.EstimatedDays, &methodsBytes,
		&item.CreatedAt, &item.UpdatedAt,
		&item.SellerInfo.Name, &item.SellerInfo.Rating, &item.SellerInfo.Location,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if len(imagesBytes) > 0 {
		_ = json.Unmarshal(imagesBytes, &item.Images)
	}
	if item.Images == nil {
		item.Images = []string{}
	}

	if len(methodsBytes) > 0 {
		_ = json.Unmarshal(methodsBytes, &item.Shipping.Methods)
	}
	if item.Shipping.Methods == nil {
		item.Shipping.Methods = []string{}
	}

	return &item, nil
}

func (r *ItemRepository) scanItemFromRows(rows pgx.Rows) (*models.Item, error) {
	var item models.Item
	var imagesBytes []byte
	var methodsBytes []byte

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

	if len(imagesBytes) > 0 {
		_ = json.Unmarshal(imagesBytes, &item.Images)
	}
	if item.Images == nil {
		item.Images = []string{}
	}

	if len(methodsBytes) > 0 {
		_ = json.Unmarshal(methodsBytes, &item.Shipping.Methods)
	}
	if item.Shipping.Methods == nil {
		item.Shipping.Methods = []string{}
	}

	return &item, nil
}
