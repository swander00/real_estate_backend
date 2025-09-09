-- add_columns_simple.sql
-- Simple SQL to add the missing columns

-- Add the missing columns one by one
ALTER TABLE property_rooms ADD COLUMN IF NOT EXISTS CreatedAt TIMESTAMP DEFAULT NOW();
ALTER TABLE property_rooms ADD COLUMN IF NOT EXISTS UpdatedAt TIMESTAMP DEFAULT NOW();
ALTER TABLE property_rooms ADD COLUMN IF NOT EXISTS ModificationTimestamp TIMESTAMP;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'property_rooms' 
ORDER BY ordinal_position;
