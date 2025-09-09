-- database_schema_updates.sql
-- Database schema updates for orphaned records staging

-- Create staging table for orphaned records
CREATE TABLE IF NOT EXISTS orphaned_records_staging (
  id SERIAL PRIMARY KEY,
  staging_table VARCHAR(50) NOT NULL,
  ListingKey VARCHAR(50),
  OpenHouseKey VARCHAR(50),
  RoomKey VARCHAR(50),
  MediaKey VARCHAR(50),
  Order INTEGER,
  RoomType VARCHAR(100),
  RoomLevel VARCHAR(100),
  RoomMeasurements TEXT,
  RoomFeatures TEXT,
  OpenHouseDate DATE,
  OpenHouseStartTime TIMESTAMP,
  OpenHouseEndTime TIMESTAMP,
  OpenHouseStatus VARCHAR(50),
  MediaURL TEXT,
  MediaType VARCHAR(50),
  MediaDescription TEXT,
  PreferredPhotoYN BOOLEAN,
  ModificationTimestamp TIMESTAMP,
  SystemModificationTimestamp TIMESTAMP,
  OriginalEntryTimestamp TIMESTAMP,
  CreatedAt TIMESTAMP DEFAULT NOW(),
  UpdatedAt TIMESTAMP DEFAULT NOW(),
  staged_at TIMESTAMP DEFAULT NOW(),
  staging_reason VARCHAR(100) DEFAULT 'parent_not_found',
  processed_at TIMESTAMP NULL,
  
  -- Indexes for performance
  INDEX idx_orphaned_staging_table (staging_table),
  INDEX idx_orphaned_listing_key (ListingKey),
  INDEX idx_orphaned_staged_at (staged_at),
  INDEX idx_orphaned_processed_at (processed_at),
  INDEX idx_orphaned_staging_reason (staging_reason)
);

-- Create function to clean up orphaned records
CREATE OR REPLACE FUNCTION cleanup_orphaned_records(target_table VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  batch_size INTEGER := 1000;
  offset_count INTEGER := 0;
  current_batch INTEGER;
BEGIN
  LOOP
    -- Delete batch of orphaned records
    EXECUTE format('
      WITH orphaned AS (
        SELECT %I 
        FROM %I 
        WHERE %I NOT IN (SELECT ListingKey FROM common_fields WHERE ListingKey IS NOT NULL)
        LIMIT %s OFFSET %s
      )
      DELETE FROM %I 
      WHERE %I IN (SELECT %I FROM orphaned)',
      CASE 
        WHEN target_table = 'property_openhouse' THEN 'OpenHouseKey'
        WHEN target_table = 'property_rooms' THEN 'RoomKey'
        WHEN target_table = 'property_media' THEN 'MediaKey'
        ELSE 'ListingKey'
      END,
      target_table,
      CASE 
        WHEN target_table = 'property_openhouse' THEN 'ListingKey'
        WHEN target_table = 'property_rooms' THEN 'ListingKey'
        WHEN target_table = 'property_media' THEN 'ResourceRecordKey'
        ELSE 'ListingKey'
      END,
      batch_size,
      offset_count,
      target_table,
      CASE 
        WHEN target_table = 'property_openhouse' THEN 'OpenHouseKey'
        WHEN target_table = 'property_rooms' THEN 'RoomKey'
        WHEN target_table = 'property_media' THEN 'MediaKey'
        ELSE 'ListingKey'
      END,
      CASE 
        WHEN target_table = 'property_openhouse' THEN 'OpenHouseKey'
        WHEN target_table = 'property_rooms' THEN 'RoomKey'
        WHEN target_table = 'property_media' THEN 'MediaKey'
        ELSE 'ListingKey'
      END
    );
    
    GET DIAGNOSTICS current_batch = ROW_COUNT;
    deleted_count := deleted_count + current_batch;
    offset_count := offset_count + batch_size;
    
    -- Exit if no more records to delete
    EXIT WHEN current_batch = 0;
  END LOOP;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to process staged orphaned records
CREATE OR REPLACE FUNCTION process_staged_orphaned_records(target_table VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  staging_records RECORD;
BEGIN
  -- Get staged records that can now be processed
  FOR staging_records IN
    SELECT * FROM orphaned_records_staging 
    WHERE staging_table = target_table 
    AND processed_at IS NULL
    AND ListingKey IN (SELECT ListingKey FROM common_fields WHERE ListingKey IS NOT NULL)
  LOOP
    -- Insert into target table (this will be handled by the application)
    -- Mark as processed
    UPDATE orphaned_records_staging 
    SET processed_at = NOW() 
    WHERE id = staging_records.id;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_common_fields_listing_key ON common_fields(ListingKey);
CREATE INDEX IF NOT EXISTS idx_property_openhouse_listing_key ON property_openhouse(ListingKey);
CREATE INDEX IF NOT EXISTS idx_property_rooms_listing_key ON property_rooms(ListingKey);
CREATE INDEX IF NOT EXISTS idx_property_media_resource_record_key ON property_media(ResourceRecordKey);

-- Create view for monitoring orphaned records
CREATE OR REPLACE VIEW orphaned_records_summary AS
SELECT 
  staging_table,
  COUNT(*) as total_staged,
  COUNT(CASE WHEN processed_at IS NULL THEN 1 END) as pending_processing,
  COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as processed,
  MIN(staged_at) as oldest_staged,
  MAX(staged_at) as newest_staged
FROM orphaned_records_staging
GROUP BY staging_table;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON orphaned_records_staging TO your_app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_orphaned_records TO your_app_user;
-- GRANT EXECUTE ON FUNCTION process_staged_orphaned_records TO your_app_user;
