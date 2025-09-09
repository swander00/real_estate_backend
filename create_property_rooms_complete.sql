-- create_property_rooms_complete.sql
-- Complete property_rooms table with PascalCase column names

-- Drop the existing table completely
DROP TABLE IF EXISTS property_rooms CASCADE;

-- Create the complete property_rooms table with PascalCase
CREATE TABLE property_rooms (
    -- Primary identifiers
    ListingID VARCHAR(50),
    ListingKey VARCHAR(50) NOT NULL,
    RoomKey VARCHAR(50) NOT NULL,
    
    -- Timestamps
    ModificationTimestamp TIMESTAMP,
    CreatedAt TIMESTAMP DEFAULT NOW(),
    UpdatedAt TIMESTAMP DEFAULT NOW(),
    
    -- Room ordering
    "Order" INTEGER,
    
    -- Room area & dimensions
    RoomAreaSource VARCHAR(100),
    RoomDescription TEXT,
    RoomDimensions VARCHAR(200),
    RoomHeight VARCHAR(50),
    RoomLength VARCHAR(50),
    RoomLengthWidthUnits VARCHAR(20),
    RoomWidth VARCHAR(50),
    
    -- Room features
    RoomFeature1 VARCHAR(200),
    RoomFeature2 VARCHAR(200),
    RoomFeature3 VARCHAR(200),
    RoomFeatures TEXT,
    
    -- Room classification
    RoomLevel VARCHAR(50),
    RoomType VARCHAR(100),
    
    -- Primary key
    PRIMARY KEY (RoomKey),
    
    -- Foreign key constraint
    CONSTRAINT fk_property_rooms_listing_key 
        FOREIGN KEY (ListingKey) 
        REFERENCES common_fields("ListingKey") 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_property_rooms_listing_key ON property_rooms(ListingKey);
CREATE INDEX idx_property_rooms_order ON property_rooms("Order");
CREATE INDEX idx_property_rooms_room_type ON property_rooms(RoomType);
CREATE INDEX idx_property_rooms_room_level ON property_rooms(RoomLevel);

-- Create trigger for UpdatedAt
CREATE OR REPLACE FUNCTION update_property_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.UpdatedAt = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_property_rooms_updated_at 
    BEFORE UPDATE ON property_rooms 
    FOR EACH ROW 
    EXECUTE FUNCTION update_property_rooms_updated_at();

-- Add comments
COMMENT ON TABLE property_rooms IS 'Property room details with PascalCase column names';
COMMENT ON COLUMN property_rooms.ListingKey IS 'Foreign key reference to common_fields.ListingKey';
COMMENT ON COLUMN property_rooms.RoomKey IS 'Unique identifier for the room record';
COMMENT ON COLUMN property_rooms."Order" IS 'Display order of the room within the property';
