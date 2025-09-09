#!/usr/bin/env node

// refresh_schema_cache.js - Force refresh Supabase schema cache
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function refreshSchemaCache() {
  try {
    console.log('🔄 Refreshing Supabase schema cache...');
    console.log('=====================================');
    console.log('');

    // Method 1: Try to query the table to force cache refresh
    console.log('📊 Method 1: Querying table to force cache refresh...');
    
    try {
      const { data, error } = await supabase
        .from('property_rooms')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`  ❌ Query failed: ${error.message}`);
      } else {
        console.log(`  ✅ Query successful: ${data?.length || 0} records`);
        if (data && data.length > 0) {
          console.log('  📋 Available columns:');
          Object.keys(data[0]).forEach((col, idx) => {
            console.log(`    ${idx + 1}. ${col}`);
          });
        }
      }
    } catch (err) {
      console.log(`  ❌ Query error: ${err.message}`);
    }
    console.log('');

    // Method 2: Try to insert a test record to force cache refresh
    console.log('📊 Method 2: Testing insert to force cache refresh...');
    
    try {
      const testRecord = {
        ListingKey: 'TEST123',
        RoomKey: 'TEST_ROOM_123',
        Order: 1,
        RoomType: 'Test Room',
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('property_rooms')
        .insert(testRecord)
        .select();
      
      if (error) {
        console.log(`  ❌ Insert failed: ${error.message}`);
      } else {
        console.log(`  ✅ Insert successful: ${data?.length || 0} records inserted`);
        
        // Clean up the test record
        await supabase
          .from('property_rooms')
          .delete()
          .eq('RoomKey', 'TEST_ROOM_123');
        console.log('  🧹 Test record cleaned up');
      }
    } catch (err) {
      console.log(`  ❌ Insert error: ${err.message}`);
    }
    console.log('');

    // Method 3: Check if columns exist by trying to select them individually
    console.log('📊 Method 3: Testing individual column access...');
    
    const testColumns = ['CreatedAt', 'UpdatedAt', 'ModificationTimestamp'];
    
    for (const column of testColumns) {
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

    console.log('✅ Schema cache refresh attempt completed!');
    console.log('');
    console.log('💡 If columns still don\'t exist, try:');
    console.log('   1. Wait 1-2 minutes for Supabase to refresh');
    console.log('   2. Check your Supabase dashboard to verify columns were added');
    console.log('   3. Try running your sync again');

  } catch (error) {
    console.error('❌ Error refreshing schema cache:', error);
  }
}

// Run the refresh
refreshSchemaCache();
