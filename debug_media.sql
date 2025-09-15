-- ============================================
-- MEDIA-PROPERTY RELATIONSHIP DEBUG SCRIPT
-- Simple version for any SQL client
-- ============================================

-- TEST 1: BASIC COUNTS
SELECT '=== TEST 1: BASIC COUNTS ===' as test;
SELECT 
    (SELECT COUNT(*) FROM property) as total_properties,
    (SELECT COUNT(*) FROM media) as total_media_records,
    (SELECT COUNT(DISTINCT "ListingKey") FROM property) as unique_property_keys,
    (SELECT COUNT(DISTINCT "ResourceRecordKey") FROM media) as unique_media_keys;

-- TEST 2: KEY MATCHING
SELECT '=== TEST 2: MEDIA KEYS MATCHING PROPERTY KEYS ===' as test;
SELECT 
    COUNT(DISTINCT m."ResourceRecordKey") as media_keys_total,
    COUNT(DISTINCT m."ResourceRecordKey") FILTER (
        WHERE EXISTS (SELECT 1 FROM property p WHERE p."ListingKey" = m."ResourceRecordKey")
    ) as keys_with_match,
    COUNT(DISTINCT m."ResourceRecordKey") FILTER (
        WHERE NOT EXISTS (SELECT 1 FROM property p WHERE p."ListingKey" = m."ResourceRecordKey")
    ) as keys_without_match,
    ROUND(
        100.0 * COUNT(DISTINCT m."ResourceRecordKey") FILTER (
            WHERE EXISTS (SELECT 1 FROM property p WHERE p."ListingKey" = m."ResourceRecordKey")
        ) / NULLIF(COUNT(DISTINCT m."ResourceRecordKey"), 0), 2
    ) as pct_matched
FROM media m;

-- TEST 3: MEDIA DISTRIBUTION
SELECT '=== TEST 3: MEDIA DISTRIBUTION PER PROPERTY ===' as test;
WITH media_counts AS (
    SELECT 
        "ResourceRecordKey",
        COUNT(*) as media_count
    FROM media
    GROUP BY "ResourceRecordKey"
)
SELECT 
    MIN(media_count) as min_media,
    MAX(media_count) as max_media,
    ROUND(AVG(media_count), 2) as avg_media,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY media_count)::int as median_media,
    COUNT(*) as unique_keys_in_media
FROM media_counts;

-- TEST 4: TOP OFFENDERS
SELECT '=== TEST 4: TOP 10 KEYS WITH MOST MEDIA ===' as test;
SELECT 
    m."ResourceRecordKey",
    COUNT(*) as media_count,
    CASE 
        WHEN EXISTS (SELECT 1 FROM property p WHERE p."ListingKey" = m."ResourceRecordKey") 
        THEN 'YES' 
        ELSE 'NO' 
    END as exists_in_property
FROM media m
GROUP BY "ResourceRecordKey"
ORDER BY media_count DESC
LIMIT 10;

-- TEST 5A: PROPERTY KEY SAMPLES
SELECT '=== TEST 5A: PROPERTY KEY SAMPLES ===' as test;
SELECT "ListingKey" as sample_property_key, LENGTH("ListingKey") as key_length
FROM property
WHERE "ListingKey" IS NOT NULL
ORDER BY "ListingKey"
LIMIT 5;

-- TEST 5B: MEDIA KEY SAMPLES
SELECT '=== TEST 5B: MEDIA KEY SAMPLES ===' as test;
SELECT "ResourceRecordKey" as sample_media_key, LENGTH("ResourceRecordKey") as key_length
FROM media
WHERE "ResourceRecordKey" IS NOT NULL
ORDER BY "ResourceRecordKey"
LIMIT 5;

-- TEST 6: KEY MATCHING ISSUES
SELECT '=== TEST 6: KEY MATCHING ISSUES ===' as test;
WITH cleaned_comparison AS (
    SELECT 
        m."ResourceRecordKey",
        EXISTS (SELECT 1 FROM property p WHERE p."ListingKey" = m."ResourceRecordKey") as exact_match,
        EXISTS (SELECT 1 FROM property p WHERE UPPER(p."ListingKey") = UPPER(m."ResourceRecordKey")) as case_match,
        EXISTS (SELECT 1 FROM property p WHERE TRIM(p."ListingKey") = TRIM(m."ResourceRecordKey")) as trim_match
    FROM (SELECT DISTINCT "ResourceRecordKey" FROM media) m
)
SELECT 
    COUNT(*) as total_unique_media_keys,
    COUNT(*) FILTER (WHERE exact_match) as exact_matches,
    COUNT(*) FILTER (WHERE NOT exact_match AND case_match) as case_only_matches,
    COUNT(*) FILTER (WHERE NOT exact_match AND trim_match) as trim_only_matches,
    COUNT(*) FILTER (WHERE NOT exact_match AND NOT case_match AND NOT trim_match) as no_matches
FROM cleaned_comparison;

-- TEST 7: ACTUAL JOIN RESULTS
SELECT '=== TEST 7: ACTUAL PROPERTIES WITH MEDIA ===' as test;
SELECT 
    COUNT(DISTINCT p."ListingKey") as properties_with_media,
    COUNT(DISTINCT m."ResourceRecordKey") as media_keys_joined,
    COUNT(*) as total_joined_records
FROM property p
INNER JOIN media m ON p."ListingKey" = m."ResourceRecordKey";

-- TEST 8: DUPLICATE MEDIA CHECK
SELECT '=== TEST 8: DUPLICATE MEDIA ANALYSIS ===' as test;
WITH media_duplicates AS (
    SELECT 
        "ResourceRecordKey",
        "MediaURL",
        COUNT(*) as duplicate_count
    FROM media
    GROUP BY "ResourceRecordKey", "MediaURL"
    HAVING COUNT(*) > 1
)
SELECT 
    COUNT(*) as duplicate_url_groups,
    SUM(duplicate_count - 1) as extra_duplicate_records,
    MAX(duplicate_count) as max_duplicates_single_url
FROM media_duplicates;

-- TEST 9: DISTRIBUTION HISTOGRAM
SELECT '=== TEST 9: MEDIA COUNT DISTRIBUTION ===' as test;
WITH property_media_counts AS (
    SELECT 
        p."ListingKey",
        COUNT(m."MediaKey") as media_count
    FROM property p
    LEFT JOIN media m ON p."ListingKey" = m."ResourceRecordKey"
    GROUP BY p."ListingKey"
)
SELECT 
    CASE 
        WHEN media_count = 0 THEN '  0 media'
        WHEN media_count BETWEEN 1 AND 10 THEN '  1-10 media'
        WHEN media_count BETWEEN 11 AND 20 THEN ' 11-20 media'
        WHEN media_count BETWEEN 21 AND 30 THEN ' 21-30 media'
        WHEN media_count BETWEEN 31 AND 40 THEN ' 31-40 media'
        WHEN media_count BETWEEN 41 AND 50 THEN ' 41-50 media'
        WHEN media_count > 50 THEN ' 50+ media'
    END as media_range,
    COUNT(*) as property_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as pct_of_properties
FROM property_media_counts
GROUP BY media_range
ORDER BY 
    CASE 
        WHEN media_count = 0 THEN 1
        WHEN media_count BETWEEN 1 AND 10 THEN 2
        WHEN media_count BETWEEN 11 AND 20 THEN 3
        WHEN media_count BETWEEN 21 AND 30 THEN 4
        WHEN media_count BETWEEN 31 AND 40 THEN 5
        WHEN media_count BETWEEN 41 AND 50 THEN 6
        WHEN media_count > 50 THEN 7
    END;

-- TEST 10: DATA TYPE CHECK
SELECT '=== TEST 10: COLUMN DATA TYPES ===' as test;
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE 
    (table_name = 'property' AND column_name = 'ListingKey')
    OR (table_name = 'media' AND column_name = 'ResourceRecordKey')
ORDER BY table_name;

-- TEST 11: KEY LENGTH COMPARISON
SELECT '=== TEST 11: KEY LENGTH STATS ===' as test;
WITH length_check AS (
    SELECT 
        'Property' as source,
        MIN(LENGTH("ListingKey")) as min_length,
        MAX(LENGTH("ListingKey")) as max_length,
        AVG(LENGTH("ListingKey"))::numeric(10,2) as avg_length
    FROM property
    WHERE "ListingKey" IS NOT NULL
    UNION ALL
    SELECT 
        'Media' as source,
        MIN(LENGTH("ResourceRecordKey")) as min_length,
        MAX(LENGTH("ResourceRecordKey")) as max_length,
        AVG(LENGTH("ResourceRecordKey"))::numeric(10,2) as avg_length
    FROM media
    WHERE "ResourceRecordKey" IS NOT NULL
)
SELECT * FROM length_check;

-- TEST 12: SAMPLE UNMATCHED KEYS
SELECT '=== TEST 12: SAMPLE UNMATCHED MEDIA KEYS ===' as test;
SELECT 
    m."ResourceRecordKey" as unmatched_media_key,
    COUNT(*) as media_records_for_this_key
FROM media m
WHERE NOT EXISTS (
    SELECT 1 FROM property p 
    WHERE p."ListingKey" = m."ResourceRecordKey"
)
GROUP BY m."ResourceRecordKey"
ORDER BY COUNT(*) DESC
LIMIT 10;