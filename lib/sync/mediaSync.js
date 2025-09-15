// lib/sync/mediaSync.js
const { fetchODataPage } = require('../utils/fetchFeed');
const { getSyncLog } = require('../utils/db');
const { upsertBatch } = require('../utils/db');
const { mapMedia } = require('../mappers/mapMedia');
const logger = require('../utils/logger');

async function fetchMediaRecords(incremental = false) {
  logger.info(`[fetchMediaRecords] Fetching media records (incremental: ${incremental})`);

  const baseUrl = process.env.MEDIA_URL;
  const token = process.env.IDX_TOKEN; // Media feed usually uses IDX token

  if (!baseUrl || !token) {
    throw new Error('MEDIA_URL or IDX_TOKEN not set in environment');
  }

  // For incremental sync, use MediaModificationTimestamp field
  let filter = null;
  if (incremental) {
    const lastSync = await getSyncLog('MEDIA');
    if (lastSync) {
      const timestamp = new Date(lastSync).toISOString();
      // Use MediaModificationTimestamp for media records (not ModificationTimestamp)
      filter = `MediaModificationTimestamp gt ${timestamp}`;
      logger.info(`[fetchMediaRecords] Incremental sync from: ${timestamp}`);
    } else {
      logger.info(`[fetchMediaRecords] No previous sync found, performing full sync`);
    }
  }

  logger.info(`[fetchMediaRecords] Starting media sync`);
  
  const seenMediaKeys = new Set();
  const result = await fetchAndUpsertMediaBatchesInternal(
    baseUrl,
    token,
    filter,
    'MEDIA',
    seenMediaKeys,
    false
  );
  
  if (!incremental && result.hitLimit) {
    logger.warn(`[fetchMediaRecords] Hit API limit at ${result.totalFetched} records`);
    logger.warn(`[fetchMediaRecords] Media sync is limited to first 100K records due to API constraints`);
  }
  
  logger.info(`[fetchMediaRecords] === Final Summary ===`);
  logger.info(`[fetchMediaRecords] Total media records fetched: ${result.totalFetched}`);
  logger.info(`[fetchMediaRecords] Total unique media records: ${result.totalUnique}`);
  logger.info(`[fetchMediaRecords] Total media records upserted: ${result.totalUpserted}`);
  
  return {
    totalFetched: result.totalFetched,
    totalUpserted: result.totalUpserted,
    totalUnique: result.totalUnique,
    latestTimestamp: result.latestTimestamp
  };
}

/**
 * Smart pagination for media that handles millions of records
 */
async function fetchMediaWithSmartPagination(baseUrl, token, baseFilter, incremental) {
  const seenMediaKeys = new Set();
  let totalFetched = 0;
  let totalUpserted = 0;
  let latestTimestamp = null;
  
  // For media, start with date-based chunks immediately due to volume
  if (!incremental) {
    logger.info(`[fetchMediaWithSmartPagination] Using date-based chunking for large media dataset`);
    return await fetchMediaInDateChunks(baseUrl, token, seenMediaKeys);
  }
  
  // For incremental, try standard pagination first
  logger.info(`[fetchMediaWithSmartPagination] Starting incremental media sync...`);
  const result = await fetchAndUpsertMediaBatchesInternal(
    baseUrl, 
    token, 
    baseFilter, 
    'MEDIA', 
    seenMediaKeys,
    false // Don't fail on limit for incremental
  );
  
  totalFetched += result.totalFetched;
  totalUpserted += result.totalUpserted;
  latestTimestamp = result.latestTimestamp;
  
  // If we hit the limit in incremental, warn but continue
  if (result.hitLimit) {
    logger.warn(`[fetchMediaWithSmartPagination] Incremental sync hit API limit. Some records may be missed.`);
    logger.warn(`[fetchMediaWithSmartPagination] Consider running a full sync to ensure all records are captured.`);
  }
  
  logger.info(`[fetchMediaWithSmartPagination] === Final Summary ===`);
  logger.info(`[fetchMediaWithSmartPagination] Total media records fetched: ${totalFetched}`);
  logger.info(`[fetchMediaWithSmartPagination] Total unique media records: ${seenMediaKeys.size}`);
  logger.info(`[fetchMediaWithSmartPagination] Total media records upserted: ${totalUpserted}`);
  
  return {
    totalFetched,
    totalUpserted,
    totalUnique: seenMediaKeys.size,
    latestTimestamp
  };
}

/**
 * Fetch media in date chunks for large datasets (2M+ records)
 */
async function fetchMediaInDateChunks(baseUrl, token, seenMediaKeys) {
  let totalFetched = 0;
  let totalUpserted = 0;
  let latestTimestamp = null;
  
  // For 2M+ records, use weekly chunks initially
  const daysPerChunk = 7;
  
  // Start from today and work backwards
  const now = new Date();
  let endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 1); // Include today
  let startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysPerChunk);
  
  const maxChunks = 200; // More chunks for media due to volume
  let chunkCount = 0;
  let emptyChunks = 0;
  
  while (chunkCount < maxChunks) {
    chunkCount++;
    
    // Build filter for this date range
    const chunkFilter = `ModificationTimestamp ge ${startDate.toISOString()} and ModificationTimestamp lt ${endDate.toISOString()}`;
    
    logger.info(`[fetchMediaInDateChunks] Chunk ${chunkCount}: Fetching ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    const result = await fetchAndUpsertMediaBatchesInternal(
      baseUrl,
      token,
      chunkFilter,
      `MEDIA-chunk${chunkCount}`,
      seenMediaKeys,
      true // Fail on limit (shouldn't happen with small date chunks)
    );
    
    totalFetched += result.totalFetched;
    totalUpserted += result.totalUpserted;
    
    if (!latestTimestamp || (result.latestTimestamp && result.latestTimestamp > latestTimestamp)) {
      latestTimestamp = result.latestTimestamp;
    }
    
    // If we got no records, increment empty chunk counter
    if (result.totalFetched === 0) {
      emptyChunks++;
      logger.info(`[fetchMediaInDateChunks] No records in this chunk (${emptyChunks} empty chunks so far)`);
      
      // If we've had 10 consecutive empty chunks, assume we've gone far enough back
      if (emptyChunks >= 10) {
        logger.info(`[fetchMediaInDateChunks] ${emptyChunks} consecutive empty chunks, stopping`);
        break;
      }
    } else {
      emptyChunks = 0; // Reset counter if we found records
      
      // If this chunk hit the limit, we need smaller chunks
      if (result.hitLimit) {
        logger.warn(`[fetchMediaInDateChunks] Chunk ${chunkCount} hit API limit with ${daysPerChunk} day range`);
        logger.warn(`[fetchMediaInDateChunks] This date range has too many records. Consider using smaller chunks.`);
        
        // Split this range into daily chunks
        const dailyResults = await fetchMediaDailyInRange(
          baseUrl,
          token,
          startDate,
          endDate,
          seenMediaKeys
        );
        
        totalFetched += dailyResults.totalFetched;
        totalUpserted += dailyResults.totalUpserted;
        
        if (!latestTimestamp || (dailyResults.latestTimestamp && dailyResults.latestTimestamp > latestTimestamp)) {
          latestTimestamp = dailyResults.latestTimestamp;
        }
      }
    }
    
    // Move to next chunk
    endDate = new Date(startDate);
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysPerChunk);
    
    // Stop if we're going too far back
    if (startDate < new Date('2010-01-01')) {
      logger.info(`[fetchMediaInDateChunks] Reached 2010, stopping`);
      break;
    }
    
    // Log progress every 10 chunks
    if (chunkCount % 10 === 0) {
      logger.info(`[fetchMediaInDateChunks] Progress: ${totalFetched} fetched, ${seenMediaKeys.size} unique, ${totalUpserted} upserted`);
    }
  }
  
  return {
    totalFetched,
    totalUpserted,
    totalUnique: seenMediaKeys.size,
    latestTimestamp
  };
}

/**
 * Fetch media daily when weekly chunks are too large
 */
async function fetchMediaDailyInRange(baseUrl, token, rangeStart, rangeEnd, seenMediaKeys) {
  let totalFetched = 0;
  let totalUpserted = 0;
  let latestTimestamp = null;
  
  let currentDate = new Date(rangeStart);
  
  while (currentDate < rangeEnd) {
    const dayStart = new Date(currentDate);
    const dayEnd = new Date(currentDate);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const dayFilter = `ModificationTimestamp ge ${dayStart.toISOString()} and ModificationTimestamp lt ${dayEnd.toISOString()}`;
    
    logger.info(`[fetchMediaDailyInRange] Fetching day: ${dayStart.toISOString().split('T')[0]}`);
    
    const result = await fetchAndUpsertMediaBatchesInternal(
      baseUrl,
      token,
      dayFilter,
      `MEDIA-day-${dayStart.toISOString().split('T')[0]}`,
      seenMediaKeys,
      false // Don't fail, log if limit hit
    );
    
    if (result.hitLimit) {
      logger.error(`[fetchMediaDailyInRange] Single day ${dayStart.toISOString().split('T')[0]} has more than 100K records!`);
      logger.error(`[fetchMediaDailyInRange] This requires hourly chunking or custom handling.`);
    }
    
    totalFetched += result.totalFetched;
    totalUpserted += result.totalUpserted;
    
    if (!latestTimestamp || (result.latestTimestamp && result.latestTimestamp > latestTimestamp)) {
      latestTimestamp = result.latestTimestamp;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return {
    totalFetched,
    totalUpserted,
    latestTimestamp
  };
}

/**
 * Internal batch fetch and upsert function for media
 */
async function fetchAndUpsertMediaBatchesInternal(baseUrl, token, filter, label, seenMediaKeys, failOnLimit = true) {
  let totalFetched = 0;
  let totalUpserted = 0;
  let batchNumber = 0;
  let hasMoreData = true;
  let skip = 0;
  let latestTimestamp = null;
  let hitLimit = false;
  const batchSize = parseInt(process.env.BATCH_SIZE || 5000);
  const apiLimit = 100000;

  try {
    while (hasMoreData) {
      // Check if we're approaching the API limit
      if (skip + batchSize > apiLimit) {
        const remaining = apiLimit - skip;
        if (remaining <= 0) {
          logger.warn(`[fetchAndUpsertMediaBatches:${label}] Reached API limit of ${apiLimit.toLocaleString()} records`);
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
        logger.info(`[fetchAndUpsertMediaBatches:${label}] Batch ${batchNumber}: Fetched ${value.length} media records (skip=${skip})`);
        
        if (value.length === 0) {
          logger.info(`[fetchAndUpsertMediaBatches:${label}] No more records found`);
          hasMoreData = false;
        } else {
          // Remove duplicates within this batch and against already seen records
          const uniqueRecords = [];
          let duplicatesInBatch = 0;
          
          for (const record of value) {
            // Create composite key for media (ResourceRecordKey + MediaKey)
            const compositeKey = `${record.ResourceRecordKey}_${record.MediaKey}`;
            if (record.ResourceRecordKey && record.MediaKey && !seenMediaKeys.has(compositeKey)) {
              seenMediaKeys.add(compositeKey);
              uniqueRecords.push(record);
            } else {
              duplicatesInBatch++;
            }
          }
          
          if (duplicatesInBatch > 0) {
            logger.info(`[fetchAndUpsertMediaBatches:${label}] Removed ${duplicatesInBatch} duplicate records in batch ${batchNumber}`);
          }
          
          // Map and upsert unique records if any
          if (uniqueRecords.length > 0) {
            const mapped = uniqueRecords.map(mapMedia);
            const upsertedCount = await upsertBatch('media', mapped, ['ResourceRecordKey', 'MediaKey']);
            
            totalFetched += value.length;
            totalUpserted += upsertedCount;
            
            logger.info(`[fetchAndUpsertMediaBatches:${label}] Batch ${batchNumber}: Upserted ${upsertedCount} unique media records`);
            
            // Track latest timestamp for sync log
            const batchLatestTimestamp = findLatestTimestamp(mapped);
            if (batchLatestTimestamp && (!latestTimestamp || batchLatestTimestamp > latestTimestamp)) {
              latestTimestamp = batchLatestTimestamp;
            }
          }
          
          // Check if we should continue
          if (value.length < batchSize) {
            logger.info(`[fetchAndUpsertMediaBatches:${label}] Received ${value.length} records (less than batch size ${batchSize}), assuming end of data`);
            hasMoreData = false;
          } else {
            skip += value.length;
            
            if (skip >= apiLimit) {
              logger.warn(`[fetchAndUpsertMediaBatches:${label}] Reached API limit of ${apiLimit.toLocaleString()} records`);
              hitLimit = true;
              hasMoreData = false;
            }
          }
        }
      } catch (error) {
        // Check if it's the API limit error
        if (error.message && error.message.includes('total exceeds 100000')) {
          logger.warn(`[fetchAndUpsertMediaBatches:${label}] Hit API limit at skip=${skip}`);
          hitLimit = true;
          hasMoreData = false;
          if (failOnLimit) {
            logger.error(`[fetchAndUpsertMediaBatches:${label}] Date chunk unexpectedly hit limit: ${filter}`);
          }
        } else {
          throw error;
        }
      }
    }

    if (totalFetched > 0) {
      const totalDuplicates = totalFetched - seenMediaKeys.size;
      logger.info(`[fetchAndUpsertMediaBatches:${label}] Subtotal: Fetched ${totalFetched}, Unique ${seenMediaKeys.size}, Duplicates ${totalDuplicates}, Upserted ${totalUpserted}`);
    }
    
    return { 
      totalFetched, 
      totalUpserted, 
      totalUnique: seenMediaKeys.size,
      latestTimestamp,
      hitLimit
    };
  } catch (error) {
    logger.error(`[fetchAndUpsertMediaBatches:${label}] Error during media sync: ${error.message}`);
    throw error;
  }
}

function findLatestTimestamp(records) {
  if (!records || records.length === 0) return null;
  
  let latestTimestamp = null;
  const timestampFields = ['ModificationTimestamp', 'MediaModificationTimestamp', 'ModifiedOn', 'UpdatedAt'];
  
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

module.exports = { fetchMediaRecords };