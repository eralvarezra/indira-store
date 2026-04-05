-- =============================================
-- MIGRATION: Pre-order system with order numbers
-- Adds order_number, amount tracking, payment status
-- =============================================

-- Add order_number column (unique, human-readable)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_with_shipping DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS advance_payment DECIMAL(10, 2);

-- Create index for faster order number lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Function to generate sequential order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    order_num VARCHAR(20);
BEGIN
    -- Get the next sequential number
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM orders
    WHERE order_number LIKE 'ORD%';

    -- Format as ORD-XXXXXX (6 digits with leading zeros)
    order_num := 'ORD' || LPAD(next_num::TEXT, 6, '0');

    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number for new orders
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
    END IF;

    -- Set total_with_shipping if not set
    IF NEW.total_with_shipping IS NULL THEN
        NEW.total_with_shipping := NEW.total;
    END IF;

    -- Calculate advance payment for pre-orders (50% of total)
    -- This will be calculated in the app, but we set default to total
    IF NEW.advance_payment IS NULL THEN
        NEW.advance_payment := NEW.total_with_shipping;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS orders_order_number_trigger ON orders;
CREATE TRIGGER orders_order_number_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();