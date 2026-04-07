-- Migration: Add variant_id column to product_images
-- This allows images to be associated with specific product variants

-- Add variant_id column (nullable for general product images)
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_images_variant_id ON product_images(variant_id);

-- Optional: Create composite index for product_id + variant_id queries
CREATE INDEX IF NOT EXISTS idx_product_images_product_variant ON product_images(product_id, variant_id);