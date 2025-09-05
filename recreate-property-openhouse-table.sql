-- =============================================================================
-- RESO-Compliant Property OpenHouse Table Recreation
-- Drops and recreates property_openhouse table with proper constraints
-- =============================================================================

-- Drop the existing table (this will also drop any dependent views/constraints)
DROP TABLE IF EXISTS property_openhouse CASCADE;

-- Recreate the table with RESO-compliant schema
CREATE TABLE property_openhouse (
    -- === PRIMARY IDENTIFIERS ===
    "OpenHouseKey"                TEXT PRIMARY KEY,                    -- RESO-defined unique open house identifier
    "ListingKey"                  TEXT NOT NULL,                       -- Foreign key to property
    
    -- === OPEN HOUSE DETAILS ===
    "OpenHouseDate"               DATE,
    "OpenHouseStartTime"          TIME,
    "OpenHouseEndTime"            TIME,
    "OpenHouseDescription"        TEXT,
    "OpenHouseType"               TEXT,
    "OpenHouseStatus"             TEXT,
    
    -- === TIMESTAMPS ===
    "ModificationTimestamp"       TIMESTAMPTZ
);

-- Add foreign key constraint
ALTER TABLE property_openhouse 
ADD CONSTRAINT fk_property_openhouse_listing_key 
FOREIGN KEY ("ListingKey") 
REFERENCES common_fields("ListingKey") 
ON DELETE CASCADE;

-- Add uniqueness constraint for open house slots (prevents duplicate slots)
ALTER TABLE property_openhouse 
ADD CONSTRAINT uq_openhouse_slot 
UNIQUE ("ListingKey", "OpenHouseDate", "OpenHouseStartTime");

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_openhouse_listing_key ON property_openhouse("ListingKey");
CREATE INDEX IF NOT EXISTS idx_property_openhouse_date ON property_openhouse("OpenHouseDate");
CREATE INDEX IF NOT EXISTS idx_property_openhouse_type ON property_openhouse("OpenHouseType");
CREATE INDEX IF NOT EXISTS idx_property_openhouse_status ON property_openhouse("OpenHouseStatus");
CREATE INDEX IF NOT EXISTS idx_property_openhouse_modification_timestamp ON property_openhouse("ModificationTimestamp");

-- Enable Row Level Security
ALTER TABLE property_openhouse ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON property_openhouse
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON property_openhouse
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON property_openhouse
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for service role" ON property_openhouse
    FOR DELETE USING (true);

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'property_openhouse' 
ORDER BY ordinal_position;

-- Verify constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'property_openhouse'::regclass;
