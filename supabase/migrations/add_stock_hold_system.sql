-- =============================================
-- STOCK HOLD SYSTEM FOR INVENTORY MANAGEMENT
-- =============================================

-- Add stock_hold column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_hold INTEGER DEFAULT 0;

-- Add stock_hold column to product_variants
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS stock_hold INTEGER DEFAULT 0;

-- Create stock_movements table for tracking all inventory changes
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    movement_type VARCHAR(20) NOT NULL, -- 'hold', 'release', 'confirm', 'adjustment'
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    previous_hold INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    new_hold INTEGER NOT NULL,
    notes TEXT,
    created_by VARCHAR(50) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_order ON stock_movements(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);

-- Enable RLS on stock_movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on stock_movements"
    ON stock_movements FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow service role full access on stock_movements"
    ON stock_movements FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comments
COMMENT ON COLUMN products.stock_hold IS 'Quantity reserved by pending orders';
COMMENT ON COLUMN product_variants.stock_hold IS 'Quantity reserved by pending orders';
COMMENT ON COLUMN stock_movements.movement_type IS 'Type: hold (reserve for order), release (cancel order), confirm (deliver order), adjustment (manual)';