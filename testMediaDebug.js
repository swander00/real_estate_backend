// testMediaDebug.js - Debug why some properties have media and others don't
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Test MLS numbers from the screenshot
const TEST_LISTINGS = [
  'W12271117', // No image - 111 Iceland Poppy Trl
  'X12371013', // Has image - 292 Laurier Ave
  'S12371010', // Has image - 8 Culinary Ln
  'E12310667'  // No image - 3251 Brigadier Ave
];

async function investigateListing(mlsNumber) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Investigating MLS# ${mlsNumber}`);
  console.log('='.repeat(60));
  
  // 1. Check if listing exists in common_fields
  const { data: commonField, error: cfError } = await supabase
    .from('common_fields')
    .select('ListingKey, ListingId, PropertyType, StandardStatus, ModificationTimestamp')
    .or(`ListingKey.eq.${mlsNumber},ListingId.eq.${mlsNumber}`)
    .single();
    
  if (cfError || !commonField) {
    console.log(`❌ NOT FOUND in common_fields`);
    console.log(`   Error: ${cfError?.message || 'No data'}`);
    
    // Try partial match
    const { data: partialMatch } = await supabase
      .from('common_fields')
      .select('ListingKey, ListingId')
      .like('ListingKey', `%${mlsNumber}%`)
      .limit(5);
      
    if (partialMatch?.length) {
      console.log(`   Partial matches found:`);
      partialMatch.forEach(m => console.log(`     - ListingKey: ${m.ListingKey}, ListingId: ${m.ListingId}`));
    }
    return;
  }
  
  console.log(`✅ FOUND in common_fields:`);
  console.log(`   ListingKey: ${commonField.ListingKey}`);
  console.log(`   ListingId: ${commonField.ListingId}`);
  console.log(`   PropertyType: ${commonField.PropertyType}`);
  console.log(`   Status: ${commonField.StandardStatus}`);
  
  // 2. Check property_media using different key patterns
  const possibleKeys = [
    mlsNumber,
    commonField.ListingKey,
    commonField.ListingId,
    `Property:${mlsNumber}`,
    `Listing:${mlsNumber}`
  ].filter(Boolean);
  
  console.log(`\n📸 Checking property_media with keys: ${possibleKeys.join(', ')}`);
  
  // Check by ListingKey
  const { data: mediaByListing, error: mlError } = await supabase
    .from('property_media')
    .select('MediaKey, ListingKey, ResourceRecordKey, MediaURL, Order, PreferredPhotoYN')
    .in('ListingKey', possibleKeys)
    .limit(5);
    
  if (mediaByListing?.length) {
    console.log(`✅ Found ${mediaByListing.length} media by ListingKey`);
    mediaByListing.forEach(m => {
      console.log(`   - MediaKey: ${m.MediaKey}`);
      console.log(`     ListingKey: ${m.ListingKey}`);
      console.log(`     RRK: ${m.ResourceRecordKey}`);
      console.log(`     Order: ${m.Order}, Preferred: ${m.PreferredPhotoYN}`);
    });
  } else {
    console.log(`❌ No media found by ListingKey`);
  }
  
  // Check by ResourceRecordKey
  const { data: mediaByRRK } = await supabase
    .from('property_media')
    .select('MediaKey, ListingKey, ResourceRecordKey, MediaURL, Order')
    .in('ResourceRecordKey', possibleKeys)
    .limit(5);
    
  if (mediaByRRK?.length) {
    console.log(`\n✅ Found ${mediaByRRK.length} media by ResourceRecordKey`);
    mediaByRRK.forEach(m => {
      console.log(`   - RRK: ${m.ResourceRecordKey}`);
      console.log(`     ListingKey: ${m.ListingKey} ${m.ListingKey === commonField.ListingKey ? '✅ MATCHES' : '❌ MISMATCH'}`);
    });
  } else {
    console.log(`❌ No media found by ResourceRecordKey`);
  }
  
  // 3. Check for orphaned media (wrong ListingKey format)
  const { data: orphanedMedia } = await supabase
    .from('property_media')
    .select('ListingKey, ResourceRecordKey, count')
    .like('ResourceRecordKey', `%${mlsNumber.substring(1)}%`) // Search without prefix
    .limit(5);
    
  if (orphanedMedia?.length) {
    console.log(`\n⚠️  Possible orphaned media found (partial RRK match):`);
    orphanedMedia.forEach(m => {
      console.log(`   - RRK: ${m.ResourceRecordKey}, ListingKey: ${m.ListingKey}`);
    });
  }
  
  // 4. Direct API test - fetch from media endpoint
  console.log(`\n🔍 Testing direct API fetch for ${mlsNumber}...`);
  try {
    const response = await fetch(
      `${process.env.MEDIA_URL}?$filter=ResourceRecordKey eq '${mlsNumber}'&$top=1`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.IDX_TOKEN}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.value?.length) {
        console.log(`✅ API has ${data.value.length} media record(s)`);
        const sample = data.value[0];
        console.log(`   Sample: RRK=${sample.ResourceRecordKey}, MediaKey=${sample.MediaKey}`);
      } else {
        console.log(`❌ API returned no media for this listing`);
      }
    }
  } catch (apiError) {
    console.log(`❌ API fetch failed: ${apiError.message}`);
  }
}

async function main() {
  console.log('🔍 Media Debug Investigation');
  console.log(`Testing ${TEST_LISTINGS.length} listings\n`);
  
  for (const mls of TEST_LISTINGS) {
    await investigateListing(mls);
  }
  
  // Summary query
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 SUMMARY STATISTICS');
  console.log('='.repeat(60));
  
  const { count: totalCommon } = await supabase
    .from('common_fields')
    .select('*', { count: 'exact', head: true });
    
  const { count: totalMedia } = await supabase
    .from('property_media')
    .select('*', { count: 'exact', head: true });
    
  const { data: mediaStats } = await supabase
    .from('property_media')
    .select('ListingKey')
    .not('ListingKey', 'is', null);
    
  const uniqueListingsWithMedia = new Set(mediaStats?.map(m => m.ListingKey) || []);
  
  console.log(`Total listings in common_fields: ${totalCommon}`);
  console.log(`Total media records: ${totalMedia}`);
  console.log(`Unique listings with media: ${uniqueListingsWithMedia.size}`);
  console.log(`Coverage: ${((uniqueListingsWithMedia.size / totalCommon) * 100).toFixed(1)}%`);
  
  // Sample mismatches
  console.log(`\n🔍 Checking for ListingKey format patterns...`);
  const { data: sampleMedia } = await supabase
    .from('property_media')
    .select('ListingKey, ResourceRecordKey')
    .limit(20);
    
  const patterns = {};
  sampleMedia?.forEach(m => {
    const pattern = m.ListingKey === m.ResourceRecordKey ? 'SAME' : 
                    !m.ListingKey ? 'NULL' : 'DIFFERENT';
    patterns[pattern] = (patterns[pattern] || 0) + 1;
  });
  
  console.log('ListingKey vs ResourceRecordKey patterns:');
  Object.entries(patterns).forEach(([pattern, count]) => {
    console.log(`  ${pattern}: ${count}`);
  });
}

main()
  .then(() => {
    console.log('\n✅ Debug investigation complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });