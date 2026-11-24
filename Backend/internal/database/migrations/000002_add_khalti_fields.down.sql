DROP INDEX IF EXISTS idx_orders_payment_status;
DROP INDEX IF EXISTS idx_orders_pidx;

ALTER TABLE orders DROP COLUMN IF EXISTS transaction_id;
ALTER TABLE orders DROP COLUMN IF EXISTS pidx;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_status;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_method;
ALTER TABLE orders DROP COLUMN IF EXISTS total_amount_paisa;
