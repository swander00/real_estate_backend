-- add_timestamp_columns.sql
-- Add missing timestamp columns to property_rooms table

-- Add the missing timestamp columns
ALTER TABLE property_rooms 
ADD COLUMN IF NOT EXISTS CreatedAt TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS UpdatedAt TIMESTAMP DEFAULT NOW();

-- Create a trigger to automatically update the UpdatedAt timestamp
CREATE OR REPLACE FUNCTION update_property_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.UpdatedAt = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_property_rooms_updated_at ON property_rooms;

-- Create the trigger
CREATE TRIGGER update_property_rooms_updated_at 
    BEFORE UPDATE ON property_rooms 
    FOR EACH ROW 
    EXECUTE FUNCTION update_property_rooms_updated_at();

-- Add comments to document the new columns
COMMENT ON COLUMN property_rooms.CreatedAt IS 'Timestamp when the record was created';
COMMENT ON COLUMN property_rooms.UpdatedAt IS 'Timestamp when the record was last updated';
