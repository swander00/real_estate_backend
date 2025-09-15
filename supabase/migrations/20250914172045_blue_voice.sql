/*
  # TRREB RESO Web API Database Schema

  1. New Tables
    - `Property` - Stores property listings from IDX and VOW feeds
      - Uses `ListingKey` as primary key (text, unique identifier from TRREB)
      - Contains standard RESO property fields in PascalCase
      - Includes timestamps for incremental sync
    
    - `Media` - Stores media files (photos, virtual tours, etc.)
      - Uses composite primary key (`ResourceRecordKey`, `MediaKey`)
      - Links to properties via ResourceRecordKey but no foreign key constraint
      - Contains RESO media fields in PascalCase
    
    - `SyncLog` - Tracks sync progress for resumable operations
      - Stores last processed timestamps for IDX, VOW, and MEDIA
      - Enables incremental sync capabilities

  2. Security
    - Enable RLS on all tables
    - Add policies for service role access (for sync operations)
    - Public read access for Property and Media tables

  3. Indexes
    - Performance indexes on frequently queried fields
    - Timestamp indexes for efficient incremental sync
*/

-- Property table for IDX and VOW listings
CREATE TABLE IF NOT EXISTS "Property" (
  "ListingKey" TEXT PRIMARY KEY,
  "PropertyType" TEXT,
  "PropertySubType" TEXT,
  "StandardStatus" TEXT,
  "ContractStatus" TEXT,
  "MlsStatus" TEXT,
  
  -- Address fields
  "UnparsedAddress" TEXT,
  "StreetNumber" TEXT,
  "StreetName" TEXT,
  "StreetSuffix" TEXT,
  "StreetDirPrefix" TEXT,
  "StreetDirSuffix" TEXT,
  "UnitNumber" TEXT,
  "City" TEXT,
  "StateOrProvince" TEXT,
  "PostalCode" TEXT,
  "Country" TEXT,
  
  -- Geographic coordinates
  "Latitude" DECIMAL(10, 8),
  "Longitude" DECIMAL(11, 8),
  
  -- Property details
  "BedroomsTotal" INTEGER,
  "BathroomsTotalInteger" INTEGER,
  "BathroomsFull" INTEGER,
  "BathroomsHalf" INTEGER,
  "LivingArea" DECIMAL(10, 2),
  "LotSizeArea" DECIMAL(15, 2),
  "LotSizeUnits" TEXT,
  "YearBuilt" INTEGER,
  
  -- Financial
  "ListPrice" DECIMAL(15, 2),
  "OriginalListPrice" DECIMAL(15, 2),
  "ClosePrice" DECIMAL(15, 2),
  "PricePerSquareFoot" DECIMAL(10, 2),
  
  -- Dates
  "OnMarketDate" TIMESTAMPTZ,
  "OffMarketDate" TIMESTAMPTZ,
  "ContractStatusChangeDate" TIMESTAMPTZ,
  "CloseDate" TIMESTAMPTZ,
  "PendingtTimestamp" TIMESTAMPTZ,
  "WithdrawnDate" TIMESTAMPTZ,
  "CancelationDate" TIMESTAMPTZ,
  "ExpirationDate" TIMESTAMPTZ,
  
  -- MLS Information
  "OriginatingSystemName" TEXT,
  "OriginatingSystemKey" TEXT,
  "SourceSystemName" TEXT,
  "SourceSystemKey" TEXT,
  
  -- Agent/Office information
  "ListAgentKey" TEXT,
  "ListAgentMlsId" TEXT,
  "ListAgentFullName" TEXT,
  "ListOfficeKey" TEXT,
  "ListOfficeMlsId" TEXT,
  "ListOfficeName" TEXT,
  
  "CoListAgentKey" TEXT,
  "CoListAgentMlsId" TEXT,
  "CoListAgentFullName" TEXT,
  "CoListOfficeKey" TEXT,
  "CoListOfficeMlsId" TEXT,
  "CoListOfficeName" TEXT,
  
  "BuyerAgentKey" TEXT,
  "BuyerAgentMlsId" TEXT,
  "BuyerAgentFullName" TEXT,
  "BuyerOfficeKey" TEXT,
  "BuyerOfficeMlsId" TEXT,
  "BuyerOfficeName" TEXT,
  
  -- Property description
  "PublicRemarks" TEXT,
  "PrivateRemarks" TEXT,
  
  -- Additional fields
  "BuilderName" TEXT,
  "AssociationFee" DECIMAL(10, 2),
  "AssociationFeeFrequency" TEXT,
  "TaxAmount" DECIMAL(15, 2),
  "TaxYear" INTEGER,
  
  -- Timestamps - crucial for incremental sync
  "OriginalEntryTimestamp" TIMESTAMPTZ,
  "ModificationTimestamp" TIMESTAMPTZ,
  
  -- Sync metadata
  "SyncedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Media table for property photos, virtual tours, etc.
CREATE TABLE IF NOT EXISTS "Media" (
  "ResourceRecordKey" TEXT NOT NULL,
  "MediaKey" TEXT NOT NULL,
  "ResourceName" TEXT DEFAULT 'Property',
  "MediaObjectID" TEXT,
  
  -- Media details
  "MediaType" TEXT,
  "MimeType" TEXT,
  "MediaCategory" TEXT,
  "MediaStatus" TEXT,
  "MediaURL" TEXT,
  "MediaURLHiRes" TEXT,
  "MediaURLHtml" TEXT,
  
  -- Dimensions and file info
  "ImageWidth" INTEGER,
  "ImageHeight" INTEGER,
  "ImageSizeDescription" TEXT,
  "ContentLength" BIGINT,
  
  -- Descriptions and metadata
  "ShortDescription" TEXT,
  "LongDescription" TEXT,
  "Caption" TEXT,
  
  -- Ordering and display
  "MediaOrder" INTEGER,
  "Preferred" BOOLEAN DEFAULT FALSE,
  
  -- Media source information
  "OriginatingSystemMediaKey" TEXT,
  "OriginatingSystemName" TEXT,
  "OriginatingSystemKey" TEXT,
  
  -- Timestamps - crucial for incremental sync
  "MediaModificationTimestamp" TIMESTAMPTZ,
  "OriginalEntryTimestamp" TIMESTAMPTZ,
  
  -- Sync metadata
  "SyncedAt" TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite primary key
  PRIMARY KEY ("ResourceRecordKey", "MediaKey")
);

-- SyncLog table for tracking sync progress
CREATE TABLE IF NOT EXISTS "SyncLog" (
  "ResourceType" TEXT PRIMARY KEY,
  "LastProcessedTimestamp" TIMESTAMPTZ NOT NULL,
  "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_modification_timestamp 
  ON "Property" ("ModificationTimestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_property_contract_status 
  ON "Property" ("ContractStatus");

CREATE INDEX IF NOT EXISTS idx_property_city 
  ON "Property" ("City");

CREATE INDEX IF NOT EXISTS idx_property_price 
  ON "Property" ("ListPrice");

CREATE INDEX IF NOT EXISTS idx_property_location 
  ON "Property" ("Latitude", "Longitude");

CREATE INDEX IF NOT EXISTS idx_media_modification_timestamp 
  ON "Media" ("MediaModificationTimestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_media_resource_record_key 
  ON "Media" ("ResourceRecordKey");

CREATE INDEX IF NOT EXISTS idx_media_type 
  ON "Media" ("MediaType");

-- Enable Row Level Security
ALTER TABLE "Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SyncLog" ENABLE ROW LEVEL SECURITY;

-- Policies for service role (sync operations)
CREATE POLICY "Service role can manage Property records"
  ON "Property"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage Media records"
  ON "Media"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage SyncLog records"
  ON "SyncLog"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public read policies for Property and Media
CREATE POLICY "Public can read Property records"
  ON "Property"
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Public can read Media records"
  ON "Media"
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Insert initial sync log entries
INSERT INTO "SyncLog" ("ResourceType", "LastProcessedTimestamp", "UpdatedAt")
VALUES 
  ('IDX', '2024-01-01T00:00:00Z', NOW()),
  ('VOW', '2024-01-01T00:00:00Z', NOW()),
  ('MEDIA', '2024-01-01T00:00:00Z', NOW())
ON CONFLICT ("ResourceType") DO NOTHING;