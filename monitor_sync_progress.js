#!/usr/bin/env node

// monitor_sync_progress.js - Quick progress monitor for sync status
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function monitorSyncProgress() {
  console.log('📊 Real Estate Data Sync Progress Monitor');
  console.log('========================================');
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

  let totalRecords = 0;
  const results = [];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: Error - ${error.message}`);
        results.push({ table, count: 0, status: 'error' });
      } else {
        const recordCount = count || 0;
        totalRecords += recordCount;
        
        // Determine status based on record count and API limits
        let status = 'active';
        let statusIcon = '🔄';
        
        if (recordCount >= 100000) {
          status = 'api_limit';
          statusIcon = '🛑';
        } else if (recordCount > 50000) {
          status = 'high';
          statusIcon = '⚠️';
        } else if (recordCount > 10000) {
          status = 'good';
          statusIcon = '✅';
        } else {
          status = 'low';
          statusIcon = '📈';
        }
        
        console.log(`${statusIcon} ${table.padEnd(20)}: ${recordCount.toLocaleString().padStart(8)} records`);
        results.push({ table, count: recordCount, status });
      }
    } catch (error) {
      console.log(`❌ ${table}: Exception - ${error.message}`);
      results.push({ table, count: 0, status: 'error' });
    }
  }

  console.log('');
  console.log('📈 SUMMARY:');
  console.log(`   Total records: ${totalRecords.toLocaleString()}`);
  
  const activeTables = results.filter(r => r.status === 'active' || r.status === 'good' || r.status === 'low').length;
  const highTables = results.filter(r => r.status === 'high').length;
  const limitTables = results.filter(r => r.status === 'api_limit').length;
  const errorTables = results.filter(r => r.status === 'error').length;
  
  console.log(`   🔄 Active tables: ${activeTables}`);
  console.log(`   ⚠️  High volume tables: ${highTables}`);
  console.log(`   🛑 API limit reached: ${limitTables}`);
  console.log(`   ❌ Error tables: ${errorTables}`);
  
  console.log('');
  console.log('💡 INTERPRETATION:');
  
  if (limitTables > 0) {
    console.log(`   🛑 ${limitTables} table(s) have hit the API limit (100,000 records)`);
    console.log('      These tables cannot fetch more data from the API');
  }
  
  if (activeTables > 0) {
    console.log(`   🔄 ${activeTables} table(s) can still sync more data`);
  }
  
  if (totalRecords > 500000) {
    console.log('   📊 Large dataset - consider archiving old records');
  }
  
  console.log('');
  console.log('🔄 To check if feeds are complete, run: node check_feed_completion.js');
}

monitorSyncProgress();
