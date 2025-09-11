#!/usr/bin/env node

// test_optimized_media_sync.js - Test the optimized media sync with filters
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchODataPage } from './lib/fetchFeed.js';
import { mapPropertyMedia } from './mappers/mapPropertyMediaNew.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testOptimizedMediaSync() {
  try {
    console.log('🧪 Testing Optimized Media Sync (Largest Images Only)');
    console.log('====================================================');
    
    // Step 1: Clear existing media data to test fresh
    console.log('\n1️⃣ Clearing existing media data...');
    const { count: beforeCount, error: beforeError } = await supabase
      .from('property_media')
      .select('*', { count: 'exact', head: true });
    
    if (beforeError) {
      console.error('❌ Error getting count:', beforeError);
      return;
    }
    
    console.log(`📊 Current media records: ${beforeCount}`);
    
    // Step 2: Test the optimized API call with filters
    console.log('\n2️⃣ Testing optimized API call with filters...');
    
    const { data: mediaData, error: fetchError } = await fetchODataPage({
      baseUrl: process.env.IDX_MEDIA_URL,
      token: process.env.IDX_TOKEN,
      skip: 0,
      top: 20, // Small batch for testing
      filter: "ResourceName eq 'Property' and ImageSizeDescription eq 'Largest'"
    });
    
    if (fetchError) {
      console.error('❌ API Error:', fetchError);
      return;
    }
    
    if (!mediaData || !mediaData.value) {
      console.log('⚠️  No data structure returned');
      return;
    }
    
    console.log(`✅ API connected successfully with filters`);
    console.log(`📊 Records returned: ${mediaData.value.length}`);
    
    if (mediaData.value.length === 0) {
      console.log('⚠️  No media records found with filters');
      console.log('🔍 This could mean:');
      console.log('  - No Largest images available');
      console.log('  - Filter syntax issue');
      console.log('  - API endpoint differences');
      return;
    }
    
    // Step 3: Analyze the filtered data
    console.log('\n3️⃣ Analyzing filtered data...');
    
    const imageSizes = {};
    const categories = {};
    const permissions = {};
    
    mediaData.value.forEach(item => {
      // Check image sizes
      const size = item.ImageSizeDescription || 'Unknown';
      imageSizes[size] = (imageSizes[size] || 0) + 1;
      
      // Check categories
      const category = item.MediaCategory || 'Unknown';
      categories[category] = (categories[category] || 0) + 1;
      
      // Check permissions
      const permission = item.Permission ? JSON.stringify(item.Permission) : 'null';
      permissions[permission] = (permissions[permission] || 0) + 1;
    });
    
    console.log('📏 Image Sizes:');
    Object.entries(imageSizes).forEach(([size, count]) => {
      console.log(`  ${size}: ${count} records`);
    });
    
    console.log('📂 Categories:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} records`);
    });
    
    console.log('🔐 Permissions:');
    Object.entries(permissions).forEach(([perm, count]) => {
      console.log(`  ${perm}: ${count} records`);
    });
    
    // Step 4: Test mapper with filtered data
    console.log('\n4️⃣ Testing mapper with filtered data...');
    
    const mappedRecords = [];
    for (let i = 0; i < Math.min(5, mediaData.value.length); i++) {
      const item = mediaData.value[i];
      try {
        const mapped = mapPropertyMedia(item);
        if (mapped) {
          mappedRecords.push(mapped);
          console.log(`✅ Mapped record ${i + 1}: ${mapped.MediaKey}`);
          console.log(`   ResourceRecordKey: ${mapped.ResourceRecordKey}`);
          console.log(`   ImageSizeDescription: ${mapped.ImageSizeDescription}`);
          console.log(`   Permission: ${mapped.Permission ? JSON.stringify(mapped.Permission) : 'null'}`);
        } else {
          console.log(`⚠️  Skipped record ${i + 1}: Missing required fields`);
        }
      } catch (error) {
        console.log(`❌ Mapping error for record ${i + 1}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Mapping Results: ${mappedRecords.length} records mapped`);
    
    // Step 5: Test database upsert
    if (mappedRecords.length > 0) {
      console.log('\n5️⃣ Testing database upsert...');
      
      try {
        const { data: upsertData, error: upsertError } = await supabase
          .from('property_media')
          .upsert(mappedRecords, {
            onConflict: 'ResourceRecordKey,MediaKey',
            returning: 'minimal'
          });
        
        if (upsertError) {
          console.error('❌ Upsert error:', upsertError);
          return;
        }
        
        console.log(`✅ Successfully upserted ${mappedRecords.length} records`);
        
        // Verify
        const { count: afterCount, error: afterError } = await supabase
          .from('property_media')
          .select('*', { count: 'exact', head: true });
        
        if (!afterError) {
          console.log(`📊 Total media records in database: ${afterCount}`);
          console.log(`📈 Records added: ${afterCount - beforeCount}`);
        }
        
      } catch (error) {
        console.error('❌ Database error:', error);
        return;
      }
    }
    
    console.log('\n🎉 Optimized media sync test completed!');
    console.log('\n📋 Test Summary:');
    console.log(`  ✅ API fetch with filters: ${mediaData.value.length} records`);
    console.log(`  ✅ Mapping: ${mappedRecords.length} records`);
    console.log(`  ✅ Database upsert: ${mappedRecords.length} records`);
    console.log(`  ✅ Filter effectiveness: ${imageSizes['Largest'] || 0} Largest images`);
    
  } catch (error) {
    console.error('❌ Test error:', error);
    console.error('Stack trace:', error.stack);
  }
}

testOptimizedMediaSync();

