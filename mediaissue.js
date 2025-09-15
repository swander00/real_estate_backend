-- ============================================
-- MEDIA-PROPERTY RELATIONSHIP DEBUG SCRIPT
-- ============================================
-- Run this entire script to diagnose media linkage issues
-- Results will be output in order with clear labels

\echo '=========================================='
\echo 'MEDIA-PROPERTY RELATIONSHIP DEBUG REPORT'
\echo '=========================================='
\echo ''

-- ============================================
-- TEST 1: BASIC COUNTS
-- ============================================
\echo '1. BASIC COUNTS AND OVERVIEW'
\echo '-----------------------------'

SELECT 
    (SELECT COUNT(*) FROM property) as total_properties,
    (SELECT COUNT(*) FROM media) as total_media_records,
    (SELECT COUNT(DISTINCT "ListingKey") FROM property) as unique_property_keys,
    (SELECT COUNT(DISTINCT "ResourceRecordKey") FROM media) as unique_media_keys;

\echo ''

-- ============================================
-- TEST 2: KEY MATCHING
-- ============================================
\echo '2. MEDIA KEYS MATCHING PROPERTY KEYS'
\echo '-------------------------------------'

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

\echo ''

-- ============================================
-- TEST 3: MEDIA DISTRIBUTION
-- ============================================
\echo '3. MEDIA DISTRIBUTION PER PROPERTY'
\echo '-----------------------------------'

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

\echo ''

-- ============================================
-- TEST 4: TOP OFFENDERS
-- ============================================
\echo '4. TOP 10 KEYS WITH MOST MEDIA RECORDS'
\echo '---------------------------------------'

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

\echo ''

-- ============================================
-- TEST 5: KEY FORMAT COMPARISON
-- ============================================
\echo '5. SAMPLE KEY FORMATS COMPARISON'
\echo '---------------------------------'
\echo 'Property ListingKey samples:'

SELECT "ListingKey" as sample_property_key
FROM property
WHERE "ListingKey" IS NOT NULL
ORDER BY "ListingKey"
LIMIT 5;

\echo ''
\echo 'Media ResourceRecordKey samples:'

SELECT "ResourceRecordKey" as sample_media_key
FROM media
WHERE "ResourceRecordKey" IS NOT NULL
ORDER BY "ResourceRecordKey"
LIMIT 5;

\echo ''

-- ============================================
-- TEST 6: KEY MATCHING ISSUES
-- ============================================
\echo '6. POTENTIAL KEY MATCHING ISSUES'
\echo '---------------------------------'

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

\echo ''

-- ============================================
-- TEST 7: ACTUAL JOIN RESULTS
-- ============================================
\echo '7. ACTUAL PROPERTIES WITH MEDIA (VIA JOIN)'
\echo '-------------------------------------------'

SELECT 
    COUNT(DISTINCT p."ListingKey") as properties_with_media,
    COUNT(DISTINCT m."ResourceRecordKey") as media_keys_joined,
    COUNT(*) as total_joined_records
FROM property p
INNER JOIN media m ON p."ListingKey" = m."ResourceRecordKey";

\echo ''

-- ============================================
-- TEST 8: DUPLICATE MEDIA CHECK
-- ============================================
\echo '8. DUPLICATE MEDIA ANALYSIS'
\echo '----------------------------'

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

\echo ''

-- ============================================
-- TEST 9: DISTRIBUTION HISTOGRAM
-- ============================================
\echo '9. MEDIA COUNT DISTRIBUTION HISTOGRAM'
\echo '--------------------------------------'

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

\echo ''

-- ============================================
-- TEST 10: DATA TYPE CHECK
-- ============================================
\echo '10. COLUMN DATA TYPE COMPARISON'
\echo '--------------------------------'

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

\echo ''

-- ============================================
-- TEST 11: CHECK FOR LEADING/TRAILING ISSUES
-- ============================================
\echo '11. CHECKING FOR LENGTH DIFFERENCES'
\echo '------------------------------------'

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

\echo ''

-- ============================================
-- TEST 12: SAMPLE MISMATCHED KEYS
-- ============================================
\echo '12. SAMPLE OF UNMATCHED MEDIA KEYS'
\echo '-----------------------------------'

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

\echo ''

-- ============================================
-- SUMMARY
-- ============================================
\echo '=========================================='
\echo 'END OF DEBUG REPORT'
\echo '=========================================='
\echo ''
\echo 'Key findings will be evident from the above tests.'
\echo 'Look especially at:'
\echo '  - Test 2: How many media keys match property keys'
\echo '  - Test 5: Whether key formats look similar'
\echo '  - Test 9: The distribution histogram'
\echo '  - Test 12: Examples of unmatched keys'
\echo ''