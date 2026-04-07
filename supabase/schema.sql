-- =============================================
-- INDIRA STORE DATABASE SCHEMA
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    image_url TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    discount_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- =============================================
-- PRODUCT VARIANTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_default ON product_variants(product_id, is_default);

-- Trigger for updated_at on variants
CREATE TRIGGER product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS Policies for product_variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on product_variants"
    ON product_variants FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow service role full access on product_variants"
    ON product_variants FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- PRODUCT IMAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS product_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_product_images_variant_id ON product_images(variant_id);

-- Add variant_id column to existing databases
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER product_images_updated_at
    BEFORE UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS Policies for product_images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on product_images"
    ON product_images FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow service role full access on product_images"
    ON product_images FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    icon VARCHAR(50),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- Trigger for updated_at
CREATE TRIGGER categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS Policies for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on categories"
    ON categories FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow service role full access on categories"
    ON categories FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- WEEK CYCLES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS week_cycles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    report_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_week_cycles_status ON week_cycles(status);
CREATE INDEX IF NOT EXISTS idx_week_cycles_dates ON week_cycles(start_date, end_date);

-- =============================================
-- ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    week_cycle_id UUID REFERENCES week_cycles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- =============================================
-- SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_cycles ENABLE ROW LEVEL SECURITY;

-- Products: Allow public read access
CREATE POLICY "Allow public read access on products"
    ON products FOR SELECT
    TO anon, authenticated
    USING (true);

-- Products: Allow service role full access
CREATE POLICY "Allow service role full access on products"
    ON products FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Orders: Allow public insert
CREATE POLICY "Allow public insert on orders"
    ON orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Orders: Allow service role full access
CREATE POLICY "Allow service role full access on orders"
    ON orders FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Settings: Allow service role full access
CREATE POLICY "Allow service role full access on settings"
    ON settings FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Week Cycles: Allow service role full access
CREATE POLICY "Allow service role full access on week_cycles"
    ON week_cycles FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Week Cycles: Allow public read access
CREATE POLICY "Allow public read access on week_cycles"
    ON week_cycles FOR SELECT
    TO anon, authenticated
    USING (true);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER week_cycles_updated_at
    BEFORE UPDATE ON week_cycles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SEED DATA (Optional)
-- =============================================

-- Insert default settings
INSERT INTO settings (key, value) VALUES
    ('telegram_bot_token', ''),
    ('telegram_chat_id', '')
ON CONFLICT (key) DO NOTHING;

-- Add discount_percentage column if it doesn't exist (for existing databases)
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0;

-- Add category column if it doesn't exist (for existing databases)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'other';

-- Add category_id foreign key if it doesn't exist (for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
        ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add stock_hold column for inventory reservation
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_hold INTEGER DEFAULT 0;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS stock_hold INTEGER DEFAULT 0;

-- Create index for stock_hold queries
CREATE INDEX IF NOT EXISTS idx_products_stock_hold ON products(stock_hold);
CREATE INDEX IF NOT EXISTS idx_product_variants_stock_hold ON product_variants(stock_hold);

-- Add week_cycle_id column to orders if it doesn't exist (for existing databases)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS week_cycle_id UUID REFERENCES week_cycles(id);

-- =============================================
-- FUNCTION TO GET OR CREATE CURRENT WEEK CYCLE
-- =============================================
CREATE OR REPLACE FUNCTION get_or_create_week_cycle()
RETURNS UUID AS $$
DECLARE
    current_cycle_id UUID;
    week_start TIMESTAMP WITH TIME ZONE;
    week_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current date in UTC
    -- Calculate week start (Saturday 00:00) and end (Friday 23:59)
    -- Saturday = day 6 in PostgreSQL's DOW
    week_start := DATE_TRUNC('week', TIMEZONE('utc', NOW())) - INTERVAL '2 days';
    week_end := week_start + INTERVAL '6 days 23 hours 59 minutes 59 seconds';

    -- Check if current cycle exists
    SELECT id INTO current_cycle_id
    FROM week_cycles
    WHERE start_date <= TIMEZONE('utc', NOW())
    AND end_date >= TIMEZONE('utc', NOW())
    AND status = 'open'
    LIMIT 1;

    -- If no cycle exists, create one
    IF current_cycle_id IS NULL THEN
        INSERT INTO week_cycles (start_date, end_date, status)
        VALUES (week_start, week_end, 'open')
        RETURNING id INTO current_cycle_id;
    END IF;

    RETURN current_cycle_id;
END;
$$ LANGUAGE plpgsql;

-- Sample products (remove in production)
-- INSERT INTO products (name, description, price, image_url, stock) VALUES
--     ('Producto de Ejemplo 1', 'Descripción del producto 1', 199.99, 'https://via.placeholder.com/400', 10),
--     ('Producto de Ejemplo 2', 'Descripción del producto 2', 299.99, 'https://via.placeholder.com/400', 5);