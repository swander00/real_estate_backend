const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

let supabase;

async function initializeDatabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in environment');
    }
    
    supabase = createClient(url, key);
  }

  try {
    // ✅ Use a simple select limit(1) for connection test (safe even on empty tables)
    const { data, error } = await supabase
      .from('property')
      .select('*')
      .limit(1);

    if (error) {
      logger.error('❌ Supabase error during connection test:');
      logger.error(JSON.stringify(error, null, 2));
      throw new Error(error.message || 'Supabase returned an unknown error');
    }

    logger.info(
      data?.length
        ? `✅ Database connection established – sample row fetched`
        : `✅ Database connection established – no rows found (table is empty)`
    );

    return supabase;
  } catch (err) {
    logger.error('❌ Database connection failed:');
    logger.error(err?.message || 'Unknown error');
    if (err?.stack) logger.error(err.stack);
    throw err;
  }
}

async function upsertBatch(tableName, records, conflictColumns) {
  if (!records || records.length === 0) {
    logger.info(`[upsertBatch] No records to upsert to ${tableName}.`);
    return 0;
  }

  if (!supabase) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }

  try {
    logger.info(`[upsertBatch] Upserting ${records.length} records into "${tableName}" table...`);
    
    // For debugging: log sample record structure
    if (process.env.DEBUG === 'true') {
      logger.debug(`[upsertBatch] Sample record keys for ${tableName}:`, Object.keys(records[0]));
    }

    const { data, error, status } = await supabase
      .from(tableName)
      .upsert(records, {
        onConflict: conflictColumns,
        ignoreDuplicates: false
      })
      .select(); // Return the upserted records for counting

    if (error) {
      logger.error(`[upsertBatch] ❌ Supabase error for ${tableName}:`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status
      });

      // Log first record to identify field mismatch
      if (process.env.DEBUG === 'true') {
        logger.error(`[upsertBatch] First record payload for debugging:`, records[0]);
      }

      throw error;
    }

    const count = data?.length || records.length;
    logger.info(`[upsertBatch] ✅ Successfully upserted ${count} records to ${tableName}.`);
    return count;
  } catch (err) {
    logger.error(`[upsertBatch] ❌ Fatal error during upsert to ${tableName}:`, err.message);
    throw err;
  }
}

async function getSyncLog(resourceType) {
  if (!supabase) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }

  try {
    const { data, error } = await supabase
      .from('sync_log')
      .select('lastprocessedtimestamp')
      .eq('resourcetype', resourceType)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error(`Error getting sync log for ${resourceType}:`, error.message);
      throw error;
    }
    
    if (data?.lastprocessedtimestamp) {
      logger.info(`[getSyncLog] Found last sync for ${resourceType}: ${data.lastprocessedtimestamp}`);
    } else {
      logger.info(`[getSyncLog] No previous sync found for ${resourceType}`);
    }
    
    return data?.lastprocessedtimestamp || null;
  } catch (error) {
    logger.error(`Error getting sync log for ${resourceType}:`, error.message);
    throw error;
  }
}

async function updateSyncLog(resourceType, timestamp) {
  if (!supabase) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }

  if (!timestamp) {
    logger.warn(`[updateSyncLog] No timestamp provided for ${resourceType}, skipping sync log update`);
    return;
  }

  try {
    const { data, error, status } = await supabase
      .from('sync_log')
      .upsert(
        {
          resourcetype: resourceType,
          lastprocessedtimestamp: timestamp,
          updatedat: new Date().toISOString()
        },
        { onConflict: 'resourcetype' }
      )
      .select();

    if (error) {
      logger.error(`[updateSyncLog] Error updating sync log for ${resourceType}:`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status
      });
      
      // Check if it's a table not found error
      if (error.code === '42P01') {
        logger.error(`[updateSyncLog] Table 'sync_log' does not exist. Please create it with:`);
        logger.error(`
CREATE TABLE sync_log (
  resourcetype TEXT PRIMARY KEY,
  lastprocessedtimestamp TIMESTAMP,
  updatedat TIMESTAMP DEFAULT NOW()
);`);
      }
      
      throw error;
    }
    
    logger.info(`[updateSyncLog] ✅ Updated sync log for ${resourceType}: ${timestamp}`);
  } catch (error) {
    logger.error(`[updateSyncLog] Fatal error:`, error.message || error);
    throw error;
  }
}

function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return supabase;
}

module.exports = {
  initializeDatabase,
  upsertBatch,
  getSyncLog,
  updateSyncLog,
  getSupabaseClient
};