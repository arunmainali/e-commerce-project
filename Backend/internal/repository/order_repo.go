package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/auction-studio/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OrderRepository struct {
	pool *pgxpool.Pool
}

func NewOrderRepository(pool *pgxpool.Pool) *OrderRepository {
	return &OrderRepository{pool: pool}
}

func (r *OrderRepository) BeginTx(ctx context.Context) (pgx.Tx, error) {
	return r.pool.Begin(ctx)
}

func (r *OrderRepository) Create(ctx context.Context, tx pgx.Tx, o *models.Order) error {
	if o.TotalAmountPaisa == 0 {
		o.TotalAmountPaisa = o.Total * 100
	}
	if o.PaymentMethod == "" {
		o.PaymentMethod = "KHALTI"
	}
	if o.PaymentStatus == "" {
		o.PaymentStatus = "PENDING"
	}

	orderQuery := `
		INSERT INTO orders (
			id, user_id, status, first_name, last_name, email, phone,
			line1, line2, city, state, zip, country,
			subtotal, shipping_cost, buyers_premium, total,
			total_amount_paisa, payment_method, payment_status, pidx, transaction_id,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12, $13,
			$14, $15, $16, $17,
			$18, $19, $20, $21, $22,
			$23, $24
		)
	`
	_, err := tx.Exec(ctx, orderQuery,
		o.ID, o.UserID, o.Status, o.ContactInfo.FirstName, o.ContactInfo.LastName, o.ContactInfo.Email, o.ContactInfo.Phone,
		o.ShippingAddress.Line1, o.ShippingAddress.Line2, o.ShippingAddress.City, o.ShippingAddress.State, o.ShippingAddress.Zip, o.ShippingAddress.Country,
		o.Subtotal, o.ShippingCost, o.BuyersPremium, o.Total,
		o.TotalAmountPaisa, o.PaymentMethod, o.PaymentStatus, o.PIDX, o.TransactionID,
		o.CreatedAt, o.UpdatedAt,
	)
	if err != nil {
		return err
	}

	itemQuery := `
		INSERT INTO order_items (id, order_id, item_id, title, quantity, price, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`
	for _, item := range o.Items {
		_, err := tx.Exec(ctx, itemQuery,
			o.ID+"-"+item.ItemID, o.ID, item.ItemID, item.Title, item.Quantity, item.Price,
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *OrderRepository) GetByID(ctx context.Context, id string) (*models.Order, error) {
	query := `
		SELECT 
			id, user_id, status, first_name, last_name, email, phone,
			line1, line2, city, state, zip, country,
			subtotal, shipping_cost, buyers_premium, total,
			COALESCE(total_amount_paisa, 0), COALESCE(payment_method, 'KHALTI'),
			COALESCE(payment_status, 'PENDING'), COALESCE(pidx, ''), COALESCE(transaction_id, ''),
			created_at, updated_at
		FROM orders
		WHERE id = $1
	`
	var o models.Order
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&o.ID, &o.UserID, &o.Status, &o.ContactInfo.FirstName, &o.ContactInfo.LastName, &o.ContactInfo.Email, &o.ContactInfo.Phone,
		&o.ShippingAddress.Line1, &o.ShippingAddress.Line2, &o.ShippingAddress.City, &o.ShippingAddress.State, &o.ShippingAddress.Zip, &o.ShippingAddress.Country,
		&o.Subtotal, &o.ShippingCost, &o.BuyersPremium, &o.Total,
		&o.TotalAmountPaisa, &o.PaymentMethod, &o.PaymentStatus, &o.PIDX, &o.TransactionID,
		&o.CreatedAt, &o.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	items, err := r.getOrderItems(ctx, o.ID)
	if err != nil {
		return nil, err
	}
	o.Items = items

	return &o, nil
}

func (r *OrderRepository) GetByPIDX(ctx context.Context, pidx string) (*models.Order, error) {
	query := `
		SELECT 
			id, user_id, status, first_name, last_name, email, phone,
			line1, line2, city, state, zip, country,
			subtotal, shipping_cost, buyers_premium, total,
			COALESCE(total_amount_paisa, 0), COALESCE(payment_method, 'KHALTI'),
			COALESCE(payment_status, 'PENDING'), COALESCE(pidx, ''), COALESCE(transaction_id, ''),
			created_at, updated_at
		FROM orders
		WHERE pidx = $1
	`
	var o models.Order
	err := r.pool.QueryRow(ctx, query, pidx).Scan(
		&o.ID, &o.UserID, &o.Status, &o.ContactInfo.FirstName, &o.ContactInfo.LastName, &o.ContactInfo.Email, &o.ContactInfo.Phone,
		&o.ShippingAddress.Line1, &o.ShippingAddress.Line2, &o.ShippingAddress.City, &o.ShippingAddress.State, &o.ShippingAddress.Zip, &o.ShippingAddress.Country,
		&o.Subtotal, &o.ShippingCost, &o.BuyersPremium, &o.Total,
		&o.TotalAmountPaisa, &o.PaymentMethod, &o.PaymentStatus, &o.PIDX, &o.TransactionID,
		&o.CreatedAt, &o.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	items, err := r.getOrderItems(ctx, o.ID)
	if err == nil {
		o.Items = items
	}

	return &o, nil
}

func (r *OrderRepository) GetByUserID(ctx context.Context, userID string) ([]models.Order, error) {
	query := `
		SELECT 
			id, user_id, status, first_name, last_name, email, phone,
			line1, line2, city, state, zip, country,
			subtotal, shipping_cost, buyers_premium, total,
			COALESCE(total_amount_paisa, 0), COALESCE(payment_method, 'KHALTI'),
			COALESCE(payment_status, 'PENDING'), COALESCE(pidx, ''), COALESCE(transaction_id, ''),
			created_at, updated_at
		FROM orders
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var o models.Order
		err := rows.Scan(
			&o.ID, &o.UserID, &o.Status, &o.ContactInfo.FirstName, &o.ContactInfo.LastName, &o.ContactInfo.Email, &o.ContactInfo.Phone,
			&o.ShippingAddress.Line1, &o.ShippingAddress.Line2, &o.ShippingAddress.City, &o.ShippingAddress.State, &o.ShippingAddress.Zip, &o.ShippingAddress.Country,
			&o.Subtotal, &o.ShippingCost, &o.BuyersPremium, &o.Total,
			&o.TotalAmountPaisa, &o.PaymentMethod, &o.PaymentStatus, &o.PIDX, &o.TransactionID,
			&o.CreatedAt, &o.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		orders = append(orders, o)
	}

	for i := range orders {
		items, err := r.getOrderItems(ctx, orders[i].ID)
		if err == nil {
			orders[i].Items = items
		}
	}

	return orders, nil
}

func (r *OrderRepository) UpdateStatus(ctx context.Context, orderID string, status models.OrderStatus) error {
	query := `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, status, orderID)
	return err
}

func (r *OrderRepository) UpdatePaymentInfo(ctx context.Context, orderID, pidx string, amountPaisa int64, paymentMethod, paymentStatus string) error {
	query := `
		UPDATE orders
		SET pidx = $1, total_amount_paisa = $2, payment_method = $3, payment_status = $4, updated_at = NOW()
		WHERE id = $5
	`
	_, err := r.pool.Exec(ctx, query, pidx, amountPaisa, paymentMethod, paymentStatus, orderID)
	return err
}

func (r *OrderRepository) UpdatePaymentStatus(ctx context.Context, orderID, paymentStatus, orderStatus, transactionID string) error {
	query := `
		UPDATE orders
		SET payment_status = $1, status = $2, transaction_id = $3, updated_at = NOW()
		WHERE id = $4
	`
	_, err := r.pool.Exec(ctx, query, paymentStatus, orderStatus, transactionID, orderID)
	return err
}

func (r *OrderRepository) getOrderItems(ctx context.Context, orderID string) ([]models.OrderItem, error) {
	query := `
		SELECT 
			oi.item_id, oi.title, oi.quantity, oi.price,
			i.lot_number, i.category_slug, i.subcategory, i.description,
			i.era, i.origin, i.material, i.dimensions, i.condition, i.provenance,
			i.images, i.purchase_mode, i.seller_id,
			i.shipping_cost, i.shipping_estimated_days, i.shipping_methods,
			u.name, u.rating, u.location
		FROM order_items oi
		LEFT JOIN items i ON oi.item_id = i.id
		LEFT JOIN users u ON i.seller_id = u.id
		WHERE oi.order_id = $1
	`
	rows, err := r.pool.Query(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.OrderItem, 0)
	for rows.Next() {
		var item models.OrderItem
		var lotNumber, categorySlug, subcategory, description *string
		var era, origin, material, dimensions, condition, provenance *string
		var imagesBytes, methodsBytes []byte
		var purchaseMode, sellerID *string
		var shippingCost *int64
		var shippingEstDays *string
		var sellerName, sellerLoc *string
		var sellerRating *float64

		if err := rows.Scan(
			&item.ItemID, &item.Title, &item.Quantity, &item.Price,
			&lotNumber, &categorySlug, &subcategory, &description,
			&era, &origin, &material, &dimensions, &condition, &provenance,
			&imagesBytes, &purchaseMode, &sellerID,
			&shippingCost, &shippingEstDays, &methodsBytes,
			&sellerName, &sellerRating, &sellerLoc,
		); err != nil {
			return nil, err
		}

		// Hydrate item.Item if item found
		fullItem := models.Item{
			ID:    item.ItemID,
			Title: item.Title,
		}
		if lotNumber != nil {
			fullItem.LotNumber = *lotNumber
		}
		if categorySlug != nil {
			fullItem.CategorySlug = *categorySlug
		}
		if subcategory != nil {
			fullItem.Subcategory = *subcategory
		}
		if description != nil {
			fullItem.Description = *description
		}
		if condition != nil {
			fullItem.Specs.Condition = *condition
		}
		if era != nil {
			fullItem.Specs.Era = *era
		}
		if origin != nil {
			fullItem.Specs.Origin = *origin
		}
		if material != nil {
			fullItem.Specs.Material = *material
		}
		if dimensions != nil {
			fullItem.Specs.Dimensions = *dimensions
		}
		if provenance != nil {
			fullItem.Specs.Provenance = *provenance
		}
		if purchaseMode != nil {
			fullItem.PurchaseMode = models.PurchaseMode(*purchaseMode)
		}
		if sellerID != nil {
			fullItem.SellerID = *sellerID
		}
		if shippingCost != nil {
			fullItem.Shipping.Cost = *shippingCost
		}
		if shippingEstDays != nil {
			fullItem.Shipping.EstimatedDays = *shippingEstDays
		}
		if sellerName != nil {
			fullItem.SellerInfo.Name = *sellerName
		}
		if sellerRating != nil {
			fullItem.SellerInfo.Rating = *sellerRating
		}
		if sellerLoc != nil {
			fullItem.SellerInfo.Location = *sellerLoc
		}

		if len(imagesBytes) > 0 {
			_ = json.Unmarshal(imagesBytes, &fullItem.Images)
		}
		if fullItem.Images == nil {
			fullItem.Images = []string{}
		}

		item.Item = &fullItem
		items = append(items, item)
	}
	return items, nil
}
