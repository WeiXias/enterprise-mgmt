-- Add missing columns to suppliers table
ALTER TABLE suppliers ADD COLUMN email TEXT;
ALTER TABLE suppliers ADD COLUMN bank_name TEXT;
ALTER TABLE suppliers ADD COLUMN bank_account TEXT;
ALTER TABLE suppliers ADD COLUMN tax_id TEXT;
