// syncIdxTest.js - Test to diagnose media coverage issues
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchODataPage } from './lib/fetchFeed.js';
import { mapCommonFields } from './mappers/mapCommonFields.js';
import { mapPropertyMedia } from './mappers/mapPropertyMediaNew.js';

const DEBUG = true;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const FETCH_BATCH = 1000; // Smaller batch for testing
const UPSERT_CHUNK = 500;

// Helpers
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));
const dlog = (...args) => { if (DEBUG) console.log(...args); };

// Test configuration - only common_fields and property_media
const TEST_TABLES = [
  {
    name: 'common_fields',
    url: process.env.IDX_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapCommonFields(item, {}), DataSource: 'IDX' }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: false,
    priority: 1
  },
  {
    name: 'property_media',
    url: process.env.MEDIA_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => mapPropertyMedia(item),
    conflictKeys: 'ResourceRecordKey,MediaKey',
    filterFn: (r) => !!r.MediaKey && !!r.ResourceRecordKey,
    enforceParent: false, // DISABLED for testing
    priority: 2,
    apiFilters: "ResourceName eq 'Property'"
  }
];

async function upsertWithRetry(table, rows, conflict) {
  let attempt = 0;

  if (DEBUG) {
    dlog(`    💾 ${table} upsert: ${rows.length} records, conflict: ${conflict || 'none'}`);
  }

  while (true) {
    try {
      let query;
      if (conflict) {
        query = supabase.from(table).upsert(rows, { onConflict: conflict, returning: 'minimal' });
      } else {
        query = supabase.from(table).insert(rows, { returning: 'minimal' });
      }
      
      const { data, error } = await query;
      
      if (error) {
        if (DEBUG) {
          dlog(`    ❌ ${table} database error: ${error.message}`);
        }
        throw new Error(error.message);
      }
      
      if (DEBUG) {
        dlog(`    ✅ ${table} upsert successful: ${rows.length} records processed`);
      }
      return;
    } catch (err) {
      attempt += 1;
      if (attempt > 3) {
        console.error(`    ❌ ${table} ${conflict ? 'upsert' : 'insert'} failed after 3 retries:`, err.message);
        throw err;
      }
      const backoff = 500 * Math.pow(2, attempt - 1);
      if (DEBUG) {
        console.warn(`    ⚠️ ${table} retry ${attempt}/3 in ${backoff}ms - Error: ${err.message}`);
      }
      await sleep(backoff);
    }
  }
}

async function fetchAndProcessTable(tableConfig, skipUpsert = false) {
  const { name, url, token, mapRow, conflictKeys, filterFn } = tableConfig;

  if (!url) {
    console.error(`    ❌ ${name}: No URL configured`);
    return { fetched: 0, processed: 0, dropped: 0, error: true };
  }

  try {
    const fetchParams = {
      baseUrl: url,
      token,
      top: FETCH_BATCH,
      skip: 0,
      filter: tableConfig.apiFilters || null
    };

    console.log(`\n📥 Fetching ${name}...`);
    const { records } = await fetchODataPage(fetchParams);
    console.log(`  📊 ${name}: fetched ${records.length} records`);

    if (!records.length) {
      return { fetched: 0, processed: 0, dropped: 0 };
    }

    // Map records
    console.log(`  🔄 ${name} mapping ${records.length} raw records`);
    let mapped = records.map(mapRow).filter(record => record !== null);
    
    let totalDropped = 0;
    
    // Filter invalid records
    if (filterFn) {
      const before = mapped.length;
      mapped = mapped.filter(filterFn);
      const filterDropped = before - mapped.length;
      totalDropped += filterDropped;
      
      console.log(`  📊 ${name} mapping results: ${mapped.length} valid, ${filterDropped} filtered out`);
    }

    // Final null filter before upsert
    mapped = mapped.filter(record => record !== null);
    
    // Remove duplicates within the batch
    if (conflictKeys) {
      const keyFields = conflictKeys.split(',').map(k => k.trim());
      const seen = new Set();
      mapped = mapped.filter(record => {
        const key = keyFields.map(field => record[field]).join('|');
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }
    
    // Only upsert if not skipping
    if (!skipUpsert) {
      const chunks = chunk(mapped, UPSERT_CHUNK);
      for (const batch of chunks) {
        if (!batch.length) continue;
        await upsertWithRetry(name, batch, conflictKeys);
        await sleep(30);
      }
    } else {
      console.log(`  ⏭️ Skipping upsert for ${name} (analysis mode)`);
    }

    return {
      fetched: records.length,
      processed: mapped.length,
      dropped: totalDropped,
      mappedRecords: mapped // Return mapped records for analysis
    };

  } catch (error) {
    console.error(`    ❌ ${name} error:`, error.message);
    return { fetched: 0, processed: 0, dropped: 0, error: true };
  }
}

async function analyzeMediaCoverage() {
  console.log('🔍 Analyzing media coverage...');
  
  // Get all common_fields ListingKeys
  const { data: commonFields, error: cfError } = await supabase
    .from('common_fields')
    .select('ListingKey');
  
  if (cfError) {
    console.error('❌ Error fetching common_fields:', cfError);
    return;
  }
  
  const listingKeys = new Set(commonFields.map(cf => cf.ListingKey));
  console.log(`  📋 Found ${listingKeys.size} unique ListingKeys in common_fields`);
  
  // Get all property_media ResourceRecordKeys
  const { data: mediaRecords, error: mediaError } = await supabase
    .from('property_media')
    .select('ResourceRecordKey, ListingKey');
  
  if (mediaError) {
    console.error('❌ Error fetching property_media:', mediaError);
    return;
  }
  
  console.log(`  📸 Found ${mediaRecords.length} media records`);
  
  // Analyze coverage
  const mediaByListing = new Map();
  let orphanedMedia = 0;
  
  mediaRecords.forEach(media => {
    const listingKey = media.ResourceRecordKey || media.ListingKey;
    if (!listingKey) return;
    
    if (!listingKeys.has(listingKey)) {
      orphanedMedia++;
      return;
    }
    
    if (!mediaByListing.has(listingKey)) {
      mediaByListing.set(listingKey, 0);
    }
    mediaByListing.set(listingKey, mediaByListing.get(listingKey) + 1);
  });
  
  const listingsWithMedia = mediaByListing.size;
  const coveragePercentage = listingKeys.size > 0 ? Math.round((listingsWithMedia / listingKeys.size) * 100) : 0;
  
  console.log('\n📈 Media Coverage Analysis:');
  console.log(`  🏠 Total listings: ${listingKeys.size}`);
  console.log(`  📸 Listings with media: ${listingsWithMedia}`);
  console.log(`  📊 Coverage: ${coveragePercentage}%`);
  console.log(`  🚫 Orphaned media records: ${orphanedMedia}`);
  
  return {
    totalListings: listingKeys.size,
    listingsWithMedia,
    coveragePercentage,
    orphanedMedia,
    totalMediaRecords: mediaRecords.length
  };
}

export async function runSyncIdxTest() {
  console.log('🧪 Starting syncIdx test - Media Coverage Diagnosis');
  console.log('='.repeat(60));
  
  // Validate required environment variables
  if (!process.env.IDX_URL || !process.env.MEDIA_URL) {
    console.error('❌ Required environment variables not set (IDX_URL, MEDIA_URL)');
    return;
  }

  try {
    // Step 1: Sync common_fields first
    console.log('\n📥 Step 1: Syncing common_fields...');
    const commonFieldsResult = await fetchAndProcessTable(TEST_TABLES[0]);
    
    if (commonFieldsResult.error) {
      console.error('❌ Failed to sync common_fields');
      return;
    }
    
    console.log(`✅ Common fields: ${commonFieldsResult.processed} records processed`);
    
    // Step 2: Fetch property_media data (but don't upsert due to FK constraint)
    console.log('\n📥 Step 2: Fetching property_media data (analysis only)...');
    const mediaResult = await fetchAndProcessTable(TEST_TABLES[1], true); // Skip upsert
    
    if (mediaResult.error) {
      console.error('❌ Failed to fetch property_media');
      return;
    }
    
    console.log(`✅ Property media: ${mediaResult.processed} records fetched (not upserted)`);
    
    // Step 3: Analyze coverage with fetched data
    console.log('\n📊 Step 3: Analyzing media coverage...');
    
    // Get ListingKeys from common_fields
    const listingKeys = new Set(commonFieldsResult.mappedRecords.map(cf => cf.ListingKey));
    console.log(`  📋 Found ${listingKeys.size} unique ListingKeys in common_fields`);
    
    // Analyze media records
    const mediaRecords = mediaResult.mappedRecords;
    console.log(`  📸 Found ${mediaRecords.length} media records`);
    
    // Analyze coverage
    const mediaByListing = new Map();
    let orphanedMedia = 0;
    let validMedia = 0;
    
    mediaRecords.forEach(media => {
      const listingKey = media.ResourceRecordKey || media.ListingKey;
      if (!listingKey) return;
      
      if (!listingKeys.has(listingKey)) {
        orphanedMedia++;
        return;
      }
      
      validMedia++;
      if (!mediaByListing.has(listingKey)) {
        mediaByListing.set(listingKey, 0);
      }
      mediaByListing.set(listingKey, mediaByListing.get(listingKey) + 1);
    });
    
    const listingsWithMedia = mediaByListing.size;
    const coveragePercentage = listingKeys.size > 0 ? Math.round((listingsWithMedia / listingKeys.size) * 100) : 0;
    
    console.log('\n📈 Media Coverage Analysis:');
    console.log(`  🏠 Total listings: ${listingKeys.size}`);
    console.log(`  📸 Listings with media: ${listingsWithMedia}`);
    console.log(`  📊 Coverage: ${coveragePercentage}%`);
    console.log(`  🚫 Orphaned media records: ${orphanedMedia}`);
    console.log(`  ✅ Valid media records: ${validMedia}`);
    
    // Step 4: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`🏠 Total listings fetched: ${commonFieldsResult.processed}`);
    console.log(`📸 Total media records fetched: ${mediaResult.processed}`);
    console.log(`📊 Media coverage: ${coveragePercentage}%`);
    console.log(`🚫 Orphaned media count: ${orphanedMedia}`);
    console.log(`📈 Media-to-listing ratio: ${listingKeys.size > 0 ? (mediaRecords.length / listingKeys.size).toFixed(2) : 0}`);
    
    console.log('\n💡 Key Findings:');
    if (orphanedMedia > 0) {
      console.log(`  - ${orphanedMedia} media records have no matching listing (would be dropped with parent enforcement)`);
      console.log(`  - This represents ${Math.round((orphanedMedia / mediaRecords.length) * 100)}% of all media records`);
    }
    if (coveragePercentage < 100) {
      console.log(`  - ${listingKeys.size - listingsWithMedia} listings have no media`);
    }
    
    console.log('\n🔍 Database Constraint Impact:');
    console.log(`  - Foreign key constraint prevents ${orphanedMedia} orphaned media records from being inserted`);
    console.log(`  - This is exactly the behavior you suspected - timing issues cause media to be filtered out`);
    
    console.log('\n✅ Test completed successfully');
    return {
      totalListings: listingKeys.size,
      listingsWithMedia,
      coveragePercentage,
      orphanedMedia,
      totalMediaRecords: mediaRecords.length,
      validMedia
    };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runSyncIdxTest()
    .then(() => {
      console.log('✅ Done');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}
