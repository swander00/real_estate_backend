
-- Execute this SQL in your Supabase SQL editor or psql client

-- Drop existing table and dependent objects
DROP VIEW IF EXISTS main_image CASCADE;
DROP TABLE IF EXISTS property_media CASCADE;

-- Create the new RESO-compliant property_media table
CREATE TABLE property_media (
    ResourceRecordKey VARCHAR(50) NOT NULL,        -- references common_fields.ListingKey
    MediaKey VARCHAR(100) NOT NULL,               -- unique key for this media record (incl. variant)
    MediaObjectID VARCHAR(100) NULL,              -- groups size variants of the same image
    MediaURL TEXT NULL,                           -- direct URL to the media file
    MediaCategory VARCHAR(50) NULL,               -- e.g. 'Photo', 'Video', 'Floor Plan'
    MediaType VARCHAR(50) NULL,                   -- e.g. 'jpeg', 'pdf' (file MIME type)
    "Order" INTEGER NULL,                         -- display order of the media (0 = first photo)
    PreferredPhotoYN BOOLEAN NULL,                -- true if this is the listing's cover photo
    Permission TEXT[] NULL,                       -- array of permissions (e.g. {'Public','Private'})
    MediaStatus VARCHAR(20) NULL,                 -- 'Active' or 'Inactive'
    MediaModificationTimestamp TIMESTAMPTZ NULL,  -- last time this media content was modified
    ModificationTimestamp TIMESTAMPTZ NULL,       -- last time the record (any field) was modified
    
    -- Composite primary key as specified in the document
    PRIMARY KEY (ResourceRecordKey, MediaKey),
    
    -- Foreign key constraint to ensure referential integrity
    FOREIGN KEY (ResourceRecordKey) REFERENCES common_fields(ListingKey)
);

-- Add indexes
CREATE INDEX idx_property_media_resrec_ts 
    ON property_media(ResourceRecordKey, MediaModificationTimestamp);

CREATE INDEX idx_property_media_media_mod_ts 
    ON property_media(MediaModificationTimestamp);

CREATE INDEX idx_property_media_status 
    ON property_media(MediaStatus);

CREATE INDEX idx_property_media_permission 
    ON property_media USING GIN(Permission);

CREATE INDEX idx_property_media_order 
    ON property_media("Order");

CREATE INDEX idx_property_media_category 
    ON property_media(MediaCategory);

-- Add comments
COMMENT ON TABLE property_media IS 'RESO 1.7 compliant media table for TRREB property listings';
COMMENT ON COLUMN property_media.Permission IS 'Array of permission flags - controls public vs private access (e.g. {"Public"})';
