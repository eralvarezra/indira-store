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
-- ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
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

-- Sample products (remove in production)
-- INSERT INTO products (name, description, price, image_url, stock) VALUES
--     ('Producto de Ejemplo 1', 'Descripción del producto 1', 199.99, 'https://via.placeholder.com/400', 10),
--     ('Producto de Ejemplo 2', 'Descripción del producto 2', 299.99, 'https://via.placeholder.com/400', 5);