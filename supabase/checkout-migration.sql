-- =============================================
-- MIGRATION: Complete checkout fields
-- Adds shipping, billing, payment methods
-- =============================================

-- Add shipping and billing columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS canton VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS exact_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(50) DEFAULT 'pickup';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_details JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_same_as_shipping BOOLEAN DEFAULT TRUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_province VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_canton VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_district VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_exact_address TEXT;

-- Create payment_methods table for configurable payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    instructions TEXT,
    account_info TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS for payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on payment_methods"
    ON payment_methods FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow service role full access on payment_methods"
    ON payment_methods FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Insert default payment methods
INSERT INTO payment_methods (name, description, instructions, account_info, sort_order) VALUES
    ('Sinpe Móvil', 'Pago rápido mediante Sinpe Móvil', 'Envía el monto exacto al número: ', '8888-8888', 1),
    ('Transferencia Bancaria', 'Transferencia a cuenta bancaria', 'Realiza la transferencia a: ', 'Banco Nacional - Cuenta: 1234-5678-90', 2)
ON CONFLICT DO NOTHING;