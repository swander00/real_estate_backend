-- =============================================================================
-- RESO-Compliant Property Rooms Table Recreation
-- Drops and recreates property_rooms table with proper constraints
-- =============================================================================

-- Drop the existing table (this will also drop any dependent views/constraints)
DROP TABLE IF EXISTS property_rooms CASCADE;

-- Recreate the table with RESO-compliant schema matching the mapper
CREATE TABLE property_rooms (
    -- === PRIMARY IDENTIFIERS ===
    "RoomKey"                    TEXT PRIMARY KEY,                    -- RESO-defined unique room identifier
    "ListingKey"                 TEXT NOT NULL,                       -- Foreign key to property
    
    -- === ROOM DETAILS ===
    "RoomType"                   TEXT,
    "RoomLevel"                  TEXT,
    "RoomDescription"            TEXT,
    "RoomDimensions"             TEXT,
    "RoomLengthWidthUnits"       TEXT,
    "RoomFeatures"               TEXT,
    "RoomFeature1"               TEXT,
    "RoomFeature2"               TEXT,
    "RoomFeature3"               TEXT,
    
    -- === ROOM MEASUREMENTS ===
    "RoomArea"                   DECIMAL(10,2),
    "RoomAreaSource"             TEXT,
    "RoomAreaUnits"              TEXT,
    "RoomLength"                 DECIMAL(10,2),
    "RoomWidth"                  DECIMAL(10,2),
    "RoomHeight"                 DECIMAL(10,2),
    
    -- === ROOM ORDERING ===
    "Order"                      INTEGER,
    
    -- === TIMESTAMPS ===
    "ModificationTimestamp"      TIMESTAMPTZ
);

-- Add foreign key constraint
ALTER TABLE property_rooms 
ADD CONSTRAINT fk_property_rooms_listing_key 
FOREIGN KEY ("ListingKey") 
REFERENCES common_fields("ListingKey") 
ON DELETE CASCADE;

-- Add uniqueness constraint for room ordering within a listing
ALTER TABLE property_rooms 
ADD CONSTRAINT uk_property_rooms_listing_order 
UNIQUE ("ListingKey", "Order");

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_rooms_listing_key ON property_rooms("ListingKey");
CREATE INDEX IF NOT EXISTS idx_property_rooms_room_type ON property_rooms("RoomType");
CREATE INDEX IF NOT EXISTS idx_property_rooms_room_level ON property_rooms("RoomLevel");
CREATE INDEX IF NOT EXISTS idx_property_rooms_order ON property_rooms("Order");
CREATE INDEX IF NOT EXISTS idx_property_rooms_modification_timestamp ON property_rooms("ModificationTimestamp");

-- Enable Row Level Security
ALTER TABLE property_rooms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON property_rooms
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON property_rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON property_rooms
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for service role" ON property_rooms
    FOR DELETE USING (true);

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'property_rooms' 
ORDER BY ordinal_position;

-- Verify constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'property_rooms'::regclass;
