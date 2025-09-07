#!/usr/bin/env node

// monitor_orphaned_records.js - Monitoring dashboard for orphaned records
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function monitorOrphanedRecords() {
  try {
    console.log('📊 Orphaned Records Monitoring Dashboard');
    console.log('=====================================');
    console.log('');

    // Get staging summary
    const { data: stagingSummary, error: stagingError } = await supabase
      .from('orphaned_records_summary')
      .select('*');

    if (stagingError) {
      console.error('❌ Error getting staging summary:', stagingError);
    } else {
      console.log('📦 Staged Records Summary:');
      if (stagingSummary && stagingSummary.length > 0) {
        stagingSummary.forEach(row => {
          console.log(`  ${row.staging_table}:`);
          console.log(`    Total staged: ${row.total_staged}`);
          console.log(`    Pending: ${row.pending_processing}`);
          console.log(`    Processed: ${row.processed}`);
          console.log(`    Oldest: ${row.oldest_staged}`);
          console.log(`    Newest: ${row.newest_staged}`);
          console.log('');
        });
      } else {
        console.log('  No staged records found');
        console.log('');
      }
    }

    // Check for orphaned records in each table
    const tables = [
      { name: 'property_openhouse', key: 'OpenHouseKey', parentKey: 'ListingKey' },
      { name: 'property_rooms', key: 'RoomKey', parentKey: 'ListingKey' },
      { name: 'property_media', key: 'MediaKey', parentKey: 'ListingKey' }
    ];

    console.log('🔍 Current Orphaned Records Check:');
    for (const table of tables) {
      try {
        // Count total records
        const { count: totalCount, error: totalError } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true });

        if (totalError) {
          console.log(`  ${table.name}: Error getting count - ${totalError.message}`);
          continue;
        }

        // Count orphaned records
        const { count: orphanedCount, error: orphanedError } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true })
          .not(table.parentKey, 'in', `(SELECT ListingKey FROM common_fields WHERE ListingKey IS NOT NULL)`);

        if (orphanedError) {
          console.log(`  ${table.name}: Error checking orphans - ${orphanedError.message}`);
          continue;
        }

        const orphanedPercentage = totalCount > 0 ? ((orphanedCount / totalCount) * 100).toFixed(1) : 0;
        const status = orphanedPercentage < 5 ? '✅' : orphanedPercentage < 10 ? '⚠️' : '❌';

        console.log(`  ${status} ${table.name}:`);
        console.log(`    Total records: ${totalCount}`);
        console.log(`    Orphaned: ${orphanedCount} (${orphanedPercentage}%)`);
        console.log('');

      } catch (error) {
        console.log(`  ${table.name}: Error - ${error.message}`);
        console.log('');
      }
    }

    // Check common_fields count
    const { count: commonFieldsCount, error: commonError } = await supabase
      .from('common_fields')
      .select('*', { count: 'exact', head: true });

    if (commonError) {
      console.log(`❌ Error getting common_fields count: ${commonError.message}`);
    } else {
      console.log(`📋 Common Fields: ${commonFieldsCount} total records`);
      console.log('');
    }

    // Recommendations
    console.log('💡 Recommendations:');
    if (stagingSummary && stagingSummary.length > 0) {
      const totalPending = stagingSummary.reduce((sum, row) => sum + row.pending_processing, 0);
      if (totalPending > 0) {
        console.log(`  - Run 'node fix_orphaned_records.js' to process ${totalPending} pending staged records`);
      }
    }
    
    console.log('  - Run cleanup regularly to maintain data integrity');
    console.log('  - Monitor orphaned record percentages - aim for <5%');
    console.log('  - Consider adjusting sync timing if orphan rates are high');

  } catch (error) {
    console.error('❌ Error in monitoring:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run monitoring
monitorOrphanedRecords();
