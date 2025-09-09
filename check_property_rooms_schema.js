#!/usr/bin/env node

// check_property_rooms_schema.js - Check the actual schema of property_rooms table
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkPropertyRoomsSchema() {
  try {
    console.log('🔍 Checking property_rooms table schema');
    console.log('=====================================');
    console.log('');

    // 1. Get a sample record to see what columns exist
    console.log('📊 Sample Record Structure:');
    
    const { data: sampleRecord, error: sampleError } = await supabase
      .from('property_rooms')
      .select('*')
      .limit(1)
      .single();
    
    if (sampleError) {
      console.error('❌ Error getting sample record:', sampleError);
      return;
    }
    
    if (sampleRecord) {
      console.log('  📋 Available columns:');
      Object.keys(sampleRecord).forEach((column, idx) => {
        const value = sampleRecord[column];
        const type = typeof value;
        console.log(`    ${idx + 1}. ${column}: ${type} (${value})`);
      });
    } else {
      console.log('  ❌ No records found in property_rooms table');
    }
    console.log('');

    // 2. Check table structure via information_schema
    console.log('🗂️  Table Structure from Information Schema:');
    
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_columns', { table_name: 'property_rooms' });
    
    if (tableError) {
      console.log('  ⚠️  Could not get table info via RPC, trying alternative method...');
      
      // Alternative: try to get column info by attempting to select specific columns
      const testColumns = [
        'ListingID', 'ListingKey', 'RoomKey', 'Order', 'ModificationTimestamp',
        'RoomAreaSource', 'RoomDescription', 'RoomDimensions', 'RoomHeight',
        'RoomLength', 'RoomLengthWidthUnits', 'RoomWidth', 'RoomFeature1',
        'RoomFeature2', 'RoomFeature3', 'RoomFeatures', 'RoomLevel', 'RoomType'
      ];
      
      console.log('  🔍 Testing individual columns:');
      for (const column of testColumns) {
        try {
          const { data, error } = await supabase
            .from('property_rooms')
            .select(column)
            .limit(1);
          
          if (error) {
            console.log(`    ❌ ${column}: ${error.message}`);
          } else {
            console.log(`    ✅ ${column}: exists`);
          }
        } catch (err) {
          console.log(`    ❌ ${column}: ${err.message}`);
        }
      }
    } else {
      console.log('  📊 Table columns:');
      tableInfo?.forEach((col, idx) => {
        console.log(`    ${idx + 1}. ${col.column_name}: ${col.data_type}`);
      });
    }
    console.log('');

    // 3. Get record count
    console.log('📈 Record Count:');
    
    const { count, error: countError } = await supabase
      .from('property_rooms')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error getting record count:', countError);
    } else {
      console.log(`  📊 Total records: ${count}`);
    }

    console.log('');
    console.log('✅ Schema check completed!');

  } catch (error) {
    console.error('❌ Error in schema check:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the check
checkPropertyRoomsSchema();
