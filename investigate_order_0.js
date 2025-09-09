#!/usr/bin/env node

// investigate_order_0.js - Deep dive into Order 0 image issues
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function investigateOrder0() {
  try {
    console.log('🔍 Deep Investigation: Order 0 Images');
    console.log('=====================================');
    console.log('');

    // 1. Check if Order 0 images exist at all
    console.log('📊 Order 0 Existence Check:');
    
    const { data: order0Check, error: order0Error } = await supabase
      .from('property_media')
      .select('MediaKey, Order, MediaURL, ResourceRecordKey')
      .eq('Order', 0)
      .limit(10);
    
    if (order0Error) {
      console.error('❌ Error checking Order 0:', order0Error);
      return;
    }
    
    console.log(`  📸 Found ${order0Check?.length || 0} Order 0 images`);
    
    if (order0Check && order0Check.length > 0) {
      console.log('  📋 Sample Order 0 images:');
      order0Check.slice(0, 3).forEach((media, idx) => {
        console.log(`    ${idx + 1}. MediaKey: ${media.MediaKey}`);
        console.log(`       ResourceRecordKey: ${media.ResourceRecordKey}`);
        console.log(`       URL: ${media.MediaURL?.substring(0, 80)}...`);
      });
    }
    console.log('');

    // 2. Check Order distribution more thoroughly
    console.log('📈 Complete Order Distribution:');
    
    const { data: allOrders, error: ordersError } = await supabase
      .from('property_media')
      .select('Order')
      .not('Order', 'is', null);
    
    if (ordersError) {
      console.error('❌ Error getting order distribution:', ordersError);
    } else {
      const orderCounts = {};
      allOrders?.forEach(media => {
        const order = media.Order;
        orderCounts[order] = (orderCounts[order] || 0) + 1;
      });
      
      console.log('  📊 All Order values found:');
      Object.entries(orderCounts)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .forEach(([order, count]) => {
          const percentage = ((count / allOrders.length) * 100).toFixed(1);
          console.log(`    Order ${order}: ${count} images (${percentage}%)`);
        });
    }
    console.log('');

    // 3. Check for null Order values
    console.log('❓ Null Order Values Check:');
    
    const { count: nullOrderCount, error: nullError } = await supabase
      .from('property_media')
      .select('*', { count: 'exact', head: true })
      .is('Order', null);
    
    if (nullError) {
      console.error('❌ Error checking null orders:', nullError);
    } else {
      console.log(`  📊 Media records with null Order: ${nullOrderCount}`);
    }
    console.log('');

    // 4. Check properties that should have Order 0
    console.log('🏠 Properties with Multiple Media (should have Order 0):');
    
    const { data: multiMediaProps, error: multiError } = await supabase
      .from('common_fields')
      .select(`
        ListingKey,
        property_media(Order, MediaKey, MediaURL)
      `)
      .not('property_media', 'is', null)
      .limit(5);
    
    if (multiError) {
      console.error('❌ Error getting multi-media properties:', multiError);
    } else {
      multiMediaProps?.forEach((prop, idx) => {
        const media = prop.property_media || [];
        const orders = media.map(m => m.Order).filter(o => o !== null).sort((a, b) => a - b);
        const hasOrder0 = orders.includes(0);
        
        console.log(`  ${idx + 1}. ${prop.ListingKey}: ${media.length} media`);
        console.log(`     Orders: [${orders.join(', ')}]`);
        console.log(`     Has Order 0: ${hasOrder0 ? '✅' : '❌'}`);
        
        if (!hasOrder0 && orders.length > 0) {
          console.log(`     ⚠️  Missing Order 0! Lowest order is ${orders[0]}`);
        }
      });
    }
    console.log('');

    // 5. Check if Order 0 images are being filtered out during sync
    console.log('🔍 Order 0 in Source Data Check:');
    
    // Let's check a specific property that should have Order 0
    const { data: sampleProp, error: sampleError } = await supabase
      .from('common_fields')
      .select(`
        ListingKey,
        property_media(Order, MediaKey, MediaURL, MediaCategory, ShortDescription)
      `)
      .eq('ListingKey', 'W12388037') // The property from the previous test
      .single();
    
    if (sampleError) {
      console.error('❌ Error getting sample property:', sampleError);
    } else if (sampleProp) {
      console.log(`  🏠 Property: ${sampleProp.ListingKey}`);
      const media = sampleProp.property_media || [];
      console.log(`  📸 Total media: ${media.length}`);
      
      const orders = media.map(m => m.Order).filter(o => o !== null).sort((a, b) => a - b);
      console.log(`  📊 Orders found: [${orders.join(', ')}]`);
      
      if (!orders.includes(0)) {
        console.log('  ⚠️  This property is missing Order 0!');
        console.log('  📋 All media for this property:');
        media
          .sort((a, b) => (a.Order || 999) - (b.Order || 999))
          .forEach((m, idx) => {
            console.log(`    ${idx + 1}. Order: ${m.Order || 'null'}, Category: ${m.MediaCategory}`);
            if (m.ShortDescription) {
              console.log(`       Description: ${m.ShortDescription}`);
            }
          });
      }
    }
    console.log('');

    // 6. Check for Order 0 in different media categories
    console.log('📸 Order 0 by Media Category:');
    
    const { data: order0ByCategory, error: categoryError } = await supabase
      .from('property_media')
      .select('Order, MediaCategory')
      .eq('Order', 0);
    
    if (categoryError) {
      console.error('❌ Error checking Order 0 by category:', categoryError);
    } else {
      const categoryCounts = {};
      order0ByCategory?.forEach(media => {
        const category = media.MediaCategory || 'Unknown';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      console.log('  📊 Order 0 images by category:');
      Object.entries(categoryCounts).forEach(([category, count]) => {
        console.log(`    ${category}: ${count} images`);
      });
    }

    console.log('');
    console.log('✅ Order 0 investigation completed!');

  } catch (error) {
    console.error('❌ Error in investigation:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the investigation
investigateOrder0();
