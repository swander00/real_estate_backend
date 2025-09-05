-- =============================================================================
-- RESO-Compliant Property Media Table Recreation
-- Drops and recreates property_media table with proper constraints and foreign keys
-- =============================================================================

-- Drop the existing table (this will also drop any dependent views/constraints)
DROP TABLE IF EXISTS property_media CASCADE;

-- Recreate the table with RESO-compliant schema
CREATE TABLE property_media (
    -- === PRIMARY IDENTIFIERS ===
    "MediaKey"                    TEXT PRIMARY KEY,                    -- RESO-defined unique media identifier
    "ListingKey"                  TEXT NOT NULL,                       -- Foreign key to property
    "ResourceRecordKey"           TEXT,
    
    -- === MEDIA DETAILS ===
    "MediaURL"                    TEXT NOT NULL,                       -- Required media URL
    "MediaType"                   TEXT,
    "MediaCategory"               TEXT,
    "MediaStatus"                 TEXT,
    "MediaObjectID"               TEXT,
    "OriginatingSystemID"         TEXT,
    
    -- === MEDIA CLASSIFICATION ===
    "ClassName"                   TEXT,
    "ImageOf"                     TEXT,
    "ImageSizeDescription"        TEXT,
    "ResourceName"                TEXT DEFAULT 'Property',
    
    -- === MEDIA METADATA ===
    "ShortDescription"            TEXT,
    "OrderNumber"                 INTEGER,                             -- Maps from "Order" field
    "PreferredPhotoYN"            BOOLEAN,
    
    -- === TIMESTAMPS ===
    "MediaModificationTimestamp"  TIMESTAMPTZ,
    "ModificationTimestamp"       TIMESTAMPTZ,
    "CreatedAt"                   TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE property_media 
ADD CONSTRAINT fk_property_media_listing_key 
FOREIGN KEY ("ListingKey") 
REFERENCES common_fields("ListingKey") 
ON DELETE CASCADE;

-- Add uniqueness constraint as fallback
ALTER TABLE property_media 
ADD CONSTRAINT uk_property_media_listing_url 
UNIQUE ("ListingKey", "MediaURL");

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_media_listing_key ON property_media("ListingKey");
CREATE INDEX IF NOT EXISTS idx_property_media_media_type ON property_media("MediaType");
CREATE INDEX IF NOT EXISTS idx_property_media_media_category ON property_media("MediaCategory");
CREATE INDEX IF NOT EXISTS idx_property_media_preferred_photo ON property_media("PreferredPhotoYN");
CREATE INDEX IF NOT EXISTS idx_property_media_order_number ON property_media("OrderNumber");
CREATE INDEX IF NOT EXISTS idx_property_media_modification_timestamp ON property_media("ModificationTimestamp");
CREATE INDEX IF NOT EXISTS idx_property_media_created_at ON property_media("CreatedAt");

-- Enable Row Level Security
ALTER TABLE property_media ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON property_media
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON property_media
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON property_media
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for service role" ON property_media
    FOR DELETE USING (true);

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'property_media' 
ORDER BY ordinal_position;

-- Verify constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'property_media'::regclass;
