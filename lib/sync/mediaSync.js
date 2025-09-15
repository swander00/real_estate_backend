// lib/sync/mediaSync.js
const { fetchODataPage } = require('../utils/fetchFeed');
const { getSyncLog } = require('../utils/db');
const { upsertBatch } = require('../utils/db');
const { mapMedia } = require('../mappers/mapMedia');
const logger = require('../utils/logger');

async function fetchMediaRecords(incremental = false) {
  logger.info(`[fetchMediaRecords] Starting - Version: FIXED WITH DEBUG`);
  logger.info(`[fetchMediaRecords] Fetching media records (incremental: ${incremental})`);

  const baseUrl = process.env.MEDIA_BASE_URL || process.env.MEDIA_URL || 'https://query.ampre.ca/odata/Media';
  const token = process.env.IDX_TOKEN; // Media feed usually uses IDX token

  logger.info(`[fetchMediaRecords] BaseURL: ${baseUrl}`);
  logger.info(`[fetchMediaRecords] Token exists: ${!!token}`);

  if (!token) {
    throw new Error('IDX_TOKEN not set in environment');
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
      incremental = false; // Treat as full sync if no previous sync
    }
  }

  logger.info(`[fetchMediaRecords] Starting media sync - about to call fetchMediaWithSmartPagination`);
  logger.info(`[fetchMediaRecords] Filter: ${filter || 'NO FILTER (full sync)'}`);
  
  // FIXED: Use smart pagination that handles large datasets
  const result = await fetchMediaWithSmartPagination(baseUrl, token, filter, incremental);
  
  logger.info(`[fetchMediaRecords] === Final Summary ===`);
  logger.info(`[fetchMediaRecords] Total media records fetched: ${result.totalFetched}`);
  logger.info(`[fetchMediaRecords] Total unique media records: ${result.totalUnique}`);
  logger.info(`[fetchMediaRecords] Total media records upserted: ${result.totalUpserted}`);
  logger.info(`[fetchMediaRecords] Latest timestamp to be saved in sync_log: ${result.latestTimestamp || 'NONE - SYNC LOG WILL NOT BE UPDATED!'}`);
  
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
  logger.info(`[fetchMediaWithSmartPagination] *** FUNCTION CALLED ***`);
  logger.info(`[fetchMediaWithSmartPagination] Incremental: ${incremental}`);
  logger.info(`[fetchMediaWithSmartPagination] BaseFilter: ${baseFilter || 'none'}`);
  
  const seenMediaKeys = new Set();
  let totalFetched = 0;
  let totalUpserted = 0;
  let latestTimestamp = null;
  
  // For full sync, use date-based chunks immediately to handle 2M+ records
  if (!incremental) {
    logger.info(`[fetchMediaWithSmartPagination] Full sync detected - calling fetchMediaInDateChunks`);
    return await fetchMediaInDateChunks(baseUrl, token, seenMediaKeys);
  }
  
  // For incremental, try standard pagination first
  logger.info(`[fetchMediaWithSmartPagination] Starting incremental media sync...`);
  const result = await fetchAndUpsertMediaBatchesInternal(
    baseUrl, 
    token, 
    baseFilter, 
    'MEDIA-INCREMENTAL', 
    seenMediaKeys,
    false // Don't fail on limit for incremental
  );
  
  totalFetched += result.totalFetched;
  totalUpserted += result.totalUpserted;
  latestTimestamp = result.latestTimestamp;
  
  logger.info(`[fetchMediaWithSmartPagination] After internal fetch: fetched=${totalFetched}, hitLimit=${result.hitLimit}`);
  
  // If we hit the limit in incremental, use date chunks to get the rest
  if (result.hitLimit) {
    logger.warn(`[fetchMediaWithSmartPagination] Incremental sync hit API limit. Switching to date-based chunks...`);
    
    // Continue with date-based chunks for the remaining period
    const oldestFetched = result.oldestTimestamp ? new Date(result.oldestTimestamp) : new Date();
    const lastSync = await getSyncLog('MEDIA');
    const startFrom = lastSync ? new Date(lastSync) : new Date('2010-01-01');
    
    logger.info(`[fetchMediaWithSmartPagination] Need to fetch from ${startFrom.toISOString()} to ${oldestFetched.toISOString()}`);
    
    if (oldestFetched > startFrom) {
      logger.info(`[fetchMediaWithSmartPagination] Fetching remaining records with date chunks`);
      
      const remainingResult = await fetchMediaInDateRange(
        baseUrl,
        token,
        startFrom,
        oldestFetched,
        seenMediaKeys
      );
      
      totalFetched += remainingResult.totalFetched;
      totalUpserted += remainingResult.totalUpserted;
      
      if (!latestTimestamp || (remainingResult.latestTimestamp && remainingResult.latestTimestamp > latestTimestamp)) {
        latestTimestamp = remainingResult.latestTimestamp;
      }
    }
  }
  
  logger.info(`[fetchMediaWithSmartPagination] === Summary ===`);
  logger.info(`[fetchMediaWithSmartPagination] Total fetched: ${totalFetched}`);
  logger.info(`[fetchMediaWithSmartPagination] Total unique: ${seenMediaKeys.size}`);
  logger.info(`[fetchMediaWithSmartPagination] Total upserted: ${totalUpserted}`);
  
  return {
    totalFetched,
    totalUpserted,
    totalUnique: seenMediaKeys.size,
    latestTimestamp
  };
}

/**
 * Fetch media in a specific date range using chunks
 */
async function fetchMediaInDateRange(baseUrl, token, startDate, endDate, seenMediaKeys) {
  logger.info(`[fetchMediaInDateRange] Called with range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  // Use environment variable for Media URL
  const mediaBaseUrl = process.env.MEDIA_BASE_URL || process.env.MEDIA_URL || 'https://query.ampre.ca/odata/Media';
  
  let totalFetched = 0;
  let totalUpserted = 0;
  let latestTimestamp = null;
  
  const daysPerChunk = 7; // Weekly chunks
  let currentEnd = new Date(endDate);
  let currentStart = new Date(currentEnd);
  currentStart.setDate(currentStart.getDate() - daysPerChunk);
  
  let rangeChunkCount = 0;
  
  while (currentEnd > startDate && rangeChunkCount < 100) {
    rangeChunkCount++;
    
    if (currentStart < startDate) {
      currentStart = new Date(startDate);
    }
    
    const chunkFilter = `MediaModificationTimestamp ge ${currentStart.toISOString()} and MediaModificationTimestamp lt ${currentEnd.toISOString()}`;
    
    logger.info(`[fetchMediaInDateRange] Range chunk ${rangeChunkCount}: ${currentStart.toISOString().split('T')[0]} to ${currentEnd.toISOString().split('T')[0]}`);
    logger.info(`[fetchMediaInDateRange] Filter: ${chunkFilter}`);
    
    const result = await fetchAndUpsertMediaBatchesInternal(
      mediaBaseUrl,  // Use hardcoded URL
      token,
      chunkFilter,
      `MEDIA-range-${rangeChunkCount}`,
      seenMediaKeys,
      false
    );
    
    logger.info(`[fetchMediaInDateRange] Chunk ${rangeChunkCount} result: fetched=${result.totalFetched}, hitLimit=${result.hitLimit}`);
    
    if (result.hitLimit) {
      logger.warn(`[fetchMediaInDateRange] Weekly chunk hit limit, breaking down to daily`);
      
      // If even a week hits the limit, break it down to daily chunks
      const dailyResults = await fetchMediaDailyInRange(
        mediaBaseUrl,  // Use hardcoded URL
        token,
        currentStart,
        currentEnd,
        seenMediaKeys
      );
      
      totalFetched += dailyResults.totalFetched;
      totalUpserted += dailyResults.totalUpserted;
      
      if (!latestTimestamp || (dailyResults.latestTimestamp && dailyResults.latestTimestamp > latestTimestamp)) {
        latestTimestamp = dailyResults.latestTimestamp;
      }
    } else {
      totalFetched += result.totalFetched;
      totalUpserted += result.totalUpserted;
      
      if (!latestTimestamp || (result.latestTimestamp && result.latestTimestamp > latestTimestamp)) {
        latestTimestamp = result.latestTimestamp;
      }
    }
    
    // Move to next chunk
    currentEnd = new Date(currentStart);
    currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() - daysPerChunk);
  }
  
  logger.info(`[fetchMediaInDateRange] Completed ${rangeChunkCount} chunks: fetched=${totalFetched}, upserted=${totalUpserted}`);
  
  return {
    totalFetched,
    totalUpserted,
    latestTimestamp
  };
}

/**
 * Fetch media in date chunks for large datasets (2M+ records)
 */
async function fetchMediaInDateChunks(baseUrl, token, seenMediaKeys) {
  logger.info(`[fetchMediaInDateChunks] *** STARTING DATE-BASED CHUNKING ***`);
  
  // Use environment variable for Media URL
  const mediaBaseUrl = process.env.MEDIA_BASE_URL || process.env.MEDIA_URL || 'https://query.ampre.ca/odata/Media';
  
  let totalFetched = 0;
  let totalUpserted = 0;
  let latestTimestamp = null;
  
  // For 2M+ records, use weekly chunks
  const daysPerChunk = 7;
  
  // Start from today and work backwards to configured start date
  const now = new Date();
  const targetStartDate = new Date(process.env.MEDIA_SYNC_START_DATE || '2024-01-01T00:00:00Z'); // Default: January 1, 2024
  let endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 1); // Include today
  let startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysPerChunk);
  
  logger.info(`[fetchMediaInDateChunks] Starting from: ${endDate.toISOString()}`);
  logger.info(`[fetchMediaInDateChunks] Target end date: ${targetStartDate.toISOString()}`);
  logger.info(`[fetchMediaInDateChunks] Days per chunk: ${daysPerChunk}`);
  logger.info(`[fetchMediaInDateChunks] Using URL: ${mediaBaseUrl}`);
  
  const maxChunks = 500; // Increased for 2M+ records
  let chunkCount = 0;
  let emptyChunks = 0;
  const skippedWeeks = []; // Track weeks that hit the limit
  
  while (chunkCount < maxChunks) {
    chunkCount++;
    
    // Build filter for this date range - FIXED: Using MediaModificationTimestamp
    const chunkFilter = `MediaModificationTimestamp ge ${startDate.toISOString()} and MediaModificationTimestamp lt ${endDate.toISOString()}`;
    
    logger.info(`[fetchMediaInDateChunks] === CHUNK ${chunkCount} ===`);
    logger.info(`[fetchMediaInDateChunks] Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    logger.info(`[fetchMediaInDateChunks] Filter: ${chunkFilter}`);
    
    const result = await fetchAndUpsertMediaBatchesInternal(
      mediaBaseUrl,  // Use hardcoded URL
      token,
      chunkFilter,
      `MEDIA-chunk${chunkCount}`,
      seenMediaKeys,
      false // Don't fail on limit, handle it
    );
    
    logger.info(`[fetchMediaInDateChunks] Chunk ${chunkCount} completed:`);
    logger.info(`[fetchMediaInDateChunks]   - Fetched: ${result.totalFetched}`);
    logger.info(`[fetchMediaInDateChunks]   - Unique: ${result.totalUnique}`);
    logger.info(`[fetchMediaInDateChunks]   - Upserted: ${result.totalUpserted}`);
    logger.info(`[fetchMediaInDateChunks]   - Hit limit: ${result.hitLimit}`);
    
    totalFetched += result.totalFetched;
    totalUpserted += result.totalUpserted;
    
    if (!latestTimestamp || (result.latestTimestamp && result.latestTimestamp > latestTimestamp)) {
      latestTimestamp = result.latestTimestamp;
    }
    
    // If we got no records, increment empty chunk counter
    if (result.totalFetched === 0) {
      emptyChunks++;
      logger.info(`[fetchMediaInDateChunks] Empty chunk! (${emptyChunks} consecutive empty chunks)`);
      
      // If we've had 10 consecutive empty chunks, assume we've gone far enough back
      if (emptyChunks >= 10) {
        logger.info(`[fetchMediaInDateChunks] ${emptyChunks} consecutive empty chunks, stopping`);
        break;
      }
    } else {
      emptyChunks = 0; // Reset counter if we found records
      logger.info(`[fetchMediaInDateChunks] Found records, resetting empty counter`);
      
      // If this chunk hit the limit, we need smaller chunks
      if (result.hitLimit) {
        logger.warn(`[fetchMediaInDateChunks] Chunk ${chunkCount} hit API limit!`);
        logger.warn(`[fetchMediaInDateChunks] This week has too many records (${result.totalFetched}+ records)`);
        logger.warn(`[fetchMediaInDateChunks] Skipping this week for now and continuing to previous periods...`);
        logger.warn(`[fetchMediaInDateChunks] We'll come back to this week later if needed`);
        
        // Skip the daily breakdown for now and continue to previous weeks
        // This prevents getting stuck on a single week with massive data
        logger.info(`[fetchMediaInDateChunks] Skipping daily breakdown, continuing to previous weeks`);
        
        // Track this week to process later
        skippedWeeks.push({
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          recordsFound: result.totalFetched
        });
        
        // Still count the records we did fetch
        totalFetched += result.totalFetched;
        totalUpserted += result.totalUpserted;
        
        if (!latestTimestamp || (result.latestTimestamp && result.latestTimestamp > latestTimestamp)) {
          latestTimestamp = result.latestTimestamp;
        }
      }
    }
    
    // Move to next chunk
    endDate = new Date(startDate);
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysPerChunk);
    
    logger.info(`[fetchMediaInDateChunks] Moving to next chunk: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Stop if we've reached our target start date (January 1, 2024)
    if (startDate <= targetStartDate) {
      logger.info(`[fetchMediaInDateChunks] Reached target start date (January 1, 2024), stopping`);
      break;
    }
    
    // Log progress every 10 chunks
    if (chunkCount % 10 === 0) {
      logger.info(`[fetchMediaInDateChunks] *** PROGRESS UPDATE ***`);
      logger.info(`[fetchMediaInDateChunks] Chunks processed: ${chunkCount}`);
      logger.info(`[fetchMediaInDateChunks] Total fetched: ${totalFetched}`);
      logger.info(`[fetchMediaInDateChunks] Total unique: ${seenMediaKeys.size}`);
      logger.info(`[fetchMediaInDateChunks] Total upserted: ${totalUpserted}`);
    }
  }
  
  // Process skipped weeks if any
  if (skippedWeeks.length > 0) {
    logger.info(`[fetchMediaInDateChunks] *** PROCESSING ${skippedWeeks.length} SKIPPED WEEKS ***`);
    
    for (let i = 0; i < skippedWeeks.length; i++) {
      const week = skippedWeeks[i];
      logger.info(`[fetchMediaInDateChunks] Processing skipped week ${i + 1}/${skippedWeeks.length}: ${week.startDate.toISOString().split('T')[0]} to ${week.endDate.toISOString().split('T')[0]} (${week.recordsFound} records)`);
      
      try {
        const dailyResults = await fetchMediaDailyInRange(
          mediaBaseUrl,
          token,
          week.startDate,
          week.endDate,
          seenMediaKeys
        );
        
        logger.info(`[fetchMediaInDateChunks] Skipped week ${i + 1} completed: fetched=${dailyResults.totalFetched}, upserted=${dailyResults.totalUpserted}`);
        
        totalFetched += dailyResults.totalFetched;
        totalUpserted += dailyResults.totalUpserted;
        
        if (!latestTimestamp || (dailyResults.latestTimestamp && dailyResults.latestTimestamp > latestTimestamp)) {
          latestTimestamp = dailyResults.latestTimestamp;
        }
      } catch (error) {
        logger.error(`[fetchMediaInDateChunks] Failed to process skipped week ${i + 1}: ${error.message}`);
        // Continue with other weeks
      }
    }
  }
  
  logger.info(`[fetchMediaInDateChunks] *** DATE CHUNKING COMPLETED ***`);
  logger.info(`[fetchMediaInDateChunks] Total chunks processed: ${chunkCount}`);
  logger.info(`[fetchMediaInDateChunks] Skipped weeks processed: ${skippedWeeks.length}`);
  logger.info(`[fetchMediaInDateChunks] Final totals: fetched=${totalFetched}, unique=${seenMediaKeys.size}, upserted=${totalUpserted}`);
  logger.info(`[fetchMediaInDateChunks] Latest timestamp for sync log: ${latestTimestamp || 'NONE - THIS IS A PROBLEM'}`);
  
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
  logger.info(`[fetchMediaDailyInRange] Breaking down week into daily chunks`);
  logger.info(`[fetchMediaDailyInRange] Range: ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}`);
  
  // Use environment variable for Media URL
  const mediaBaseUrl = process.env.MEDIA_BASE_URL || process.env.MEDIA_URL || 'https://query.ampre.ca/odata/Media';
  
  let totalFetched = 0;
  let totalUpserted = 0;
  let latestTimestamp = null;
  
  let currentDate = new Date(rangeStart);
  let dayCount = 0;
  
  while (currentDate < rangeEnd) {
    dayCount++;
    const dayStart = new Date(currentDate);
    const dayEnd = new Date(currentDate);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const dayFilter = `MediaModificationTimestamp ge ${dayStart.toISOString()} and MediaModificationTimestamp lt ${dayEnd.toISOString()}`;
    
    logger.info(`[fetchMediaDailyInRange] Day ${dayCount}: ${dayStart.toISOString().split('T')[0]}`);
    
    const result = await fetchAndUpsertMediaBatchesInternal(
      mediaBaseUrl,  // Use hardcoded URL
      token,
      dayFilter,
      `MEDIA-day-${dayStart.toISOString().split('T')[0]}`,
      seenMediaKeys,
      false
    );
    
    logger.info(`[fetchMediaDailyInRange] Day ${dayCount} result: fetched=${result.totalFetched}, hitLimit=${result.hitLimit}`);
    
    if (result.hitLimit) {
      logger.warn(`[fetchMediaDailyInRange] Day ${dayStart.toISOString().split('T')[0]} hit 100K limit, breaking into hourly chunks`);
      
      // Fetch this day in hourly chunks to get ALL data
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(dayStart);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(dayStart);
        hourEnd.setHours(hour + 1, 0, 0, 0);
        
        const hourFilter = `MediaModificationTimestamp ge ${hourStart.toISOString()} and MediaModificationTimestamp lt ${hourEnd.toISOString()}`;
        
        logger.info(`[fetchMediaDailyInRange] Fetching hour ${hour}:00-${hour + 1}:00 of ${dayStart.toISOString().split('T')[0]}`);
        
        const hourResult = await fetchAndUpsertMediaBatchesInternal(
          mediaBaseUrl,  // Use hardcoded URL
          token,
          hourFilter,
          `MEDIA-hour-${dayStart.toISOString().split('T')[0]}-${hour}`,
          seenMediaKeys,
          false
        );
        
        logger.info(`[fetchMediaDailyInRange] Hour ${hour} fetched: ${hourResult.totalFetched} records, hitLimit: ${hourResult.hitLimit}`);
        
        if (hourResult.hitLimit) {
          logger.error(`[fetchMediaDailyInRange] Hour ${hour} ALSO hit 100K limit! This hour has massive data.`);
          // Could implement minute-level chunking here if needed
        }
        
        totalFetched += hourResult.totalFetched;
        totalUpserted += hourResult.totalUpserted;
        
        if (!latestTimestamp || (hourResult.latestTimestamp && hourResult.latestTimestamp > latestTimestamp)) {
          latestTimestamp = hourResult.latestTimestamp;
        }
      }
    } else {
      // Normal processing for days that didn't hit the limit
      totalFetched += result.totalFetched;
      totalUpserted += result.totalUpserted;
      
      if (!latestTimestamp || (result.latestTimestamp && result.latestTimestamp > latestTimestamp)) {
        latestTimestamp = result.latestTimestamp;
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  logger.info(`[fetchMediaDailyInRange] Completed ${dayCount} days: fetched=${totalFetched}`);
  
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
  logger.debug(`[fetchAndUpsertMediaBatchesInternal:${label}] Starting`);
  logger.debug(`[fetchAndUpsertMediaBatchesInternal:${label}] Filter: ${filter || 'NO FILTER'}`);
  
  let totalFetched = 0;
  let totalUpserted = 0;
  let batchNumber = 0;
  let hasMoreData = true;
  let skip = 0;
  let latestTimestamp = null;
  let oldestTimestamp = null;
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
          // Track oldest timestamp for potential continuation
          for (const record of value) {
            const timestamp = record.MediaModificationTimestamp || record.ModificationTimestamp;
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
            if (batchLatestTimestamp) {
              logger.debug(`[fetchAndUpsertMediaBatches:${label}] Batch ${batchNumber} latest timestamp: ${batchLatestTimestamp}`);
              if (!latestTimestamp || batchLatestTimestamp > latestTimestamp) {
                latestTimestamp = batchLatestTimestamp;
                logger.debug(`[fetchAndUpsertMediaBatches:${label}] Updated overall latest timestamp to: ${latestTimestamp}`);
              }
            } else {
              logger.warn(`[fetchAndUpsertMediaBatches:${label}] Batch ${batchNumber} had no timestamp!`);
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
      oldestTimestamp,
      hitLimit
    };
  } catch (error) {
    logger.error(`[fetchAndUpsertMediaBatches:${label}] Error during media sync: ${error.message}`);
    throw error;
  }
}

function findLatestTimestamp(records) {
  if (!records || records.length === 0) {
    logger.debug(`[findLatestTimestamp] No records provided`);
    return null;
  }
  
  let latestTimestamp = null;
  const timestampFields = ['MediaModificationTimestamp', 'ModificationTimestamp', 'ModifiedOn', 'UpdatedAt'];
  
  for (const record of records) {
    for (const field of timestampFields) {
      if (record[field]) {
        const timestamp = new Date(record[field]);
        if (!latestTimestamp || timestamp > new Date(latestTimestamp)) {
          latestTimestamp = record[field];
          logger.debug(`[findLatestTimestamp] Found newer timestamp: ${latestTimestamp} from field ${field}`);
        }
        break;
      }
    }
  }
  
  if (!latestTimestamp) {
    logger.warn(`[findLatestTimestamp] No timestamp found in ${records.length} records`);
  }
  
  return latestTimestamp;
}

module.exports = { fetchMediaRecords };