-- create_main_image_view_optimized.sql
-- Creates a view that picks the best primary image for each property

-- Drop the existing view first
DROP VIEW IF EXISTS main_image;

-- Create the optimized view that picks one primary image per property
CREATE VIEW main_image AS
WITH ranked_images AS (
  SELECT 
    cf."ListingKey",
    cf."UnparsedAddress",
    pm."MediaKey",
    pm."MediaURL",
    pm."MediaType",
    pm."MediaCategory",
    pm."ShortDescription",
    pm."ResourceRecordKey",
    pm."Order",
    -- Rank images by preference: base image first, then by suffix preference
    ROW_NUMBER() OVER (
      PARTITION BY cf."ListingKey" 
      ORDER BY 
        CASE 
          -- Prefer base image (no suffix) first
          WHEN pm."MediaKey" NOT LIKE '%-%' THEN 1
          -- Then prefer specific suffixes in order of quality/size
          WHEN pm."MediaKey" LIKE '%-l' THEN 2  -- Large
          WHEN pm."MediaKey" LIKE '%-m' THEN 3  -- Medium
          WHEN pm."MediaKey" LIKE '%-t' THEN 4  -- Thumbnail
          WHEN pm."MediaKey" LIKE '%-nw' THEN 5 -- Network optimized
          ELSE 6  -- Other suffixes
        END,
        pm."MediaKey"  -- Secondary sort by MediaKey for consistency
    ) as image_rank
  FROM common_fields cf
  INNER JOIN property_media pm ON cf."ListingKey" = pm."ResourceRecordKey"
  WHERE pm."Order" = 0
    AND pm."MediaCategory" = 'Photo'
    AND pm."MediaStatus" = 'Active'
    AND pm."MediaURL" IS NOT NULL
    AND pm."MediaURL" != ''
)
SELECT 
  "ListingKey",
  "UnparsedAddress",
  "MediaKey",
  "MediaURL",
  "MediaType",
  "MediaCategory",
  "ShortDescription",
  "ResourceRecordKey",
  "Order"
FROM ranked_images
WHERE image_rank = 1;  -- Only pick the top-ranked image per property

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_property_media_order_0 
ON property_media("Order") 
WHERE "Order" = 0 AND "MediaCategory" = 'Photo' AND "MediaStatus" = 'Active';

-- Add documentation
COMMENT ON VIEW main_image IS 'Single primary image per property, preferring base image or largest variant';
