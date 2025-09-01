// lib/syncMediaIdx.js - Sync media for IDX properties only
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
 * Get all IDX ListingKeys from common_fields
 */
async function getIdxListingKeys() {
  console.log('📋 Loading IDX ListingKeys from database...');
  const allKeys = new Set();
  let offset = 0;
  const limit = 10000;
  
  while (true) {
    const { data, error } = await supabase
      .from('common_fields')
      .select('ListingKey')
      .eq('DataSource', 'IDX')
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching listing keys:', error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    data.forEach(row => allKeys.add(row.ListingKey));
    
    if (data.length < limit) break;
    offset += limit;
  }
  
  console.log(`✅ Loaded ${allKeys.size} IDX ListingKeys`);
  return allKeys;
}

/**
 * Fetch media from IDX API
 */
async function fetchIdxMedia() {
  console.log('\n🎬 Fetching IDX media from API...');
  const allMedia = [];
  let skip = 0;
  let round = 1;
  const maxRounds = 100; // Safety limit
  
  while (round <= maxRounds) {
    try {
      const url = process.env.IDX_MEDIA_URL;  // Using IDX-specific media URL
      const separator = url.includes('?') ? '&' : '?';
      const fetchUrl = `${url}${separator}$top=${FETCH_BATCH}&$skip=${skip}`;
      
      console.log(`  Round ${round}: skip=${skip}`);
      
      const response = await fetch(fetchUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.IDX_TOKEN}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (skip === 0) {
          console.error(`  ❌ API error on first request: ${response.status} ${response.statusText}`);
          console.error(`  URL: ${fetchUrl}`);
        }
        break;
      }
      
      const data = await response.json();
      const records = data.value || [];
      
      console.log(`    Received ${records.length} records`);
      
      // Debug first record structure on first round
      if (records.length > 0 && round === 1 && DEBUG) {
        console.log('\n🔍 Sample media record structure:');
        const sample = records[0];
        console.log('  Key fields:');
        console.log(`    ListingKey: ${sample.ListingKey}`);
        console.log(`    ResourceRecordKey: ${sample.ResourceRecordKey}`);
        console.log(`    MediaURL: ${sample.MediaURL}`);
      }
      
      if (records.length === 0) break;
      
      allMedia.push(...records);
      
      if (records.length < FETCH_BATCH) break;
      
      skip += FETCH_BATCH;
      round++;
      
      await sleep(100);
      
    } catch (error) {
      console.error(`  ❌ Fetch error:`, error.message);
      break;
    }
  }
  
  console.log(`✅ Fetched ${allMedia.length} total IDX media records`);
  return allMedia;
}

/**
 * Process and insert media batch
 */
async function processMediaBatch(mediaBatch, validListingKeys, stats) {
  // Map the media
  const mapped = mediaBatch.map(item => mapPropertyMedia(item));
  
  // Debug sample of mapped data
  if (stats.totalFetched === 0 && mapped.length > 0 && DEBUG) {
    console.log('\n🔍 Sample mapped media:');
    const sample = mapped[0];
    console.log(`  ListingKey: ${sample.ListingKey}`);
    console.log(`  Is in valid keys: ${validListingKeys.has(sample.ListingKey)}`);
  }
  
  // Filter valid records
  const valid = mapped.filter(m => {
    if (!m.ResourceRecordKey || !m.MediaURL) {
      stats.invalidFields++;
      return false;
    }
    
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
export async function syncMediaIdx(options = {}) {
  const { clearExisting = false } = options;
  
  console.log('🚀 Starting IDX Media Sync');
  console.log(`Options: clearExisting=${clearExisting}`);
  
  // Validate environment
  if (!process.env.IDX_MEDIA_URL) {
    console.error('❌ IDX_MEDIA_URL environment variable is not set');
    return;
  }
  
  // Get IDX ListingKeys
  const validListingKeys = await getIdxListingKeys();
  
  if (validListingKeys.size === 0) {
    console.log('❌ No IDX properties found. Run syncListingsIdx.js first!');
    return;
  }
  
  // Clear existing if requested
  if (clearExisting) {
    console.log('\n🧹 Clearing existing IDX media...');
    const keysArray = Array.from(validListingKeys);
    const keyChunks = chunk(keysArray, 1000);
    
    for (const keys of keyChunks) {
      const { error } = await supabase
        .from('property_media')
        .delete()
        .in('ListingKey', keys);
      
      if (error) {
        console.error('Clear error:', error);
      }
    }
    console.log('✅ Existing IDX media cleared');
  }
  
  const stats = {
    totalFetched: 0,
    inserted: 0,
    noParent: 0,
    invalidFields: 0,
    errors: 0
  };
  
  // Fetch IDX media
  const idxMedia = await fetchIdxMedia();
  stats.totalFetched = idxMedia.length;
  
  if (idxMedia.length > 0) {
    console.log('\n📄 Processing IDX media...');
    const batches = chunk(idxMedia, 1000);
    
    for (let i = 0; i < batches.length; i++) {
      console.log(`  Batch ${i + 1}/${batches.length} (${batches[i].length} records)`);
      await processMediaBatch(batches[i], validListingKeys, stats);
    }
  }
  
  // Final statistics
  console.log('\n📊 Final Statistics:');
  console.log(`IDX properties in database: ${validListingKeys.size}`);
  console.log(`Total media fetched: ${stats.totalFetched}`);
  console.log(`Inserted to database: ${stats.inserted}`);
  console.log(`Dropped (no parent): ${stats.noParent}`);
  console.log(`Dropped (invalid fields): ${stats.invalidFields}`);
  console.log(`Errors: ${stats.errors}`);
  
  // Calculate coverage
  const uniqueListingsWithMedia = new Set();
  const mediaBatches = chunk(Array.from(validListingKeys), 1000);
  
  for (const keys of mediaBatches) {
    const { data } = await supabase
      .from('property_media')
      .select('ListingKey')
      .in('ListingKey', keys)
      .limit(1000);
    
    if (data) {
      data.forEach(row => uniqueListingsWithMedia.add(row.ListingKey));
    }
  }
  
  console.log('\n📈 Coverage Report:');
  console.log(`Properties with media: ${uniqueListingsWithMedia.size}/${validListingKeys.size}`);
  console.log(`Coverage: ${((uniqueListingsWithMedia.size / validListingKeys.size) * 100).toFixed(1)}%`);
  
  // Warning if coverage is very low
  if (uniqueListingsWithMedia.size / validListingKeys.size < 0.1) {
    console.log('\n⚠️  Warning: Very low media coverage (<10%)');
    console.log('   Possible issues:');
    console.log('   - ListingKey format mismatch between properties and media');
    console.log('   - Media API might be returning different data than expected');
    console.log('   - Check the mapPropertyMedia function');
  }
  
  return stats;
}

// Run if executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const args = process.argv.slice(2);
  const options = {
    clearExisting: args.includes('--clear')
  };
  
  syncMediaIdx(options)
    .then(stats => {
      console.log('\n✅ IDX media sync complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ IDX media sync failed:', error);
      process.exit(1);
    });
}