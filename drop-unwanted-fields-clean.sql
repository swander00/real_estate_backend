-- SQL to drop unwanted fields from common_fields table
-- Run this in your Supabase SQL editor

-- Drop unwanted fields from common_fields table
ALTER TABLE common_fields DROP COLUMN IF EXISTS DataSource;
ALTER TABLE common_fields DROP COLUMN IF EXISTS FeedType;
ALTER TABLE common_fields DROP COLUMN IF EXISTS LastSyncTimestamp;
ALTER TABLE common_fields DROP COLUMN IF EXISTS SourceConflicts;
ALTER TABLE common_fields DROP COLUMN IF EXISTS SourcePriority;
ALTER TABLE common_fields DROP COLUMN IF EXISTS ListingId;
ALTER TABLE common_fields DROP COLUMN IF EXISTS ResourceName;
ALTER TABLE common_fields DROP COLUMN IF EXISTS RoomMeasurements;
ALTER TABLE common_fields DROP COLUMN IF EXISTS RoomFeatures;
ALTER TABLE common_fields DROP COLUMN IF EXISTS LotSize;

-- Drop dependent views first, then drop columns
DROP VIEW IF EXISTS property_primary_image CASCADE;
DROP VIEW IF EXISTS property_first_images CASCADE;

-- Now drop unwanted fields from other tables
ALTER TABLE property_openhouse DROP COLUMN IF EXISTS created_at;
ALTER TABLE property_openhouse DROP COLUMN IF EXISTS updated_at;
ALTER TABLE property_media DROP COLUMN IF EXISTS created_at;
ALTER TABLE property_media DROP COLUMN IF EXISTS updated_at;
ALTER TABLE property_rooms DROP COLUMN IF EXISTS created_at;
ALTER TABLE property_rooms DROP COLUMN IF EXISTS updated_at;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'common_fields' 
ORDER BY ordinal_position;
