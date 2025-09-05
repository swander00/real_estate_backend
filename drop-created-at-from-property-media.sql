-- Drop CreatedAt column from property_media table
-- Run this in your Supabase SQL editor

-- Drop the CreatedAt column
ALTER TABLE property_media DROP COLUMN IF EXISTS "CreatedAt";

-- Verify the column was dropped
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'property_media' 
ORDER BY ordinal_position;
