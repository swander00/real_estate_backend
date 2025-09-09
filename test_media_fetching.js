#!/usr/bin/env node

// test_media_fetching.js - Test script to verify media fetching and Order 0 images
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testMediaFetching() {
  try {
    console.log('🔍 Testing Media Fetching and Order 0 Images');
    console.log('============================================');
    console.log('');

    // 1. Get total counts
    console.log('📊 Database Overview:');
    
    const { count: totalProperties, error: propError } = await supabase
      .from('common_fields')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalMedia, error: mediaError } = await supabase
      .from('property_media')
      .select('*', { count: 'exact', head: true });
    
    if (propError) {
      console.error('❌ Error getting property count:', propError);
      return;
    }
    
    if (mediaError) {
      console.error('❌ Error getting media count:', mediaError);
      return;
    }
    
    console.log(`  📋 Total Properties: ${totalProperties}`);
    console.log(`  🖼️  Total Media Records: ${totalMedia}`);
    console.log(`  📈 Media per Property: ${totalProperties > 0 ? (totalMedia / totalProperties).toFixed(2) : 0}`);
    console.log('');

    // 2. Test Order 0 images specifically
    console.log('🎯 Order 0 Images Analysis:');
    
    const { data: order0Media, error: order0Error } = await supabase
      .from('property_media')
      .select('*')
      .eq('Order', 0);
    
    if (order0Error) {
      console.error('❌ Error getting Order 0 media:', order0Error);
      return;
    }
    
    console.log(`  📸 Total Order 0 Images: ${order0Media?.length || 0}`);
    console.log(`  📊 Order 0 Coverage: ${totalProperties > 0 ? ((order0Media?.length || 0) / totalProperties * 100).toFixed(1) : 0}%`);
    console.log('');

    // 3. Test relationship integrity
    console.log('🔗 Relationship Integrity Test:');
    
    // Get properties with media
    const { data: propertiesWithMedia, error: relError } = await supabase
      .from('common_fields')
      .select(`
        ListingKey,
        property_media!inner(MediaKey, Order, MediaURL, MediaType)
      `)
      .limit(10);
    
    if (relError) {
      console.error('❌ Error testing relationships:', relError);
      return;
    }
    
    console.log(`  ✅ Properties with media (sample of 10): ${propertiesWithMedia?.length || 0}`);
    
    if (propertiesWithMedia && propertiesWithMedia.length > 0) {
      console.log('  📋 Sample relationships:');
      propertiesWithMedia.slice(0, 3).forEach((prop, idx) => {
        const mediaCount = prop.property_media?.length || 0;
        const hasOrder0 = prop.property_media?.some(m => m.Order === 0) || false;
        console.log(`    ${idx + 1}. ${prop.ListingKey}: ${mediaCount} media, Order 0: ${hasOrder0 ? '✅' : '❌'}`);
      });
    }
    console.log('');

    // 4. Test specific property with media
    console.log('🔍 Detailed Property Analysis:');
    
    const { data: sampleProperty, error: sampleError } = await supabase
      .from('common_fields')
      .select(`
        ListingKey,
        UnparsedAddress,
        property_media(MediaKey, Order, MediaURL, MediaType, MediaCategory, ShortDescription)
      `)
      .not('property_media', 'is', null)
      .limit(1)
      .single();
    
    if (sampleError) {
      console.error('❌ Error getting sample property:', sampleError);
    } else if (sampleProperty) {
      console.log(`  🏠 Sample Property: ${sampleProperty.ListingKey}`);
      console.log(`  📍 Address: ${sampleProperty.UnparsedAddress || 'N/A'}`);
      console.log(`  🖼️  Media Count: ${sampleProperty.property_media?.length || 0}`);
      
      if (sampleProperty.property_media && sampleProperty.property_media.length > 0) {
        console.log('  📸 Media Details:');
        sampleProperty.property_media
          .sort((a, b) => (a.Order || 999) - (b.Order || 999))
          .slice(0, 5)
          .forEach((media, idx) => {
            console.log(`    ${idx + 1}. Order: ${media.Order || 'null'}, Type: ${media.MediaType}, Category: ${media.MediaCategory}`);
            if (media.ShortDescription) {
              console.log(`       Description: ${media.ShortDescription}`);
            }
          });
      }
    }
    console.log('');

    // 5. Test ResourceRecordKey relationship
    console.log('🔗 ResourceRecordKey Relationship Test:');
    
    const { data: mediaWithResourceKey, error: resourceError } = await supabase
      .from('property_media')
      .select('MediaKey, ResourceRecordKey, ListingKey')
      .not('ResourceRecordKey', 'is', null)
      .limit(5);
    
    if (resourceError) {
      console.error('❌ Error testing ResourceRecordKey:', resourceError);
    } else {
      console.log(`  📊 Media records with ResourceRecordKey: ${mediaWithResourceKey?.length || 0}`);
      
      if (mediaWithResourceKey && mediaWithResourceKey.length > 0) {
        console.log('  📋 Sample ResourceRecordKey relationships:');
        mediaWithResourceKey.forEach((media, idx) => {
          console.log(`    ${idx + 1}. MediaKey: ${media.MediaKey}`);
          console.log(`       ResourceRecordKey: ${media.ResourceRecordKey}`);
          console.log(`       ListingKey: ${media.ListingKey}`);
          console.log(`       Match: ${media.ResourceRecordKey === media.ListingKey ? '✅' : '❌'}`);
        });
      }
    }
    console.log('');

    // 6. Test Order distribution
    console.log('📊 Order Distribution Analysis:');
    
    const { data: orderDistribution, error: orderError } = await supabase
      .from('property_media')
      .select('Order')
      .not('Order', 'is', null);
    
    if (orderError) {
      console.error('❌ Error getting order distribution:', orderError);
    } else {
      const orderCounts = {};
      orderDistribution?.forEach(media => {
        const order = media.Order;
        orderCounts[order] = (orderCounts[order] || 0) + 1;
      });
      
      console.log('  📈 Order distribution (top 10):');
      Object.entries(orderCounts)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .slice(0, 10)
        .forEach(([order, count]) => {
          console.log(`    Order ${order}: ${count} images`);
        });
    }
    console.log('');

    // 7. Test for missing Order 0 images
    console.log('❌ Properties Missing Order 0 Images:');
    
    const { data: propertiesWithoutOrder0, error: missingError } = await supabase
      .from('common_fields')
      .select(`
        ListingKey,
        property_media!left(Order)
      `)
      .not('property_media.Order', 'eq', 0)
      .limit(10);
    
    if (missingError) {
      console.error('❌ Error finding properties without Order 0:', missingError);
    } else {
      console.log(`  📊 Properties without Order 0 images (sample): ${propertiesWithoutOrder0?.length || 0}`);
      
      if (propertiesWithoutOrder0 && propertiesWithoutOrder0.length > 0) {
        console.log('  📋 Sample properties missing Order 0:');
        propertiesWithoutOrder0.slice(0, 5).forEach((prop, idx) => {
          const mediaCount = prop.property_media?.length || 0;
          console.log(`    ${idx + 1}. ${prop.ListingKey}: ${mediaCount} media records`);
        });
      }
    }

    console.log('');
    console.log('✅ Media fetching test completed!');

  } catch (error) {
    console.error('❌ Error in test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testMediaFetching();
