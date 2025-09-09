-- create_property_rooms_pascalcase_quoted.sql
-- Complete property_rooms table with EXPLICIT PascalCase column names using quotes

-- Drop the existing table completely
DROP TABLE IF EXISTS property_rooms CASCADE;

-- Create the complete property_rooms table with EXPLICIT PascalCase using quotes
CREATE TABLE property_rooms (
    -- Primary identifiers (QUOTED to preserve case)
    "ListingID" VARCHAR(50),
    "ListingKey" VARCHAR(50) NOT NULL,
    "RoomKey" VARCHAR(50) NOT NULL,
    
    -- Timestamps (QUOTED to preserve case)
    "ModificationTimestamp" TIMESTAMP,
    "CreatedAt" TIMESTAMP DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP DEFAULT NOW(),
    
    -- Room ordering (QUOTED to preserve case)
    "Order" INTEGER,
    
    -- Room area & dimensions (QUOTED to preserve case)
    "RoomDescription" TEXT,
    "RoomLength" VARCHAR(50),
    "RoomLengthWidthUnits" VARCHAR(20),
    "RoomWidth" VARCHAR(50),
    
    -- Room features (QUOTED to preserve case)
    "RoomFeature1" VARCHAR(200),
    "RoomFeature2" VARCHAR(200),
    "RoomFeature3" VARCHAR(200),
    
    -- Room classification (QUOTED to preserve case)
    "RoomLevel" VARCHAR(50),
    "RoomType" VARCHAR(100),
    
    -- Composite primary key (QUOTED to preserve case)
    PRIMARY KEY ("ListingKey", "RoomKey"),
    
    -- Foreign key constraint (QUOTED to preserve case)
    CONSTRAINT fk_property_rooms_listing_key 
        FOREIGN KEY ("ListingKey") 
        REFERENCES common_fields("ListingKey") 
        ON DELETE CASCADE
);

-- Create indexes with QUOTED column names to preserve case
CREATE INDEX idx_property_rooms_listing_key ON property_rooms("ListingKey");
CREATE INDEX idx_property_rooms_order ON property_rooms("Order");
CREATE INDEX idx_property_rooms_room_type ON property_rooms("RoomType");
CREATE INDEX idx_property_rooms_room_level ON property_rooms("RoomLevel");

-- Create trigger for UpdatedAt (QUOTED to preserve case)
CREATE OR REPLACE FUNCTION update_property_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_property_rooms_updated_at 
    BEFORE UPDATE ON property_rooms 
    FOR EACH ROW 
    EXECUTE FUNCTION update_property_rooms_updated_at();

-- Add comments with QUOTED column names
COMMENT ON TABLE property_rooms IS 'Property room details with EXPLICIT PascalCase column names';
COMMENT ON COLUMN property_rooms."ListingKey" IS 'Foreign key reference to common_fields.ListingKey';
COMMENT ON COLUMN property_rooms."RoomKey" IS 'Unique identifier for the room record';
COMMENT ON COLUMN property_rooms."Order" IS 'Display order of the room within the property';

-- Verify the table was created with PascalCase columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'property_rooms' 
ORDER BY ordinal_position;
