-- drop_media_fk_constraint.sql
-- This script will drop the foreign key constraint on property_media table
-- Run this in your Supabase SQL editor or PostgreSQL client

-- First, let's see what constraints exist
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='property_media';

-- Try to drop the constraint (try different possible names)
ALTER TABLE property_media DROP CONSTRAINT IF EXISTS property_media_ResourceRecordKey_fkey;
ALTER TABLE property_media DROP CONSTRAINT IF EXISTS property_media_resourcerecordkey_fkey;
ALTER TABLE property_media DROP CONSTRAINT IF EXISTS property_media_resourcerecordkey_fkey;
ALTER TABLE property_media DROP CONSTRAINT IF EXISTS fk_property_media_resourcerecordkey;
ALTER TABLE property_media DROP CONSTRAINT IF EXISTS property_media_common_fields_fkey;

-- Verify the constraint is gone
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='property_media';
