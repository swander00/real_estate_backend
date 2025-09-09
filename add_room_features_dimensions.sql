-- add_room_features_dimensions.sql
-- Add RoomFeatures and RoomDimensions columns to property_rooms table

-- Add RoomFeatures column (TEXT to store comma-separated features)
ALTER TABLE property_rooms 
ADD COLUMN "RoomFeatures" TEXT;

-- Add RoomDimensions column (VARCHAR to store formatted dimension string)
ALTER TABLE property_rooms 
ADD COLUMN "RoomDimensions" VARCHAR(100);

-- Add comments for the new columns
COMMENT ON COLUMN property_rooms."RoomFeatures" IS 'Combined room features from RoomFeature1, RoomFeature2, RoomFeature3';
COMMENT ON COLUMN property_rooms."RoomDimensions" IS 'Formatted room dimensions combining RoomLength, RoomWidth, and RoomLengthWidthUnits';

-- Verify the new columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'property_rooms' 
  AND column_name IN ('RoomFeatures', 'RoomDimensions')
ORDER BY ordinal_position;
