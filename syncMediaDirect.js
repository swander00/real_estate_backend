// syncMediaDirect.js - Direct media sync bypassing coordinated sync
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { mapPropertyMedia } from './mappers/mapPropertyMedia.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const FETCH_BATCH = 5000;
const UPSERT_BATCH = 500;

async function fetchAllMedia() {
  console.log('🎬 Starting direct media fetch from API...');
  let allMedia = [];
  let skip = 0;
  let hasMore = true;
  
  while (hasMore) {
    try {
      const url = `${process.env.MEDIA_URL}?$top=${FETCH_BATCH}&$skip=${skip}&$orderby=ModificationTimestamp desc`;
      console.log(`Fetching batch: skip=${skip}, url=${url.substring(0, 100)}...`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${process.env.IDX_TOKEN}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        break;
      }
      
      const data = await response.json();
      const records = data.value || [];
      
      console.log(`  Fetched ${records.length} records`);
      
      if (records.length === 0) {
        hasMore = false;
      } else {
        allMedia = allMedia.concat(records);
        skip += FETCH_BATCH;
        
        if (records.length < FETCH_BATCH) {
          hasMore = false;
        }
      }
      
      // Safety limit for testing
      if (skip >= 50000) {
        console.log('⚠️ Reached 50k limit for safety');
        hasMore = false;
      }
      
    } catch (error) {
      console.error('Fetch error:', error);
      hasMore = false;
    }
  }
  
  console.log(`✅ Fetched total of ${allMedia.length} media records`);
  return allMedia;
}

async function analyzeMediaKeys(media) {
  console.log('\n📊 Analyzing media keys...');
  
  const samples = media.slice(0, 10);
  console.log('Sample records:');
  samples.forEach((m, i) => {
    console.log(`  ${i + 1}. RRK: ${m.ResourceRecordKey}, MediaKey: ${m.MediaKey || 'NULL'}`);
  });
  
  // Count unique ResourceRecordKeys
  const uniqueRRKs = new Set(media.map(m => m.ResourceRecordKey));
  console.log(`\nUnique ResourceRecordKeys: ${uniqueRRKs.size}`);
  
  // Check which RRKs exist in common_fields
  const rrkSample = Array.from(uniqueRRKs).slice(0, 100);
  const { data: existingListings } = await supabase
    .from('common_fields')
    .select('ListingKey')
    .in('ListingKey', rrkSample);
  
  const existingKeys = new Set(existingListings?.map(l => l.ListingKey) || []);
  const matchRate = (existingKeys.size / rrkSample.length) * 100;
  
  console.log(`Sample match rate: ${existingKeys.size}/${rrkSample.length} (${matchRate.toFixed(1)}%)`);
  
  return { uniqueRRKs, existingKeys };
}

async function syncMediaBatch(batch) {
  // Map the media records
  const mapped = batch.map(item => mapPropertyMedia(item));
  
  // Filter valid records (must have RRK and MediaURL at minimum)
  const valid = mapped.filter(m => m.ResourceRecordKey && m.MediaURL);
  
  if (valid.length === 0) return 0;
  
  // Split into chunks for upsert
  const chunks = [];
  for (let i = 0; i < valid.length; i += UPSERT_BATCH) {
    chunks.push(valid.slice(i, i + UPSERT_BATCH));
  }
  
  let successCount = 0;
  for (const chunk of chunks) {
    try {
      const { error } = await supabase
        .from('property_media')
        .upsert(chunk, {
          onConflict: 'ResourceRecordKey,MediaURL',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`Upsert error: ${error.message}`);
      } else {
        successCount += chunk.length;
      }
    } catch (error) {
      console.error(`Batch error: ${error.message}`);
    }
  }
  
  return successCount;
}

async function main() {
  console.log('🚀 Direct Media Sync Tool');
  console.log('=' .repeat(60));
  
  // 1. Fetch all media from API
  const allMedia = await fetchAllMedia();
  
  if (allMedia.length === 0) {
    console.log('❌ No media fetched from API');
    return;
  }
  
  // 2. Analyze the data
  const { uniqueRRKs } = await analyzeMediaKeys(allMedia);
  
  // 3. Clear existing media (optional - comment out to append)
  const clearExisting = process.argv.includes('--clear');
  if (clearExisting) {
    console.log('\n🧹 Clearing existing media...');
    const { error } = await supabase
      .from('property_media')
      .delete()
      .gte('MediaKey', ''); // Delete all
    
    if (error) {
      console.error('Clear error:', error);
    } else {
      console.log('✅ Existing media cleared');
    }
  }
  
  // 4. Insert media in batches
  console.log(`\n📥 Inserting ${allMedia.length} media records...`);
  
  let totalInserted = 0;
  const batchSize = 1000;
  
  for (let i = 0; i < allMedia.length; i += batchSize) {
    const batch = allMedia.slice(i, i + batchSize);
    const inserted = await syncMediaBatch(batch);
    totalInserted += inserted;
    console.log(`  Progress: ${i + batch.length}/${allMedia.length} (${inserted} inserted)`);
  }
  
  // 5. Final verification
  console.log('\n📊 Final Statistics:');
  console.log(`Total fetched from API: ${allMedia.length}`);
  console.log(`Total inserted to DB: ${totalInserted}`);
  console.log(`Unique listings: ${uniqueRRKs.size}`);
  
  // Check coverage
  const { count: totalListings } = await supabase
    .from('common_fields')
    .select('*', { count: 'exact', head: true });
  
  const { data: mediaStats } = await supabase
    .from('property_media')
    .select('ListingKey')
    .not('ListingKey', 'is', null);
  
  const uniqueListingsWithMedia = new Set(mediaStats?.map(m => m.ListingKey) || []);
  
  console.log(`\n📈 Coverage Report:`);
  console.log(`Total listings: ${totalListings}`);
  console.log(`Listings with media: ${uniqueListingsWithMedia.size}`);
  console.log(`Coverage: ${((uniqueListingsWithMedia.size / totalListings) * 100).toFixed(1)}%`);
}

main()
  .then(() => {
    console.log('\n✅ Direct media sync complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });