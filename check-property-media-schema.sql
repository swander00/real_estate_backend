-- Check current property_media table schema
-- Run this in your Supabase SQL editor

-- Get table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'property_media' 
ORDER BY ordinal_position;

-- Get constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'property_media'::regclass;

-- Get indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'property_media';

-- Check if table exists and get basic info
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename = 'property_media';
