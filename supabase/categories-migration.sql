-- =============================================
-- CATEGORIES SYSTEM WITH SUBCATEGORIES
-- =============================================

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50),
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policies for categories
CREATE POLICY "Allow public read access on categories"
    ON categories FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow service role full access on categories"
    ON categories FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Add category_id to products (replace old category field)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

-- Insert default categories
INSERT INTO categories (name, slug, icon, sort_order) VALUES
-- Main Categories
('Skin Care', 'skin-care', '🧴', 1),
('Maquillaje', 'maquillaje', '💄', 2),
('Accesorios Maquillistas Profesionales', 'accesorios-profesionales', '💼', 3)
ON CONFLICT (slug) DO NOTHING;

-- Skin Care Subcategories
INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT 'Limpiadores', 'limpiadores', '🧼', c.id, 1 FROM categories c WHERE c.slug = 'skin-care'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT 'Tónicos', 'tonicos', '💧', c.id, 2 FROM categories c WHERE c.slug = 'skin-care'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT 'Sérums', 'serums', '✨', c.id, 3 FROM categories c WHERE c.slug = 'skin-care'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT 'Hidratantes', 'hidratantes', '🧴', c.id, 4 FROM categories c WHERE c.slug = 'skin-care'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT 'Protectores Solares', 'protectores-solares', '☀️', c.id, 5 FROM categories c WHERE c.slug = 'skin-care'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT 'Mascarillas', 'mascarillas', '🎭', c.id, 6 FROM categories c WHERE c.slug = 'skin-care'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT 'Exfoliantes', 'exfoliantes', '🌿', c.id, 7 FROM categories c WHERE c.slug = 'skin-care'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT 'Aceites', 'aceites', '🫒', c.id, 8 FROM categories c WHERE c.slug = 'skin-care'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT 'Tratamientos', 'tratamientos', '💊', c.id, 9 FROM categories c WHERE c.slug = 'skin-care'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Contorno de Ojos', 'contorno-ojos', '👁️', c.id, 10 FROM categories c WHERE c.slug = 'skin-care'
ON CONFLICT (slug) DO NOTHING;

-- Maquillaje Subcategories
INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Labiales', 'labiales', '💋', c.id, 1 FROM categories c WHERE c.slug = 'maquillaje'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Base y Correctores', 'base-correctores', '🎨', c.id, 2 FROM categories c WHERE c.slug = 'maquillaje'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Sombras', 'sombras', '👁️', c.id, 3 FROM categories c WHERE c.slug = 'maquillaje'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Mascaras de Pestañas', 'mascaras-pestanas', '🌟', c.id, 4 FROM categories c WHERE c.slug = 'maquillaje'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Rubores', 'rubores', '🌸', c.id, 5 FROM categories c WHERE c.slug = 'maquillaje'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Iluminadores', 'iluminadores', '✨', c.id, 6 FROM categories c WHERE c.slug = 'maquillaje'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Polvos y Fijadores', 'polvos-fijadores', '💨', c.id, 7 FROM categories c WHERE c.slug = 'maquillaje'
ON CONFLICT (slug) DO NOTHING;

-- Accesorios Profesionales Subcategories
INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Brochas', 'brochas', '🖌️', c.id, 1 FROM categories c WHERE c.slug = 'accesorios-profesionales'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Esponjas y Pinceles', 'esponjas-pinceles', '🧽', c.id, 2 FROM categories c WHERE c.slug = 'accesorios-profesionales'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Paletas y Mezcladores', 'paletas-mezcladores', '🎨', c.id, 3 FROM categories c WHERE c.slug = 'accesorios-profesionales'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Estuches y Organizadores', 'estuches-organizadores', '💼', c.id, 4 FROM categories c WHERE c.slug = 'accesorios-profesionales'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Espejos', 'espejos', '🪞', c.id, 5 FROM categories c WHERE c.slug = 'accesorios-profesionales'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, icon, parent_id, sort_order)
SELECT('Límpieza de Pinceles', 'limpieza-pinceles', '🧴', c.id, 6 FROM categories c WHERE c.slug = 'accesorios-profesionales'
ON CONFLICT (slug) DO NOTHING;