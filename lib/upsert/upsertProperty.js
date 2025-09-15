// lib/upsert/upsertProperty.js
const { upsertBatch } = require('../utils/db');
const logger = require('../utils/logger');

async function upsertProperty(records) {
  if (!records || records.length === 0) {
    logger.info('[upsertProperty] No property records to upsert.');
    return 0;
  }

  try {
    // Use the centralized upsertBatch function
    const count = await upsertBatch('property', records, 'ListingKey');
    return count;
  } catch (err) {
    logger.error('[upsertProperty] ❌ Error during property upsert:', err.message);
    throw err;
  }
}

module.exports = { upsertProperty };