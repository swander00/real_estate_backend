-- SQL to drop and recreate common_fields table with only mapper fields
-- Run this in your Supabase SQL editor

-- Drop the existing table (this will also drop any dependent views/constraints)
DROP TABLE IF EXISTS common_fields CASCADE;

-- Recreate the table with only the fields from mapCommonFields.js
CREATE TABLE common_fields (
    -- === PRIMARY IDENTIFIERS AND PRICING ===
    "ListingKey"                  TEXT PRIMARY KEY,
    "ListPrice"                   DECIMAL(15,2),
    "ClosePrice"                  DECIMAL(15,2),

    -- === STATUS FIELDS ===
    "MlsStatus"                   TEXT,
    "ContractStatus"              TEXT,
    "StandardStatus"              TEXT,
    "TransactionType"             TEXT,

    -- === PROPERTY TYPE AND STYLE ===
    "PropertyType"                TEXT,
    "PropertySubType"             TEXT,
    "ArchitecturalStyle"          TEXT,

    -- === ADDRESS FIELDS ===
    "UnparsedAddress"             TEXT,
    "StreetNumber"                TEXT,
    "StreetName"                  TEXT,
    "StreetSuffix"                TEXT,
    "City"                        TEXT,
    "StateOrProvince"             TEXT,
    "PostalCode"                  TEXT,
    "CountyOrParish"              TEXT,
    "CityRegion"                  TEXT,

    -- === ROOM COUNTS ===
    "KitchensAboveGrade"          DECIMAL(6,2),
    "BedroomsAboveGrade"          DECIMAL(6,2),
    "BathroomsTotalInteger"       DECIMAL(6,2),
    "BedroomsBelowGrade"          DECIMAL(6,2),
    "KitchensBelowGrade"          DECIMAL(6,2),
    "KitchensTotal"               DECIMAL(6,2),
    "DenFamilyRoomYN"             TEXT,

    -- === DESCRIPTIONS ===
    "PublicRemarks"               TEXT,
    "PossessionDetails"           TEXT,

    -- === TIMESTAMPS ===
    "PhotosChangeTimestamp"       TIMESTAMPTZ,
    "MediaChangeTimestamp"        TIMESTAMPTZ,
    "ModificationTimestamp"       TIMESTAMPTZ,
    "SystemModificationTimestamp" TIMESTAMPTZ,
    "OriginalEntryTimestamp"      TIMESTAMPTZ,

    "SoldConditionalEntryTimestamp" TIMESTAMPTZ,
    "SoldEntryTimestamp"            TIMESTAMPTZ,
    "SuspendedEntryTimestamp"       TIMESTAMPTZ,
    "TerminatedEntryTimestamp"      TIMESTAMPTZ,

    -- === IMPORTANT DATES ===
    "CloseDate"                  DATE,
    "ConditionalExpiryDate"      DATE,
    "PurchaseContractDate"       DATE,
    "SuspendedDate"              DATE,
    "TerminatedDate"             DATE,
    "UnavailableDate"            DATE,

    -- === PROPERTY FEATURES (RAW ARRAYS/VALUES) ===
    "Cooling"                    TEXT,
    "Sewer"                      TEXT,
    "Basement"                   TEXT,
    "BasementEntrance"           TEXT,
    "ExteriorFeatures"           TEXT,
    "InteriorFeatures"           TEXT,
    "PoolFeatures"               TEXT,
    "PropertyFeatures"           TEXT,

    -- === SINGLE VALUE PROPERTY CHARACTERISTICS ===
    "HeatType"                   TEXT,
    "FireplaceYN"                TEXT,
    "LivingAreaRange"            TEXT,
    "WaterfrontYN"               TEXT,
    "PossessionType"             TEXT,

    -- === PARKING ===
    "CoveredSpaces"              DECIMAL(6,2),
    "ParkingSpaces"              DECIMAL(6,2),
    "ParkingTotal"               DECIMAL(6,2)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_common_fields_mls_status ON common_fields("MlsStatus");
CREATE INDEX IF NOT EXISTS idx_common_fields_property_type ON common_fields("PropertyType");
CREATE INDEX IF NOT EXISTS idx_common_fields_city ON common_fields("City");
CREATE INDEX IF NOT EXISTS idx_common_fields_list_price ON common_fields("ListPrice");
CREATE INDEX IF NOT EXISTS idx_common_fields_modification_timestamp ON common_fields("ModificationTimestamp");

-- Enable Row Level Security
ALTER TABLE common_fields ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust as needed for your use case)
CREATE POLICY "Enable read access for all users" ON common_fields
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON common_fields
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON common_fields
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for service role" ON common_fields
    FOR DELETE USING (true);

-- Verify the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'common_fields' 
ORDER BY ordinal_position;
