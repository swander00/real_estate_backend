-- create_main_image_view.sql
-- Creates a view to list the primary image (Order 0) for each property

CREATE OR REPLACE VIEW main_image AS
SELECT 
    cf."ListingKey",
    cf."UnparsedAddress",
    cf."City",
    cf."StateOrProvince",
    cf."PostalCode",
    cf."ListPrice",
    cf."MlsStatus",
    cf."PropertyType",
    pm."MediaKey",
    pm."MediaURL",
    pm."MediaType",
    pm."MediaCategory",
    pm."ShortDescription",
    pm."ImageSizeDescription",
    pm."ModificationTimestamp" as MediaModificationTimestamp,
    pm."ResourceRecordKey",
    pm."ResourceName",
    pm."OriginatingSystemID"
FROM common_fields cf
INNER JOIN property_media pm ON cf."ListingKey" = pm.ResourceRecordKey
WHERE pm."Order" = 0
  AND pm."MediaCategory" = 'Photo'
  AND pm."MediaStatus" = 'Active'
  AND pm."MediaURL" IS NOT NULL
  AND pm."MediaURL" != '';

-- Create an index on the view for better performance
-- Note: This will create an index on the underlying tables
CREATE INDEX IF NOT EXISTS idx_property_media_order_0 
ON property_media("Order") 
WHERE "Order" = 0 AND "MediaCategory" = 'Photo' AND "MediaStatus" = 'Active';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT ON main_image TO your_app_user;

-- Add a comment to document the view
COMMENT ON VIEW main_image IS 'Primary image (Order 0) for each property with active photo media';
