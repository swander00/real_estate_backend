// lib/sync/propertySync.js
const { fetchODataPage } = require('../utils/fetchFeed');
const { getSyncLog } = require('../utils/db');
const { upsertBatch } = require('../utils/db');
const { mapProperty } = require('../mappers/mapProperty');
const logger = require('../utils/logger');

// Configuration from environment variables
const IDX_CONFIG = {
  baseUrl: process.env.IDX_BASE_URL || 'https://query.ampre.ca/odata/Property',
  // No filter - we'll fetch all and filter in code if needed
  filter: null
};

const VOW_CONFIG = {
  baseUrl: process.env.VOW_BASE_URL || 'https://query.ampre.ca/odata/Property', 
  // No filter - we'll fetch all and filter in code if needed
  filter: null
};

async function fetchIDXProperties(incremental = false) {
  logger.info(`[fetchIDXProperties] Fetching IDX properties (incremental: ${incremental})`);

  const token = process.env.IDX_TOKEN;
  if (!token) {
    throw new Error('IDX_TOKEN not set in environment');
  }

  // For incremental sync, add timestamp filter
  let filter = null;
  if (incremental) {
    const lastSync = await getSyncLog('IDX');
    if (lastSync) {
      const timestamp = new Date(lastSync).toISOString();
      // Use timestamp WITHOUT quotes - the API expects it this way
      filter = `ModificationTimestamp gt ${timestamp}`;
      logger.info(`[fetchIDXProperties] Incremental sync from: ${timestamp}`);
    } else {
      logger.info(`[fetchIDXProperties] No previous sync found, performing full sync`);
    }
  }

  logger.info(`[fetchIDXProperties] Fetching from: ${IDX_CONFIG.baseUrl}`);
  return await fetchWithSmartPagination(IDX_CONFIG.baseUrl, token, filter, 'IDX', 100000);
}

async function fetchVOWProperties(incremental = false) {
  logger.info(`[fetchVOWProperties] Fetching VOW properties (incremental: ${incremental})`);

  const token = process.env.VOW_TOKEN;
  if (!token) {
    throw new Error('VOW_TOKEN not set in environment');
  }

  // For incremental sync, add timestamp filter
  let filter = null;
  if (incremental) {
    const lastSync = await getSyncLog('VOW');
    if (lastSync) {
      const timestamp = new Date(lastSync).toISOString();
      // Use timestamp WITHOUT quotes - the API expects it this way
      filter = `ModificationTimestamp gt ${timestamp}`;
      logger.info(`[fetchVOWProperties] Incremental sync from: ${timestamp}`);
    } else {
      logger.info(`[fetchVOWProperties] No previous sync found, performing full sync`);
    }
  }

  logger.info(`[fetchVOWProperties] Fetching from: ${VOW_CONFIG.baseUrl}`);
  return await fetchWithSmartPagination(VOW_CONFIG.baseUrl, token, filter, 'VOW', 250000);
}

/**
 * Smart pagination that automatically switches to date-based chunking when needed
 */
async function fetchWithSmartPagination(baseUrl, token, baseFilter, label, expectedRecords) {
  const seenListingKeys = new Set();
  let totalFetched = 0;
  let totalUpserted = 0;
  let latestTimestamp = null;
  
  // First, try standard pagination
  logger.info(`[fetchWithSmartPagination:${label}] Starting standard pagination...`);
  const firstResult = await fetchAndUpsertBatchesInternal(
    baseUrl, 
    token, 
    baseFilter, 
    label, 
    seenListingKeys,
    false // Don't fail on limit
  );
  
  totalFetched += firstResult.totalFetched;
  totalUpserted += firstResult.totalUpserted;
  latestTimestamp = firstResult.latestTimestamp;
  
  // Check if we likely hit the API limit
  if (firstResult.hitLimit || totalFetched >= 99000) {
    logger.info(`[fetchWithSmartPagination:${label}] Hit or approaching API limit. Switching to date-based chunking...`);
    
    // Get the oldest timestamp from what we've fetched
    const oldestDate = firstResult.oldestTimestamp ? new Date(firstResult.oldestTimestamp) : new Date();
    
    // Fetch older records using date chunks
    const olderResults = await fetchOlderRecordsInChunks(
      baseUrl,
      token,
      baseFilter,
      label,
      oldestDate,
      seenListingKeys,
      expectedRecords
    );
    
    totalFetched += olderResults.totalFetched;
    totalUpserted += olderResults.totalUpserted;
    
    if (!latestTimestamp || (olderResults.latestTimestamp && olderResults.latestTimestamp > latestTimestamp)) {
      latestTimestamp = olderResults.latestTimestamp;
    }
  }
  
  logger.info(`[fetchWithSmartPagination:${label}] === Final Summary ===`);
  logger.info(`[fetchWithSmartPagination:${label}] Total records fetched: ${totalFetched}`);
  logger.info(`[fetchWithSmartPagination:${label}] Total unique records: ${seenListingKeys.size}`);
  logger.info(`[fetchWithSmartPagination:${label}] Total records upserted: ${totalUpserted}`);
  
  return {
    totalFetched,
    totalUpserted,
    totalUnique: seenListingKeys.size,
    latestTimestamp
  };
}

/**
 * Fetch older records in date-based chunks to bypass API limits
 */
async function fetchOlderRecordsInChunks(baseUrl, token, baseFilter, label, beforeDate, seenListingKeys, expectedRecords) {
  let totalFetched = 0;
  let totalUpserted = 0;
  let latestTimestamp = null;
  
  // Calculate chunk size based on expected records
  let daysPerChunk = expectedRecords > 1000000 ? 7 : expectedRecords > 100000 ? 30 : 90;
  
  let endDate = new Date(beforeDate);
  let startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysPerChunk);
  
  // Keep fetching chunks going backwards in time
  const maxChunks = 50; // Safety limit
  let chunkCount = 0;
  
  while (chunkCount < maxChunks) {
    chunkCount++;
    
    // Build filter for this date range - NO quotes around timestamps
    let chunkFilter = `ModificationTimestamp ge ${startDate.toISOString()} and ModificationTimestamp lt ${endDate.toISOString()}`;
    
    logger.info(`[fetchOlderRecordsInChunks:${label}] Chunk ${chunkCount}: Fetching ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    const result = await fetchAndUpsertBatchesInternal(
      baseUrl,
      token,
      chunkFilter,
      `${label}-chunk${chunkCount}`,
      seenListingKeys,
      true // Fail on limit (shouldn't happen with date chunks)
    );
    
    totalFetched += result.totalFetched;
    totalUpserted += result.totalUpserted;
    
    if (!latestTimestamp || (result.latestTimestamp && result.latestTimestamp > latestTimestamp)) {
      latestTimestamp = result.latestTimestamp;
    }
    
    // If we got no records, try going further back
    if (result.totalFetched === 0) {
      logger.info(`[fetchOlderRecordsInChunks:${label}] No records in this chunk, moving to older dates`);
      
      // Move to next chunk
      endDate = new Date(startDate);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - daysPerChunk);
      
      // Stop if we're going too far back (e.g., before year 2000)
      if (startDate < new Date('2000-01-01')) {
        logger.info(`[fetchOlderRecordsInChunks:${label}] Reached year 2000, stopping`);
        break;
      }
      
      continue;
    }
    
    // If this chunk was full (hit limit), split it into smaller chunks
    if (result.hitLimit) {
      logger.warn(`[fetchOlderRecordsInChunks:${label}] Chunk hit limit, need smaller date ranges`);
      // Reduce chunk size for next iteration
      daysPerChunk = Math.max(1, Math.floor(daysPerChunk / 2));
    }
    
    // Move to next chunk
    endDate = new Date(startDate);
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysPerChunk);
    
    // Stop if we've fetched enough unique records (with some buffer)
    if (seenListingKeys.size >= expectedRecords * 1.2) {
      logger.info(`[fetchOlderRecordsInChunks:${label}] Fetched expected number of records, stopping`);
      break;
    }
  }
  
  return {
    totalFetched,
    totalUpserted,
    latestTimestamp
  };
}

/**
 * Internal batch fetch and upsert function
 */
async function fetchAndUpsertBatchesInternal(baseUrl, token, filter, label, seenListingKeys, failOnLimit = true) {
  let totalFetched = 0;
  let totalUpserted = 0;
  let batchNumber = 0;
  let hasMoreData = true;
  let skip = 0;
  let latestTimestamp = null;
  let oldestTimestamp = null;
  let hitLimit = false;
  const batchSize = parseInt(process.env.BATCH_SIZE || 5000);
  const apiLimit = 100000; // RESO API hard limit

  try {
    while (hasMoreData) {
      // Check if we're approaching the API limit
      if (skip + batchSize > apiLimit) {
        const remaining = apiLimit - skip;
        if (remaining <= 0) {
          logger.warn(`[fetchAndUpsertBatches:${label}] Reached API limit of ${apiLimit.toLocaleString()} records`);
          hitLimit = true;
          hasMoreData = false;
          break;
        }
      }

      try {
        // Fetch batch
        const { value } = await fetchODataPage({
          baseUrl,
          token,
          top: batchSize,
          skip: skip,
          filter: filter
        });

        batchNumber++;
        logger.info(`[fetchAndUpsertBatches:${label}] Batch ${batchNumber}: Fetched ${value.length} records (skip=${skip})`);
        
        if (value.length === 0) {
          logger.info(`[fetchAndUpsertBatches:${label}] No more records found`);
          hasMoreData = false;
        } else {
          // Track oldest timestamp
          for (const record of value) {
            const timestamp = record.ModificationTimestamp || record.ModifiedOn;
            if (timestamp) {
              if (!oldestTimestamp || timestamp < oldestTimestamp) {
                oldestTimestamp = timestamp;
              }
            }
          }
          
          // Remove duplicates within this batch and against already seen records
          const uniqueRecords = [];
          let duplicatesInBatch = 0;
          
          for (const record of value) {
            if (record.ListingKey && !seenListingKeys.has(record.ListingKey)) {
              seenListingKeys.add(record.ListingKey);
              uniqueRecords.push(record);
            } else {
              duplicatesInBatch++;
            }
          }
          
          if (duplicatesInBatch > 0) {
            logger.info(`[fetchAndUpsertBatches:${label}] Removed ${duplicatesInBatch} duplicate records in batch ${batchNumber}`);
          }
          
          // Map and upsert unique records if any
          if (uniqueRecords.length > 0) {
            const mapped = uniqueRecords.map(mapProperty);
            const upsertedCount = await upsertBatch('property', mapped, 'ListingKey');
            
            totalFetched += value.length;
            totalUpserted += upsertedCount;
            
            logger.info(`[fetchAndUpsertBatches:${label}] Batch ${batchNumber}: Upserted ${upsertedCount} unique records`);
            
            // Track latest timestamp for sync log
            const batchLatestTimestamp = findLatestTimestamp(mapped);
            if (batchLatestTimestamp && (!latestTimestamp || batchLatestTimestamp > latestTimestamp)) {
              latestTimestamp = batchLatestTimestamp;
            }
          }
          
          // Check if we should continue
          if (value.length < batchSize) {
            logger.info(`[fetchAndUpsertBatches:${label}] Received ${value.length} records (less than batch size ${batchSize}), assuming end of data`);
            hasMoreData = false;
          } else {
            skip += value.length;
            
            if (skip >= apiLimit) {
              logger.warn(`[fetchAndUpsertBatches:${label}] Reached API limit of ${apiLimit.toLocaleString()} records`);
              hitLimit = true;
              hasMoreData = false;
            }
          }
        }
      } catch (error) {
        // Check if it's the API limit error
        if (error.message && error.message.includes('total exceeds 100000')) {
          logger.warn(`[fetchAndUpsertBatches:${label}] Hit API limit at skip=${skip}`);
          hitLimit = true;
          hasMoreData = false;
          if (failOnLimit) {
            throw new Error(`API limit hit unexpectedly in date chunk: ${filter}`);
          }
        } else {
          throw error;
        }
      }
    }

    if (totalFetched > 0) {
      const totalDuplicates = totalFetched - seenListingKeys.size;
      logger.info(`[fetchAndUpsertBatches:${label}] Subtotal: Fetched ${totalFetched}, Unique ${seenListingKeys.size}, Duplicates ${totalDuplicates}, Upserted ${totalUpserted}`);
    }
    
    return { 
      totalFetched, 
      totalUpserted, 
      totalUnique: seenListingKeys.size,
      latestTimestamp,
      oldestTimestamp,
      hitLimit
    };
  } catch (error) {
    logger.error(`[fetchAndUpsertBatches:${label}] Error during sync: ${error.message}`);
    throw error;
  }
}

function findLatestTimestamp(records) {
  if (!records || records.length === 0) return null;
  
  let latestTimestamp = null;
  const timestampFields = ['ModificationTimestamp', 'ModifiedOn', 'UpdatedAt', 'LastModified'];
  
  for (const record of records) {
    for (const field of timestampFields) {
      if (record[field]) {
        const timestamp = new Date(record[field]);
        if (!latestTimestamp || timestamp > new Date(latestTimestamp)) {
          latestTimestamp = record[field];
        }
        break;
      }
    }
  }
  
  return latestTimestamp;
}

module.exports = { fetchIDXProperties, fetchVOWProperties };