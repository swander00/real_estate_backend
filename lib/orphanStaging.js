// lib/orphanStaging.js - Staging system for orphaned records
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const DEBUG = true;

/**
 * Stage orphaned records for later processing instead of dropping them
 * @param {string} tableName - Table name
 * @param {Array} orphanedRecords - Records that failed parent enforcement
 * @returns {Promise<number>} Number of records staged
 */
export async function stageOrphanedRecords(tableName, orphanedRecords) {
  if (!orphanedRecords || orphanedRecords.length === 0) {
    return 0;
  }

  try {
    // For now, just log the orphaned records instead of staging them
    // This prevents the error and allows us to see what's being orphaned
    if (DEBUG) {
      console.log(`📦 Would stage ${orphanedRecords.length} orphaned records for ${tableName}`);
      
      // Log sample orphaned records for analysis
      const sampleRecords = orphanedRecords.slice(0, 3);
      sampleRecords.forEach((record, idx) => {
        const keyField = tableName === 'property_openhouse' ? 'OpenHouseKey' : 
                        tableName === 'property_rooms' ? 'RoomKey' : 'MediaKey';
        const parentKeyField = tableName === 'property_media' ? 'ResourceRecordKey' : 'ListingKey';
        console.log(`  Sample ${idx + 1}: ${parentKeyField}=${record[parentKeyField]}, ${keyField}=${record[keyField]}`);
      });
    }

    // TODO: Implement actual staging when database schema is ready
    // For now, return 0 to indicate no staging occurred
    return 0;

  } catch (error) {
    console.error(`❌ Error in stageOrphanedRecords for ${tableName}:`, error);
    return 0;
  }
}

/**
 * Process staged orphaned records when parents become available
 * @param {string} tableName - Table to process staged records for
 * @returns {Promise<number>} Number of records successfully processed
 */
export async function processStagedOrphanedRecords(tableName) {
  try {
    console.log(`🔄 Processing staged orphaned records for ${tableName}...`);

    // Get staged records for this table
    const { data: stagedRecords, error: selectError } = await supabase
      .from('orphaned_records_staging')
      .select('*')
      .eq('staging_table', tableName)
      .is('processed_at', null)
      .limit(1000);

    if (selectError || !stagedRecords?.length) {
      console.log(`  No staged records found for ${tableName}`);
      return 0;
    }

    // Get unique parent keys from staged records (ListingKey for most tables, ResourceRecordKey for property_media)
    const parentKeyField = tableName === 'property_media' ? 'ResourceRecordKey' : 'ListingKey';
    const parentKeys = [...new Set(stagedRecords.map(r => r[parentKeyField]).filter(Boolean))];

    // Check which parent keys now exist in common_fields
    const { data: existingParents, error: parentError } = await supabase
      .from('common_fields')
      .select('ListingKey')
      .in('ListingKey', parentKeys);

    if (parentError) {
      console.error(`❌ Error checking parent records:`, parentError);
      return 0;
    }

    const existingParentKeys = new Set(existingParents?.map(r => r.ListingKey) || []);

    // Find staged records that can now be processed
    const processableRecords = stagedRecords.filter(r => 
      r[parentKeyField] && existingParentKeys.has(r[parentKeyField])
    );

    if (processableRecords.length === 0) {
      console.log(`  No staged records can be processed yet for ${tableName}`);
      return 0;
    }

    // Remove staging metadata and prepare for insertion
    const recordsToProcess = processableRecords.map(record => {
      const { staged_at, staging_reason, staging_table, processed_at, ...cleanRecord } = record;
      return cleanRecord;
    });

    // Insert into the actual table
    const { error: insertError } = await supabase
      .from(tableName)
      .upsert(recordsToProcess, { 
        onConflict: tableName === 'property_rooms' ? 'ListingKey,Order' : 
                   tableName === 'property_openhouse' ? 'OpenHouseKey' :
                   tableName === 'property_media' ? 'MediaKey' : 'ListingKey',
        returning: 'minimal' 
      });

    if (insertError) {
      console.error(`❌ Error inserting staged records into ${tableName}:`, insertError);
      return 0;
    }

    // Mark staged records as processed
    const { error: updateError } = await supabase
      .from('orphaned_records_staging')
      .update({ processed_at: new Date().toISOString() })
      .in('id', processableRecords.map(r => r.id));

    if (updateError) {
      console.error(`❌ Error updating staged records:`, updateError);
    }

    console.log(`✅ Processed ${processableRecords.length} staged orphaned records for ${tableName}`);
    return processableRecords.length;

  } catch (error) {
    console.error(`❌ Error processing staged orphaned records for ${tableName}:`, error);
    return 0;
  }
}

/**
 * Clean up old staged records that can't be processed
 * @param {number} daysOld - Number of days old to consider for cleanup
 * @returns {Promise<number>} Number of records cleaned up
 */
export async function cleanupOldStagedRecords(daysOld = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('orphaned_records_staging')
      .delete()
      .lt('staged_at', cutoffDate.toISOString())
      .is('processed_at', null);

    if (error) {
      console.error(`❌ Error cleaning up old staged records:`, error);
      return 0;
    }

    const cleanedCount = data?.length || 0;
    console.log(`🧹 Cleaned up ${cleanedCount} old staged records (older than ${daysOld} days)`);
    return cleanedCount;

  } catch (error) {
    console.error(`❌ Error in cleanupOldStagedRecords:`, error);
    return 0;
  }
}
