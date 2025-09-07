#!/usr/bin/env node

// test_record_counts.js - Test script to verify actual record counts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testRecordCounts() {
  console.log('🔍 Testing actual record counts in database...');
  console.log('');

  const tables = [
    'common_fields',
    'residential_freehold', 
    'residential_condo',
    'residential_lease',
    'property_media',
    'property_openhouse',
    'property_rooms'
  ];

  for (const tableName of tables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${tableName}: Error - ${error.message}`);
      } else {
        console.log(`✅ ${tableName}: ${count || 0} records`);
      }
    } catch (error) {
      console.log(`❌ ${tableName}: Exception - ${error.message}`);
    }
  }

  console.log('');
  console.log('🎯 Summary:');
  console.log('- If common_fields shows 31,721, the count is correct');
  console.log('- If it shows a different number, there may be a database issue');
  console.log('- The sync will use these actual counts as starting skip positions');
}

testRecordCounts();
