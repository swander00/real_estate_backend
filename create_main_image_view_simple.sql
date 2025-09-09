-- create_main_image_view_simple.sql
-- Creates a simple view to list the primary image (Order 0) for each property

-- Drop the existing view first
DROP VIEW IF EXISTS main_image;

-- Create the new view
CREATE VIEW main_image AS
SELECT 
    cf."ListingKey",
    cf."UnparsedAddress",
    pm."MediaKey",
    pm."MediaURL",
    pm."MediaType",
    pm."MediaCategory",
    pm."ShortDescription",
    pm."ResourceRecordKey",
    pm."Order"
FROM common_fields cf
INNER JOIN property_media pm ON cf."ListingKey" = pm."ResourceRecordKey"
WHERE pm."Order" = 0
  AND pm."MediaCategory" = 'Photo'
  AND pm."MediaStatus" = 'Active'
  AND pm."MediaURL" IS NOT NULL
  AND pm."MediaURL" != '';

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_property_media_order_0 
ON property_media("Order") 
WHERE "Order" = 0 AND "MediaCategory" = 'Photo' AND "MediaStatus" = 'Active';

-- Add documentation
COMMENT ON VIEW main_image IS 'Primary image (Order 0) for each property with active photo media';
