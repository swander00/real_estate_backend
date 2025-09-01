// lib/syncMediaAll.js - Sync media for all properties (IDX and VOW)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { mapPropertyMedia } from '../mappers/mapPropertyMedia.js';

const DEBUG = true;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const FETCH_BATCH = 5000;
const UPSERT_BATCH = 500;

// Helpers
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));

/**
 * Get all ListingKeys from common_fields to validate against
 */
async function getAllListingKeys() {
  console.log('📋 Loading all ListingKeys from database...');
  const allKeys = new Set();
  let offset = 0;
  const limit = 10000;
  
  while (true) {
    const { data, error } = await supabase
      .from('common_fields')
      .select('ListingKey, DataSource')
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching listing keys:', error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    data.forEach(row => allKeys.add(row.ListingKey));
    console.log(`  Loaded ${offset + data.length} listings...`);
    
    if (data.length < limit) break;
    offset += limit;
  }
  
  console.log(`✅ Loaded ${allKeys.size} total ListingKeys from database`);
  return allKeys;
}

/**
 * Fetch media from API endpoint
 */
async function fetchMediaFromAPI(url, token, sourceType) {
  console.log(`\n🎬 Fetching ${sourceType} media from API...`);
  const allMedia = [];
  let skip = 0;
  let round = 1;
  
  while (true) {
    try {
      // Construct URL properly
      const separator = url.includes('?') ? '&' : '?';
      const fetchUrl = `${url}${separator}$top=${FETCH_BATCH}&$skip=${skip}`;
      
      console.log(`  Round ${round}: fetching skip=${skip}`);
      
      const response = await fetch(fetchUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`  ❌ API error: ${response.status} ${response.statusText}`);
        break;
      }
      
      const data = await response.json();
      const records = data.value || [];
      
      console.log(`    Received ${records.length} records`);
      
      if (records.length === 0) break;
      
      allMedia.push(...records);
      skip += FETCH_BATCH;
      round++;
      
      if (records.length < FETCH_BATCH) break;
      
      // Safety limit
      if (skip >= 500000) {
        console.log('  ⚠️ Reached safety limit of 500k records');
        break;
      }
      
      await sleep(100); // Be nice to the API
      
    } catch (error) {
      console.error(`  ❌ Fetch error:`, error.message);
      break;
    }
  }
  
  console.log(`✅ Fetched ${allMedia.length} total ${sourceType} media records`);
  return allMedia;
}

/**
 * Process and insert media batch
 */
async function processMediaBatch(mediaBatch, validListingKeys, stats) {
  // Map the media using the mapper
  const mapped = mediaBatch.map(item => mapPropertyMedia(item));
  
  // Filter: must have required fields AND ListingKey must exist in database
  const valid = mapped.filter(m => {
    if (!m.ResourceRecordKey || !m.MediaURL) {
      stats.invalidFields++;
      return false;
    }
    
    // Check if ListingKey exists in our valid set
    if (!m.ListingKey || !validListingKeys.has(m.ListingKey)) {
      stats.noParent++;
      return false;
    }
    
    return true;
  });
  
  if (valid.length === 0) return;
  
  // Upsert in chunks
  const chunks = chunk(valid, UPSERT_BATCH);
  for (const upsertChunk of chunks) {
    try {
      const { error } = await supabase
        .from('property_media')
        .upsert(upsertChunk, {
          onConflict: 'ResourceRecordKey,MediaURL',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`  Upsert error:`, error.message);
        stats.errors += upsertChunk.length;
      } else {
        stats.inserted += upsertChunk.length;
      }
    } catch (error) {
      console.error(`  Batch error:`, error.message);
      stats.errors += upsertChunk.length;
    }
  }
}

/**
 * Main sync function
 */
export async function syncMediaAll(options = {}) {
  const { clearExisting = false, idxOnly = false, vowOnly = false } = options;
  
  console.log('🚀 Starting Media Sync for All Properties');
  console.log(`Options: clearExisting=${clearExisting}, idxOnly=${idxOnly}, vowOnly=${vowOnly}`);
  
  // Get all valid ListingKeys from database
  const validListingKeys = await getAllListingKeys();
  
  if (validListingKeys.size === 0) {
    console.log('❌ No properties found in database. Run property sync first!');
    return;
  }
  
  // Clear existing media if requested
  if (clearExisting) {
    console.log('\n🧹 Clearing existing media...');
    const { error } = await supabase
      .from('property_media')
      .delete()
      .gte('MediaKey', '');
    
    if (error) {
      console.error('Clear error:', error);
    } else {
      console.log('✅ Existing media cleared');
    }
  }
  
  const stats = {
    totalFetched: 0,
    inserted: 0,
    noParent: 0,
    invalidFields: 0,
    errors: 0
  };
  
  // Fetch and process IDX media
  if (!vowOnly) {
    const idxMedia = await fetchMediaFromAPI(
      process.env.MEDIA_URL,
      process.env.IDX_TOKEN,
      'IDX'
    );
    
    stats.totalFetched += idxMedia.length;
    
    if (idxMedia.length > 0) {
      console.log('\n🔄 Processing IDX media...');
      const batches = chunk(idxMedia, 1000);
      let batchNum = 1;
      
      for (const batch of batches) {
        console.log(`  Batch ${batchNum}/${batches.length} (${batch.length} records)`);
        await processMediaBatch(batch, validListingKeys, stats);
        batchNum++;
      }
    }
  }
  
  // Fetch and process VOW media
  if (!idxOnly) {
    const vowMedia = await fetchMediaFromAPI(
      process.env.MEDIA_URL,
      process.env.VOW_TOKEN,
      'VOW'
    );
    
    stats.totalFetched += vowMedia.length;
    
    if (vowMedia.length > 0) {
      console.log('\n🔄 Processing VOW media...');
      const batches = chunk(vowMedia, 1000);
      let batchNum = 1;
      
      for (const batch of batches) {
        console.log(`  Batch ${batchNum}/${batches.length} (${batch.length} records)`);
        await processMediaBatch(batch, validListingKeys, stats);
        batchNum++;
      }
    }
  }
  
  // Final statistics
  console.log('\n📊 Final Statistics:');
  console.log(`Total fetched from APIs: ${stats.totalFetched}`);
  console.log(`Inserted to database: ${stats.inserted}`);
  console.log(`Dropped (no parent): ${stats.noParent}`);
  console.log(`Dropped (invalid fields): ${stats.invalidFields}`);
  console.log(`Errors: ${stats.errors}`);
  
  // Check coverage
  const { data: mediaCount } = await supabase
    .from('property_media')
    .select('ListingKey', { count: 'exact' })
    .limit(0);
  
  const { count: uniqueListings } = await supabase
    .from('property_media')
    .select('ListingKey', { count: 'exact', head: true })
    .not('ListingKey', 'is', null);
  
  console.log('\n📈 Coverage Report:');
  console.log(`Total properties in database: ${validListingKeys.size}`);
  console.log(`Properties with media: ~${Math.floor(stats.inserted / 30)}`); // Rough estimate
  console.log(`Estimated coverage: ${((stats.inserted / 30 / validListingKeys.size) * 100).toFixed(1)}%`);
  
  return stats;
}

// Run if executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const args = process.argv.slice(2);
  const options = {
    clearExisting: args.includes('--clear'),
    idxOnly: args.includes('--idx-only'),
    vowOnly: args.includes('--vow-only')
  };
  
  syncMediaAll(options)
    .then(stats => {
      console.log('\n✅ Media sync complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Media sync failed:', error);
      process.exit(1);
    });
}