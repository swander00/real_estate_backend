#!/usr/bin/env node

// debug_order_discrepancy.js - Debug the discrepancy between tests
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function debugOrderDiscrepancy() {
  try {
    console.log('🔍 Debug: Order 0 Discrepancy Investigation');
    console.log('===========================================');
    console.log('');

    // 1. Direct query for Order 0 images
    console.log('📊 Direct Order 0 Query:');
    
    const { data: directOrder0, error: directError } = await supabase
      .from('property_media')
      .select('MediaKey, Order, ResourceRecordKey')
      .eq('Order', 0)
      .limit(5);
    
    if (directError) {
      console.error('❌ Error in direct Order 0 query:', directError);
    } else {
      console.log(`  📸 Found ${directOrder0?.length || 0} Order 0 images directly`);
      if (directOrder0 && directOrder0.length > 0) {
        directOrder0.forEach((media, idx) => {
          console.log(`    ${idx + 1}. MediaKey: ${media.MediaKey}, Order: ${media.Order}, ResourceRecordKey: ${media.ResourceRecordKey}`);
        });
      }
    }
    console.log('');

    // 2. Test the join query that's failing
    console.log('🔗 Testing Join Query:');
    
    const { data: joinTest, error: joinError } = await supabase
      .from('common_fields')
      .select(`
        ListingKey,
        property_media(Order, MediaKey)
      `)
      .limit(3);
    
    if (joinError) {
      console.error('❌ Error in join query:', joinError);
    } else {
      console.log(`  📊 Join query returned ${joinTest?.length || 0} properties`);
      if (joinTest && joinTest.length > 0) {
        joinTest.forEach((prop, idx) => {
          console.log(`    ${idx + 1}. ${prop.ListingKey}:`);
          if (prop.property_media && prop.property_media.length > 0) {
            prop.property_media.forEach((media, mediaIdx) => {
              console.log(`       Media ${mediaIdx + 1}: Order=${media.Order}, MediaKey=${media.MediaKey}`);
            });
          } else {
            console.log(`       No media found`);
          }
        });
      }
    }
    console.log('');

    // 3. Test with a specific property we know has Order 0
    console.log('🎯 Testing Specific Property (C12279832):');
    
    const { data: specificProp, error: specificError } = await supabase
      .from('common_fields')
      .select(`
        ListingKey,
        property_media(Order, MediaKey, ResourceRecordKey)
      `)
      .eq('ListingKey', 'C12279832')
      .single();
    
    if (specificError) {
      console.error('❌ Error getting specific property:', specificError);
    } else if (specificProp) {
      console.log(`  🏠 Property: ${specificProp.ListingKey}`);
      if (specificProp.property_media && specificProp.property_media.length > 0) {
        console.log(`  📸 Media count: ${specificProp.property_media.length}`);
        specificProp.property_media.forEach((media, idx) => {
          console.log(`    ${idx + 1}. Order: ${media.Order}, MediaKey: ${media.MediaKey}`);
        });
        
        const order0Count = specificProp.property_media.filter(m => m.Order === 0).length;
        console.log(`  📊 Order 0 count: ${order0Count}`);
      } else {
        console.log(`  ❌ No media found for this property`);
      }
    }
    console.log('');

    // 4. Check if there's a data type issue
    console.log('🔍 Data Type Investigation:');
    
    const { data: orderTypes, error: typeError } = await supabase
      .from('property_media')
      .select('Order, MediaKey')
      .limit(10);
    
    if (typeError) {
      console.error('❌ Error checking order types:', typeError);
    } else {
      console.log(`  📊 Sample Order values and types:`);
      orderTypes?.forEach((media, idx) => {
        console.log(`    ${idx + 1}. Order: ${media.Order} (type: ${typeof media.Order})`);
      });
    }
    console.log('');

    // 5. Test the exact query from the corrected test
    console.log('🧪 Testing Exact Query from Corrected Test:');
    
    const { data: exactQuery, error: exactError } = await supabase
      .from('common_fields')
      .select(`
        ListingKey,
        property_media!inner(Order)
      `)
      .limit(5);
    
    if (exactError) {
      console.error('❌ Error in exact query:', exactError);
    } else {
      console.log(`  📊 Exact query returned ${exactQuery?.length || 0} results`);
      if (exactQuery && exactQuery.length > 0) {
        exactQuery.forEach((item, idx) => {
          console.log(`    ${idx + 1}. ListingKey: ${item.ListingKey}`);
          console.log(`       Media Order: ${item.property_media?.Order}`);
        });
      }
    }
    console.log('');

    // 6. Check if the issue is with the !inner join
    console.log('🔗 Testing Without !inner Join:');
    
    const { data: withoutInner, error: withoutError } = await supabase
      .from('common_fields')
      .select(`
        ListingKey,
        property_media(Order)
      `)
      .not('property_media', 'is', null)
      .limit(5);
    
    if (withoutError) {
      console.error('❌ Error without inner join:', withoutError);
    } else {
      console.log(`  📊 Without inner join: ${withoutInner?.length || 0} results`);
      if (withoutInner && withoutInner.length > 0) {
        withoutInner.forEach((item, idx) => {
          console.log(`    ${idx + 1}. ListingKey: ${item.ListingKey}`);
          if (item.property_media && item.property_media.length > 0) {
            const orders = item.property_media.map(m => m.Order);
            console.log(`       Orders: [${orders.join(', ')}]`);
          }
        });
      }
    }

    console.log('');
    console.log('✅ Debug investigation completed!');

  } catch (error) {
    console.error('❌ Error in debug:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugOrderDiscrepancy();
