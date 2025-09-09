#!/usr/bin/env node

// corrected_media_test.js - Corrected test to show real Order 0 coverage
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function correctedMediaTest() {
  try {
    console.log('🔍 Corrected Media Test - Real Order 0 Coverage');
    console.log('================================================');
    console.log('');

    // 1. Get properties that actually have media
    console.log('📊 Properties with Media Analysis:');
    
    const { data: propertiesWithMedia, error: propError } = await supabase
      .from('common_fields')
      .select(`
        ListingKey,
        property_media(Order)
      `)
      .not('property_media', 'is', null);
    
    if (propError) {
      console.error('❌ Error getting properties with media:', propError);
      return;
    }
    
    // Group by ListingKey to get unique properties
    const uniqueProperties = new Map();
    propertiesWithMedia?.forEach(item => {
      if (!uniqueProperties.has(item.ListingKey)) {
        uniqueProperties.set(item.ListingKey, []);
      }
      // property_media is already an array, so we need to spread it
      if (item.property_media && Array.isArray(item.property_media)) {
        uniqueProperties.get(item.ListingKey).push(...item.property_media);
      }
    });
    
    const totalPropertiesWithMedia = uniqueProperties.size;
    console.log(`  📋 Total Properties with Media: ${totalPropertiesWithMedia}`);
    
    // 2. Check how many of these properties have Order 0
    let propertiesWithOrder0 = 0;
    let totalOrder0Images = 0;
    
    uniqueProperties.forEach((mediaList, listingKey) => {
      const hasOrder0 = mediaList.some(media => media.Order === 0);
      if (hasOrder0) {
        propertiesWithOrder0++;
        const order0Count = mediaList.filter(media => media.Order === 0).length;
        totalOrder0Images += order0Count;
      }
    });
    
    const order0Coverage = totalPropertiesWithMedia > 0 ? 
      (propertiesWithOrder0 / totalPropertiesWithMedia * 100).toFixed(1) : 0;
    
    console.log(`  📸 Properties with Order 0: ${propertiesWithOrder0}`);
    console.log(`  📊 Order 0 Coverage: ${order0Coverage}%`);
    console.log(`  🖼️  Total Order 0 Images: ${totalOrder0Images}`);
    console.log('');

    // 3. Show sample properties with their Order 0 images
    console.log('🏠 Sample Properties with Order 0 Images:');
    
    let sampleCount = 0;
    uniqueProperties.forEach((mediaList, listingKey) => {
      if (sampleCount >= 5) return;
      
      const hasOrder0 = mediaList.some(media => media.Order === 0);
      if (hasOrder0) {
        sampleCount++;
        const order0Count = mediaList.filter(media => media.Order === 0).length;
        const totalMedia = mediaList.length;
        
        console.log(`  ${sampleCount}. ${listingKey}:`);
        console.log(`     Total Media: ${totalMedia}`);
        console.log(`     Order 0 Images: ${order0Count}`);
        console.log(`     Order 0 Percentage: ${(order0Count / totalMedia * 100).toFixed(1)}%`);
      }
    });
    console.log('');

    // 4. Check media distribution for properties with Order 0
    console.log('📈 Media Distribution for Properties with Order 0:');
    
    const orderDistribution = {};
    let totalMediaCount = 0;
    
    uniqueProperties.forEach((mediaList, listingKey) => {
      const hasOrder0 = mediaList.some(media => media.Order === 0);
      if (hasOrder0) {
        mediaList.forEach(media => {
          const order = media.Order;
          orderDistribution[order] = (orderDistribution[order] || 0) + 1;
          totalMediaCount++;
        });
      }
    });
    
    console.log('  📊 Order distribution for properties with Order 0:');
    Object.entries(orderDistribution)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .slice(0, 10)
      .forEach(([order, count]) => {
        const percentage = (count / totalMediaCount * 100).toFixed(1);
        console.log(`    Order ${order}: ${count} images (${percentage}%)`);
      });
    console.log('');

    // 5. Check properties without Order 0
    console.log('❌ Properties with Media but NO Order 0:');
    
    let propertiesWithoutOrder0 = 0;
    const sampleWithoutOrder0 = [];
    
    uniqueProperties.forEach((mediaList, listingKey) => {
      const hasOrder0 = mediaList.some(media => media.Order === 0);
      if (!hasOrder0) {
        propertiesWithoutOrder0++;
        if (sampleWithoutOrder0.length < 5) {
          const orders = mediaList.map(m => m.Order).sort((a, b) => a - b);
          sampleWithoutOrder0.push({ listingKey, orders, mediaCount: mediaList.length });
        }
      }
    });
    
    console.log(`  📊 Properties without Order 0: ${propertiesWithoutOrder0}`);
    console.log(`  📈 Percentage without Order 0: ${(propertiesWithoutOrder0 / totalPropertiesWithMedia * 100).toFixed(1)}%`);
    
    if (sampleWithoutOrder0.length > 0) {
      console.log('  📋 Sample properties without Order 0:');
      sampleWithoutOrder0.forEach((prop, idx) => {
        console.log(`    ${idx + 1}. ${prop.listingKey}: ${prop.mediaCount} media, Orders: [${prop.orders.slice(0, 5).join(', ')}${prop.orders.length > 5 ? '...' : ''}]`);
      });
    }
    console.log('');

    // 6. Summary
    console.log('📊 Summary:');
    console.log(`  ✅ Properties with media: ${totalPropertiesWithMedia}`);
    console.log(`  ✅ Properties with Order 0: ${propertiesWithOrder0} (${order0Coverage}%)`);
    console.log(`  ❌ Properties without Order 0: ${propertiesWithoutOrder0} (${(100 - parseFloat(order0Coverage)).toFixed(1)}%)`);
    console.log(`  🖼️  Total Order 0 images: ${totalOrder0Images}`);
    
    if (parseFloat(order0Coverage) >= 80) {
      console.log('  🎉 Excellent Order 0 coverage!');
    } else if (parseFloat(order0Coverage) >= 60) {
      console.log('  ✅ Good Order 0 coverage');
    } else if (parseFloat(order0Coverage) >= 40) {
      console.log('  ⚠️  Moderate Order 0 coverage');
    } else {
      console.log('  ❌ Low Order 0 coverage - may need investigation');
    }

    console.log('');
    console.log('✅ Corrected media test completed!');

  } catch (error) {
    console.error('❌ Error in corrected test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the corrected test
correctedMediaTest();
