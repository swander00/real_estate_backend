// lib/upsert/upsertMedia.js
const { upsertBatch } = require('../utils/db');
const logger = require('../utils/logger');

async function upsertMedia(records) {
  if (!records || records.length === 0) {
    logger.info('[upsertMedia] No media records to upsert.');
    return 0;
  }

  try {
    // Use the centralized upsertBatch function
    // Media table has composite unique constraint on both ResourceRecordKey and MediaKey
    const count = await upsertBatch('media', records, ['ResourceRecordKey', 'MediaKey']);
    return count;
  } catch (err) {
    logger.error('[upsertMedia] ❌ Error during media upsert:', err.message);
    throw err;
  }
}

module.exports = { upsertMedia };