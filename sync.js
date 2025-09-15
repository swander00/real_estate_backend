#!/usr/bin/env node
require('dotenv').config();

const logger = require('./lib/utils/logger');
const { initializeDatabase, updateSyncLog } = require('./lib/utils/db');

const { fetchIDXProperties, fetchVOWProperties } = require('./lib/sync/propertySync');
const { fetchMediaRecords } = require('./lib/sync/mediaSync');

// Flags
const args = process.argv.slice(2);
const flags = {
  idxOnly: args.includes('--idx-only'),
  vowOnly: args.includes('--vow-only'),
  mediaOnly: args.includes('--media-only'),
  incremental: args.includes('--incremental'),
  failFast: args.includes('--fail-fast')
};

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('=== SYNC INTERRUPTED BY USER ===');
  process.exit(0);
});
process.on('SIGTERM', () => {
  logger.info('=== SYNC TERMINATED ===');
  process.exit(0);
});

async function main() {
  try {
    logger.info('=== TRREB RESO Web API Sync Started ===');
    logger.info(`Mode: ${getMode()}`);
    logger.info(`Incremental: ${flags.incremental}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Timestamp: ${new Date().toISOString()}`);

    await initializeDatabase();

    if (!flags.vowOnly && !flags.mediaOnly) {
      await processProperties('IDX', fetchIDXProperties);
    }

    if (!flags.idxOnly && !flags.mediaOnly) {
      await processProperties('VOW', fetchVOWProperties);
    }

    if (!flags.idxOnly && !flags.vowOnly) {
      await processMedia();
    }

    logger.info('=== SYNC COMPLETE ===');
    logger.info(`Completed at: ${new Date().toISOString()}`);
  } catch (err) {
    logger.error('Sync failed:', err.message || err);
    if (err.stack) {
      logger.error('Stack trace:', err.stack);
    }
    if (flags.failFast) process.exit(1);
  }
}

async function processProperties(label, fetchFn) {
  logger.info(`=== Starting ${label} Property Sync ===`);
  const startTime = Date.now();
  
  try {
    const result = await fetchFn(flags.incremental);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(
      `[${label}] ✅ Sync complete in ${duration}s: ${result.totalUpserted} records upserted (${result.totalUnique} unique out of ${result.totalFetched} fetched)`
    );

    // Debug logging for sync log update
    logger.info(`[${label}] Result object keys: ${JSON.stringify(Object.keys(result))}`);
    logger.info(`[${label}] Latest timestamp value: ${result.latestTimestamp || 'undefined'}`);

    // Update sync log with the latest timestamp
    if (result.latestTimestamp) {
      try {
        logger.info(`[${label}] Attempting to update sync log with timestamp: ${result.latestTimestamp}`);
        await updateSyncLog(label, result.latestTimestamp);
        logger.info(`[${label}] ✅ Successfully updated sync log with timestamp: ${result.latestTimestamp}`);
      } catch (syncLogError) {
        // Log the error but don't fail the entire sync
        logger.warn(`[${label}] ⚠️ Failed to update sync log: ${syncLogError.message}`);
        logger.warn(`[${label}] Sync completed successfully but incremental sync won't work until sync_log table is fixed`);
        if (syncLogError.stack) {
          logger.debug(`[${label}] Sync log error stack: ${syncLogError.stack}`);
        }
      }
    } else {
      logger.warn(`[${label}] ⚠️ No latestTimestamp in result - sync log NOT updated`);
      logger.warn(`[${label}] This means incremental sync will treat next run as full sync`);
    }
  } catch (err) {
    logger.error(`[${label}] ❌ Property sync failed:`, err.message || err);
    if (err.stack) {
      logger.error(`[${label}] Stack trace:`, err.stack);
    }
    if (flags.failFast) throw err;
  }
}

async function processMedia() {
  logger.info('=== Starting Media Sync ===');
  const startTime = Date.now();
  
  try {
    logger.info('[MEDIA] Calling fetchMediaRecords...');
    const result = await fetchMediaRecords(flags.incremental);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(
      `[MEDIA] ✅ Sync complete in ${duration}s: ${result.totalUpserted} media records upserted (${result.totalUnique} unique out of ${result.totalFetched} fetched)`
    );

    // Debug logging for sync log update
    logger.info(`[MEDIA] Result object keys: ${JSON.stringify(Object.keys(result))}`);
    logger.info(`[MEDIA] Result values: totalFetched=${result.totalFetched}, totalUpserted=${result.totalUpserted}, totalUnique=${result.totalUnique}`);
    logger.info(`[MEDIA] Latest timestamp value: ${result.latestTimestamp || 'undefined'}`);
    logger.info(`[MEDIA] Latest timestamp type: ${typeof result.latestTimestamp}`);

    // Update sync log with the latest timestamp
    if (result.latestTimestamp) {
      try {
        logger.info(`[MEDIA] Attempting to update sync log with timestamp: ${result.latestTimestamp}`);
        await updateSyncLog('MEDIA', result.latestTimestamp);
        logger.info(`[MEDIA] ✅ Successfully updated sync log with timestamp: ${result.latestTimestamp}`);
        
        // Verify it was saved
        const { getSyncLog } = require('./lib/utils/db');
        const savedTimestamp = await getSyncLog('MEDIA');
        logger.info(`[MEDIA] Verification: Sync log now contains: ${savedTimestamp}`);
        
      } catch (syncLogError) {
        // Log the error but don't fail the entire sync
        logger.warn(`[MEDIA] ⚠️ Failed to update sync log: ${syncLogError.message}`);
        logger.warn(`[MEDIA] Sync completed successfully but incremental sync won't work until sync_log table is fixed`);
        if (syncLogError.stack) {
          logger.debug(`[MEDIA] Sync log error stack: ${syncLogError.stack}`);
        }
      }
    } else {
      logger.warn(`[MEDIA] ⚠️ No latestTimestamp in result - sync log NOT updated`);
      logger.warn(`[MEDIA] This means incremental sync will treat next run as full sync`);
      logger.warn(`[MEDIA] This is a problem that needs to be fixed in mediaSync.js`);
    }
  } catch (err) {
    logger.error('[MEDIA] ❌ Media sync failed:', err.message || err);
    if (err.stack) {
      logger.error('[MEDIA] Stack trace:', err.stack);
    }
    if (flags.failFast) throw err;
  }
}

function getMode() {
  if (flags.idxOnly) return 'IDX Only';
  if (flags.vowOnly) return 'VOW Only';
  if (flags.mediaOnly) return 'Media Only';
  return 'Full Sync (IDX + VOW + Media)';
}

// Log unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) main();