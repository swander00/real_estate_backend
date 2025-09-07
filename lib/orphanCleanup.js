// lib/orphanCleanup.js - Cleanup system for orphaned records
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const DEBUG = true;

// Tables that have parent-child relationships
const ORPHANED_TABLES = [
  {
    name: 'property_openhouse',
    parentKey: 'ListingKey',
    childKey: 'OpenHouseKey',
    parentTable: 'common_fields'
  },
  {
    name: 'property_rooms', 
    parentKey: 'ListingKey',
    childKey: 'RoomKey',
    parentTable: 'common_fields'
  },
  {
    name: 'property_media',
    parentKey: 'ListingKey', 
    childKey: 'MediaKey',
    parentTable: 'common_fields'
  },
  {
    name: 'residential_freehold',
    parentKey: 'ListingKey',
    childKey: 'ListingKey',
    parentTable: 'common_fields'
  },
  {
    name: 'residential_condo',
    parentKey: 'ListingKey',
    childKey: 'ListingKey', 
    parentTable: 'common_fields'
  },
  {
    name: 'residential_lease',
    parentKey: 'ListingKey',
    childKey: 'ListingKey',
    parentTable: 'common_fields'
  }
];

/**
 * Clean up orphaned records by checking if parent records exist
 * @param {string} tableName - Table to clean up
 * @param {number} batchSize - Batch size for processing
 * @returns {Promise<number>} Number of records cleaned up
 */
export async function cleanupOrphanedRecords(tableName, batchSize = 1000) {
  const tableConfig = ORPHANED_TABLES.find(t => t.name === tableName);
  if (!tableConfig) {
    console.log(`❌ No cleanup config found for table: ${tableName}`);
    return 0;
  }

  try {
    console.log(`🧹 Cleaning up orphaned records in ${tableName}...`);
    
    let totalCleaned = 0;
    let offset = 0;
    
    while (true) {
      // Get batch of records to check
      const { data: records, error: selectError } = await supabase
        .from(tableName)
        .select(`${tableConfig.parentKey}, ${tableConfig.childKey}`)
        .range(offset, offset + batchSize - 1);
      
      if (selectError) {
        console.error(`❌ Error selecting records from ${tableName}:`, selectError);
        break;
      }
      
      if (!records || records.length === 0) {
        break; // No more records
      }
      
      // Get unique parent keys from this batch
      const parentKeys = [...new Set(records.map(r => r[tableConfig.parentKey]).filter(Boolean))];
      
      if (parentKeys.length === 0) {
        offset += batchSize;
        continue;
      }
      
      // Check which parent keys exist in the parent table
      const { data: existingParents, error: parentError } = await supabase
        .from(tableConfig.parentTable)
        .select(tableConfig.parentKey)
        .in(tableConfig.parentKey, parentKeys);
      
      if (parentError) {
        console.error(`❌ Error checking parent records:`, parentError);
        offset += batchSize;
        continue;
      }
      
      const existingParentKeys = new Set(existingParents?.map(r => r[tableConfig.parentKey]) || []);
      
      // Find orphaned records (child records whose parent doesn't exist)
      const orphanedChildKeys = records
        .filter(r => r[tableConfig.parentKey] && !existingParentKeys.has(r[tableConfig.parentKey]))
        .map(r => r[tableConfig.childKey])
        .filter(Boolean);
      
      if (orphanedChildKeys.length > 0) {
        // Delete orphaned records
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .in(tableConfig.childKey, orphanedChildKeys);
        
        if (deleteError) {
          console.error(`❌ Error deleting orphaned records from ${tableName}:`, deleteError);
        } else {
          totalCleaned += orphanedChildKeys.length;
          if (DEBUG) {
            console.log(`  🗑️  Deleted ${orphanedChildKeys.length} orphaned records from ${tableName}`);
          }
        }
      }
      
      offset += batchSize;
    }
    
    console.log(`✅ Cleaned up ${totalCleaned} orphaned records from ${tableName}`);
    return totalCleaned;
    
  } catch (error) {
    console.error(`❌ Error cleaning up ${tableName}:`, error);
    return 0;
  }
}

/**
 * Clean up all orphaned records across all tables
 * @returns {Promise<Object>} Summary of cleanup results
 */
export async function cleanupAllOrphanedRecords() {
  console.log('🧹 Starting comprehensive orphaned records cleanup...');
  
  const results = {};
  let totalCleaned = 0;
  
  for (const tableConfig of ORPHANED_TABLES) {
    const cleaned = await cleanupOrphanedRecords(tableConfig.name);
    results[tableConfig.name] = cleaned;
    totalCleaned += cleaned;
  }
  
  console.log(`✅ Orphaned records cleanup completed. Total cleaned: ${totalCleaned}`);
  console.log('📊 Results by table:', results);
  
  return results;
}

/**
 * Retry processing orphaned records by checking if parents now exist
 * @param {string} tableName - Table to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<number>} Number of records successfully processed
 */
export async function retryOrphanedRecords(tableName, maxRetries = 3) {
  const tableConfig = ORPHANED_TABLES.find(t => t.name === tableName);
  if (!tableConfig) {
    console.log(`❌ No retry config found for table: ${tableName}`);
    return 0;
  }

  try {
    console.log(`🔄 Retrying orphaned records for ${tableName}...`);
    
    let totalProcessed = 0;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`  Attempt ${attempt}/${maxRetries}...`);
      
      // Get orphaned records (records that failed parent enforcement)
      const { data: orphanedRecords, error: selectError } = await supabase
        .from(tableName)
        .select('*')
        .is('processed_at', null) // Assuming we add a processed_at field
        .limit(1000);
      
      if (selectError || !orphanedRecords?.length) {
        console.log(`  No orphaned records found for retry attempt ${attempt}`);
        break;
      }
      
      // Check which parent keys now exist
      const parentKeys = [...new Set(orphanedRecords.map(r => r[tableConfig.parentKey]).filter(Boolean))];
      
      const { data: existingParents, error: parentError } = await supabase
        .from(tableConfig.parentTable)
        .select(tableConfig.parentKey)
        .in(tableConfig.parentKey, parentKeys);
      
      if (parentError) {
        console.error(`  ❌ Error checking parent records:`, parentError);
        continue;
      }
      
      const existingParentKeys = new Set(existingParents?.map(r => r[tableConfig.parentKey]) || []);
      
      // Find records that can now be processed
      const processableRecords = orphanedRecords.filter(r => 
        r[tableConfig.parentKey] && existingParentKeys.has(r[tableConfig.parentKey])
      );
      
      if (processableRecords.length > 0) {
        // Mark as processed (you could also re-process them here)
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ processed_at: new Date().toISOString() })
          .in(tableConfig.childKey, processableRecords.map(r => r[tableConfig.childKey]));
        
        if (updateError) {
          console.error(`  ❌ Error updating processed records:`, updateError);
        } else {
          totalProcessed += processableRecords.length;
          console.log(`  ✅ Processed ${processableRecords.length} previously orphaned records`);
        }
      }
      
      // Wait before next attempt
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      }
    }
    
    console.log(`✅ Retry completed for ${tableName}. Total processed: ${totalProcessed}`);
    return totalProcessed;
    
  } catch (error) {
    console.error(`❌ Error retrying orphaned records for ${tableName}:`, error);
    return 0;
  }
}
