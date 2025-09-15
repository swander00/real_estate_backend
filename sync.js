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
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

async function main() {
  try {
    logger.info('=== TRREB RESO Web API Sync Started ===');
    logger.info(`Mode: ${getMode()}`);
    logger.info(`Incremental: ${flags.incremental}`);

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
  } catch (err) {
    logger.error('Sync failed:', err.message || err);
    if (flags.failFast) process.exit(1);
  }
}

async function processProperties(label, fetchFn) {
  logger.info(`=== Starting ${label} Property Sync ===`);
  try {
    const result = await fetchFn(flags.incremental);
    
    logger.info(
      `[${label}] ✅ Sync complete: ${result.totalUpserted} records upserted (${result.totalUnique} unique out of ${result.totalFetched} fetched)`
    );

    // Update sync log with the latest timestamp
    if (result.latestTimestamp) {
      try {
        await updateSyncLog(label, result.latestTimestamp);
        logger.info(`[${label}] Updated sync log with timestamp: ${result.latestTimestamp}`);
      } catch (syncLogError) {
        // Log the error but don't fail the entire sync
        logger.warn(`[${label}] Failed to update sync log: ${syncLogError.message}`);
        logger.warn(`[${label}] Sync completed successfully but incremental sync won't work until sync_log table is fixed`);
      }
    }
  } catch (err) {
    logger.error(`[${label}] ❌ Property sync failed:`, err.message || err);
    if (flags.failFast) throw err;
  }
}

async function processMedia() {
  logger.info('=== Starting Media Sync ===');
  try {
    const result = await fetchMediaRecords(flags.incremental);
    
    logger.info(
      `[MEDIA] ✅ Sync complete: ${result.totalUpserted} media records upserted (${result.totalUnique} unique out of ${result.totalFetched} fetched)`
    );

    // Update sync log with the latest timestamp
    if (result.latestTimestamp) {
      try {
        await updateSyncLog('MEDIA', result.latestTimestamp);
        logger.info(`[MEDIA] Updated sync log with timestamp: ${result.latestTimestamp}`);
      } catch (syncLogError) {
        // Log the error but don't fail the entire sync
        logger.warn(`[MEDIA] Failed to update sync log: ${syncLogError.message}`);
        logger.warn(`[MEDIA] Sync completed successfully but incremental sync won't work until sync_log table is fixed`);
      }
    }
  } catch (err) {
    logger.error('[MEDIA] ❌ Media sync failed:', err.message || err);
    if (flags.failFast) throw err;
  }
}

function getMode() {
  if (flags.idxOnly) return 'IDX Only';
  if (flags.vowOnly) return 'VOW Only';
  if (flags.mediaOnly) return 'Media Only';
  return 'Full Sync (IDX + VOW + Media)';
}

if (require.main === module) main();