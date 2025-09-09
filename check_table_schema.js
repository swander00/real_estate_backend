#!/usr/bin/env node

// check_table_schema.js - Check table schema by testing column access
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkTableSchema() {
  try {
    console.log('🔍 Checking property_rooms table schema');
    console.log('=====================================');
    console.log('');

    // Test different possible column names
    const possibleColumns = [
      'ListingKey', 'listingkey', 'listing_key', 'ListingID', 'listingid', 'listing_id',
      'RoomKey', 'roomkey', 'room_key', 'Order', 'order', 'room_order',
      'RoomType', 'roomtype', 'room_type', 'RoomLevel', 'roomlevel', 'room_level',
      'ModificationTimestamp', 'modificationtimestamp', 'modification_timestamp'
    ];

    console.log('🔍 Testing column names:');
    
    for (const column of possibleColumns) {
      try {
        const { data, error } = await supabase
          .from('property_rooms')
          .select(column)
          .limit(1);
        
        if (error) {
          console.log(`  ❌ ${column}: ${error.message}`);
        } else {
          console.log(`  ✅ ${column}: exists`);
        }
      } catch (err) {
        console.log(`  ❌ ${column}: ${err.message}`);
      }
    }
    console.log('');

    // Try to get all columns with *
    console.log('📊 Testing SELECT *:');
    try {
      const { data, error } = await supabase
        .from('property_rooms')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`  ❌ SELECT *: ${error.message}`);
      } else {
        console.log(`  ✅ SELECT *: works (${data?.length || 0} records)`);
        if (data && data.length > 0) {
          console.log('  📋 Available columns:');
          Object.keys(data[0]).forEach((col, idx) => {
            console.log(`    ${idx + 1}. ${col}`);
          });
        }
      }
    } catch (err) {
      console.log(`  ❌ SELECT *: ${err.message}`);
    }

    console.log('');
    console.log('✅ Schema check completed!');

  } catch (error) {
    console.error('❌ Error in schema check:', error);
  }
}

// Run the check
checkTableSchema();
