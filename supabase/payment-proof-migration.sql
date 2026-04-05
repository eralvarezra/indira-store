-- =============================================
-- MIGRATION: Add payment proof URL to orders
-- =============================================

-- Add payment_proof_url column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;