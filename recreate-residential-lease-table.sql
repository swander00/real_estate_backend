-- SQL to drop and recreate residential_lease table with only mapper fields
-- Run this in your Supabase SQL editor

-- Drop the existing table (this will also drop any dependent views/constraints)
DROP TABLE IF EXISTS residential_lease CASCADE;

-- Recreate the table with only the fields from mapResidentialLease.js
CREATE TABLE residential_lease (
    -- === PRIMARY IDENTIFIER ===
    "ListingKey" TEXT PRIMARY KEY REFERENCES common_fields("ListingKey"),

    -- === TIMESTAMPS ===
    "ModificationTimestamp" TIMESTAMPTZ,
    "SystemModificationTimestamp" TIMESTAMPTZ,

    -- === LEASE DETAILS ===
    "RentIncludes" TEXT,                    -- Multi (array) - stored as comma-separated string
    "Furnished" TEXT,                       -- Single
    "PetsAllowed" TEXT,                     -- Multi (array) - stored as comma-separated string
    "LeasedTerms" TEXT,                     -- Description
    "LeasedLandFee" DECIMAL(15,2),          -- Numeric
    "LaundryFeatures" TEXT,                 -- Multi (array) - stored as comma-separated string
    "ParkingMonthlyCost" DECIMAL(15,2),     -- Numeric
    "OccupantType" TEXT                     -- Single
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_residential_lease_listing_key ON residential_lease("ListingKey");
CREATE INDEX IF NOT EXISTS idx_residential_lease_modification_timestamp ON residential_lease("ModificationTimestamp");
CREATE INDEX IF NOT EXISTS idx_residential_lease_furnished ON residential_lease("Furnished");
CREATE INDEX IF NOT EXISTS idx_residential_lease_occupant_type ON residential_lease("OccupantType");

-- Enable Row Level Security
ALTER TABLE residential_lease ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust as needed for your use case)
CREATE POLICY "Enable read access for all users" ON residential_lease
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON residential_lease
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON residential_lease
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for service role" ON residential_lease
    FOR DELETE USING (true);

-- Verify the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'residential_lease' 
ORDER BY ordinal_position;
