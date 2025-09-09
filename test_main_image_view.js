#!/usr/bin/env node

// test_main_image_view.js - Test the main_image view
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testMainImageView() {
  try {
    console.log('🔍 Testing main_image View');
    console.log('==========================');
    console.log('');

    // 1. Test basic view functionality
    console.log('📊 Basic View Test:');
    
    const { data: viewData, error: viewError } = await supabase
      .from('main_image')
      .select('*')
      .limit(5);
    
    if (viewError) {
      console.error('❌ Error querying main_image view:', viewError);
      return;
    }
    
    console.log(`  📸 Found ${viewData?.length || 0} primary images`);
    
    if (viewData && viewData.length > 0) {
      console.log('  📋 Sample primary images:');
      viewData.forEach((image, idx) => {
        console.log(`    ${idx + 1}. ${image.ListingKey}: ${image.UnparsedAddress || 'N/A'}`);
        console.log(`       MediaURL: ${image.MediaURL?.substring(0, 80)}...`);
        console.log(`       MediaType: ${image.MediaType}, Category: ${image.MediaCategory}`);
        console.log(`       ResourceRecordKey: ${image.ResourceRecordKey}`);
        console.log('');
      });
    }
    console.log('');

    // 2. Test view count vs expected count
    console.log('📈 Count Comparison:');
    
    const { count: viewCount, error: countError } = await supabase
      .from('main_image')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error getting view count:', countError);
    } else {
      console.log(`  📊 Total primary images in view: ${viewCount}`);
    }
    console.log('');

    // 3. Test specific property
    console.log('🎯 Specific Property Test:');
    
    const { data: specificImage, error: specificError } = await supabase
      .from('main_image')
      .select('*')
      .eq('ListingKey', 'C12279832')
      .single();
    
    if (specificError) {
      console.error('❌ Error getting specific property image:', specificError);
    } else if (specificImage) {
      console.log(`  🏠 Property: ${specificImage.ListingKey}`);
      console.log(`  📍 Address: ${specificImage.UnparsedAddress}`);
      console.log(`  🖼️  Primary Image: ${specificImage.MediaURL?.substring(0, 80)}...`);
      console.log(`  📊 MediaKey: ${specificImage.MediaKey}`);
      console.log(`  🔗 ResourceRecordKey: ${specificImage.ResourceRecordKey}`);
    } else {
      console.log('  ❌ No primary image found for C12279832');
    }
    console.log('');

    // 4. Test view performance
    console.log('⚡ Performance Test:');
    
    const startTime = Date.now();
    
    const { data: perfData, error: perfError } = await supabase
      .from('main_image')
      .select('ListingKey, MediaURL')
      .limit(100);
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    if (perfError) {
      console.error('❌ Error in performance test:', perfError);
    } else {
      console.log(`  📊 Query time: ${queryTime}ms for 100 records`);
      console.log(`  📸 Retrieved: ${perfData?.length || 0} records`);
    }
    console.log('');

    // 5. Test view with filters
    console.log('🔍 Filtered Query Test:');
    
    const { data: filteredData, error: filteredError } = await supabase
      .from('main_image')
      .select('ListingKey, UnparsedAddress, ListPrice, MediaURL')
      .not('ListPrice', 'is', null)
      .gte('ListPrice', 500000)
      .limit(3);
    
    if (filteredError) {
      console.error('❌ Error in filtered query:', filteredError);
    } else {
      console.log(`  📊 Properties with ListPrice >= $500,000: ${filteredData?.length || 0}`);
      if (filteredData && filteredData.length > 0) {
        filteredData.forEach((item, idx) => {
          console.log(`    ${idx + 1}. ${item.ListingKey}: $${item.ListPrice?.toLocaleString() || 'N/A'}`);
          console.log(`       ${item.UnparsedAddress || 'N/A'}`);
        });
      }
    }
    console.log('');

    // 6. Test view with joins (if needed)
    console.log('🔗 Join Test (if applicable):');
    
    // This would test if the view can be joined with other tables
    const { data: joinData, error: joinError } = await supabase
      .from('main_image')
      .select(`
        ListingKey,
        UnparsedAddress,
        ListPrice,
        MediaURL,
        residential_freehold!inner(ListingKey)
      `)
      .limit(2);
    
    if (joinError) {
      console.log(`  ⚠️  Join test failed (expected if residential_freehold doesn't exist): ${joinError.message}`);
    } else {
      console.log(`  ✅ Join test successful: ${joinData?.length || 0} records`);
    }
    console.log('');

    console.log('✅ main_image view test completed!');

  } catch (error) {
    console.error('❌ Error in test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testMainImageView();
