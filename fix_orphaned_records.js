#!/usr/bin/env node

// fix_orphaned_records.js - Comprehensive solution for orphaned records
import 'dotenv/config';
import { cleanupAllOrphanedRecords, cleanupOrphanedRecords } from './lib/orphanCleanup.js';
import { processStagedOrphanedRecords, cleanupOldStagedRecords } from './lib/orphanStaging.js';

console.log('🔧 Starting comprehensive orphaned records fix...');
console.log('');

async function fixOrphanedRecords() {
  try {
    // Step 1: Clean up existing orphaned records
    console.log('📋 Step 1: Cleaning up existing orphaned records...');
    const cleanupResults = await cleanupAllOrphanedRecords();
    
    // Step 2: Process staged orphaned records
    console.log('\n📋 Step 2: Processing staged orphaned records...');
    const stagingResults = {};
    
    const tables = ['property_openhouse', 'property_rooms', 'property_media'];
    for (const table of tables) {
      const processed = await processStagedOrphanedRecords(table);
      stagingResults[table] = processed;
    }
    
    // Step 3: Clean up old staged records
    console.log('\n📋 Step 3: Cleaning up old staged records...');
    const oldStagedCleaned = await cleanupOldStagedRecords(7); // 7 days old
    
    // Summary
    console.log('\n✅ Orphaned records fix completed!');
    console.log('📊 Summary:');
    console.log('  Cleanup results:', cleanupResults);
    console.log('  Staging results:', stagingResults);
    console.log(`  Old staged records cleaned: ${oldStagedCleaned}`);
    
    const totalCleaned = Object.values(cleanupResults).reduce((sum, count) => sum + count, 0);
    const totalProcessed = Object.values(stagingResults).reduce((sum, count) => sum + count, 0);
    
    console.log(`\n🎯 Total records cleaned: ${totalCleaned}`);
    console.log(`🎯 Total staged records processed: ${totalProcessed}`);
    
  } catch (error) {
    console.error('❌ Error fixing orphaned records:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the fix
fixOrphanedRecords();
