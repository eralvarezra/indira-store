-- Agregar columna category a la tabla products
-- Ejecutar este script en Supabase SQL Editor

ALTER TABLE products
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;

-- Crear índice para búsquedas por categoría
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Comentario sobre la columna
COMMENT ON COLUMN products.category IS 'Categoría del producto: cleansers, toners, serums, moisturizers, sunscreen, masks, exfoliants, oils, treatments, eye-care';