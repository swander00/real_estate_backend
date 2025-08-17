// lib/syncListingsIdx.js - Time window coordinated sync with clean output
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchODataPage } from './fetchFeed.js';
import { computePropertyFirstImages } from './derivedTables.js';

import { mapCommonFields } from '../mappers/mapCommonFields.js';
import { mapResidentialFreehold } from '../mappers/mapResidentialFreehold.js';
import { mapResidentialCondo } from '../mappers/mapResidentialCondo.js';
import { mapResidentialLease } from '../mappers/mapResidentialLease.js';
import { mapPropertyOpenhouse } from '../mappers/mapPropertyOpenhouse.js';
import { mapPropertyMedia } from '../mappers/mapPropertyMedia.js';
import { mapPropertyRooms } from '../mappers/mapPropertyRooms.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const FETCH_BATCH = 5000;   // records per API page
const UPSERT_CHUNK = 1000;  // rows per DB upsert
const UPSERT_RETRIES = 3;
const WINDOW_SIZE_DAYS = 30; // Process data in 30-day windows for full sync
const INCREMENTAL_WINDOW_HOURS = 48; // 48-hour window for incremental sync

// Time window coordinated table configuration
const SYNC_CONFIG = {
  master: {
    name: 'common_fields',
    url: process.env.IDX_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapCommonFields(item, {}) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    testLimit: 15000,
    timestampField: 'ModificationTimestamp'
  },
  
  propertyTypes: [
    {
      name: 'residential_freehold',
      url: process.env.FREEHOLD_URL,
      token: process.env.IDX_TOKEN,
      mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialFreehold(item, {}) }),
      conflictKeys: 'ListingKey',
      filterFn: (r) => !!r.ListingKey,
      timestampField: 'SystemModificationTimestamp'
    },
    {
      name: 'residential_condo',
      url: process.env.CONDO_URL,
      token: process.env.IDX_TOKEN,
      mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialCondo(item) }),
      conflictKeys: 'ListingKey',
      filterFn: (r) => !!r.ListingKey,
      timestampField: 'SystemModificationTimestamp'
    },
    {
      name: 'residential_lease',
      url: process.env.LEASE_URL,
      token: process.env.IDX_TOKEN,
      mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialLease(item) }),
      conflictKeys: 'ListingKey',
      filterFn: (r) => !!r.ListingKey,
      timestampField: 'SystemModificationTimestamp'
    }
  ],
  
  details: [
    {
      name: 'property_openhouse',
      url: process.env.OPENHOUSE_URL,
      token: process.env.IDX_TOKEN,
      mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapPropertyOpenhouse(item) }),
      conflictKeys: 'ListingKey,OpenHouseKey',
      filterFn: (r) => !!r.ListingKey && !!r.OpenHouseKey,
      timestampField: 'ModificationTimestamp'
    },
    {
      name: 'property_media',
      url: process.env.MEDIA_URL,
      token: process.env.IDX_TOKEN,
      mapRow: (item) => ({ 
        ResourceRecordKey: item.ResourceRecordKey,
        MediaKey: item.MediaKey, 
        ListingKey: item.ResourceRecordKey,
        ...mapPropertyMedia(item) 
      }),
      conflictKeys: 'ResourceRecordKey,MediaURL',
      filterFn: (r) => !!r.ResourceRecordKey && !!r.MediaKey && !!r.MediaURL,
      timestampField: 'ModificationTimestamp'
    },
    {
      name: 'property_rooms',
      url: process.env.ROOMS_URL,
      token: process.env.IDX_TOKEN,
      mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapPropertyRooms(item) }),
      conflictKeys: 'RoomKey',
      filterFn: (r) => !!r.RoomKey && !!r.ListingKey,
      timestampField: 'ModificationTimestamp'
    }
  ]
};

const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));

// Sync state management functions
async function getSyncState(key) {
  try {
    const { data, error } = await supabase
      .from('sync_state')
      .select('last_sync')
      .eq('sync_key', key)
      .single();
    
    if (error || !data) {
      console.log(`📅 No previous sync state found for ${key}, using fallback`);
      return null;
    }
    
    return new Date(data.last_sync);
  } catch (error) {
    console.error('Error getting sync state:', error);
    return null;
  }
}

async function updateSyncState(key, timestamp) {
  try {
    const { error } = await supabase
      .from('sync_state')
      .upsert({
        sync_key: key,
        last_sync: timestamp.toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'sync_key'
      });
    
    if (error) throw error;
    console.log(`📝 Updated sync state for ${key}: ${timestamp.toISOString()}`);
  } catch (error) {
    console.error('Error updating sync state:', error);
    throw error;
  }
}

async function upsertWithRetry(table, rows, conflict) {
  let attempt = 0;
  while (true) {
    try {
      const { error } = await supabase
        .from(table)
        .upsert(rows, { onConflict: conflict, returning: 'minimal' });
      if (error) throw new Error(error.message);
      return;
    } catch (err) {
      attempt += 1;
      if (attempt > UPSERT_RETRIES) {
        console.error(`    ❌ ${table} upsert failed after ${UPSERT_RETRIES} retries:`, err.message);
        throw err;
      }
      const backoff = 500 * Math.pow(2, attempt - 1);
      console.warn(`    ⚠️ ${table} upsert attempt ${attempt} failed: ${err.message}. Retrying in ${backoff}ms…`);
      await sleep(backoff);
    }
  }
}

// Query only the keys that exist in common_fields and return a Set
async function intersectWithCommonFields(listingKeys) {
  if (!listingKeys.length) return new Set();
  const chunks = chunk(listingKeys, 1000);
  const existing = new Set();
  for (const keys of chunks) {
    const { data, error } = await supabase
      .from('common_fields')
      .select('ListingKey')
      .in('ListingKey', keys);
    if (error) {
      console.error('    ❌ intersect query error:', error.message);
      continue;
    }
    for (const row of data || []) existing.add(row.ListingKey);
  }
  return existing;
}

async function fetchTableInWindow(tableConfig, windowStart, windowEnd, testMode = false) {
  const { name, url, token, mapRow, conflictKeys, filterFn, timestampField } = tableConfig;
  
  try {
    let allRecords = [];
    let totalFetched = 0;
    let hasMore = true;
    let skip = 0;
    
    // Apply test mode limits to master table only
    const maxRecords = testMode && name === 'common_fields' ? tableConfig.testLimit : null;
    
    while (hasMore) {
      // Build time window filter
      const startDateStr = formatODataDate(windowStart);
      const endDateStr = formatODataDate(windowEnd);
      const timeFilter = `${timestampField} ge ${startDateStr} and ${timestampField} lt ${endDateStr}`;
      
      const fetchParams = {
        baseUrl: url,
        token,
        filter: timeFilter,
        orderby: `${timestampField} asc`,
        top: FETCH_BATCH,
        skip: skip
      };

      const { records, next: nextLink } = await fetchODataPage(fetchParams);
      
      if (!records || !records.length) {
        hasMore = false;
        break;
      }
      
      totalFetched += records.length;
      
      // Apply test mode limit check
      let recordsToProcess = records;
      if (maxRecords && allRecords.length + records.length > maxRecords) {
        const remaining = maxRecords - allRecords.length;
        recordsToProcess = records.slice(0, remaining);
        hasMore = false;
      }
      
      allRecords.push(...recordsToProcess);
      
      // Check if we have more data
      if (records.length < FETCH_BATCH) {
        hasMore = false;
      } else {
        skip += FETCH_BATCH;
      }
      
      // Stop if we hit test mode limit
      if (maxRecords && allRecords.length >= maxRecords) {
        hasMore = false;
      }
      
      // Small delay between requests
      await sleep(50);
    }
    
    // Map and filter records
    let mapped = allRecords.map(mapRow);
    if (filterFn) {
      mapped = mapped.filter(filterFn);
    }
    
    // Enforce parent relationship for child tables
    let dropped = 0;
    if (name !== 'common_fields') {
      const keys = Array.from(new Set(mapped.map(r => r.ListingKey).filter(Boolean)));
      const existing = await intersectWithCommonFields(keys);
      const before = mapped.length;
      mapped = mapped.filter(r => existing.has(r.ListingKey));
      dropped = before - mapped.length;
    }
    
    return { 
      records: mapped, 
      totalFetched, 
      processed: mapped.length,
      dropped 
    };
    
  } catch (error) {
    console.error(`    ❌ ${name} error:`, error.message);
    return { records: [], totalFetched: 0, processed: 0, dropped: 0, error: true };
  }
}

async function processTimeWindow(windowStart, windowEnd, testMode = false) {
  console.log(`\n🕐 Processing time window: ${windowStart.toISOString()} to ${windowEnd.toISOString()}`);
  
  const results = {
    master: 0,
    propertyTypes: {},
    details: {},
    errors: [],
    listingKeys: new Set()
  };
  
  try {
    // 1. Process master table first
    console.log(`  📦 Fetching master table: ${SYNC_CONFIG.master.name}`);
    const masterResult = await fetchTableInWindow(SYNC_CONFIG.master, windowStart, windowEnd, testMode);
    
    if (masterResult.error) {
      console.error(`❌ Master table failed, skipping window`);
      return results;
    }
    
    if (masterResult.records.length > 0) {
      // Collect all ListingKeys from master
      masterResult.records.forEach(r => {
        if (r.ListingKey) results.listingKeys.add(r.ListingKey);
      });
      
      // Upsert master data
      const chunks = chunk(masterResult.records, UPSERT_CHUNK);
      for (const rows of chunks) {
        await upsertWithRetry(SYNC_CONFIG.master.name, rows, SYNC_CONFIG.master.conflictKeys);
        await sleep(30);
      }
      results.master = masterResult.processed;
      console.log(`    ✅ ${SYNC_CONFIG.master.name}: ${masterResult.processed} records (${masterResult.totalFetched} fetched)`);
    } else {
      console.log(`    ⚪ ${SYNC_CONFIG.master.name}: No data in this window`);
      return results; // No point processing child tables if no master data
    }
    
    // 2. Process property type tables (parallel)
    console.log(`  📦 Fetching property type tables...`);
    const propertyTypePromises = SYNC_CONFIG.propertyTypes.map(async (config) => {
      try {
        const result = await fetchTableInWindow(config, windowStart, windowEnd, testMode);
        
        if (result.records.length > 0) {
          const chunks = chunk(result.records, UPSERT_CHUNK);
          for (const rows of chunks) {
            await upsertWithRetry(config.name, rows, config.conflictKeys);
            await sleep(30);
          }
        }
        
        results.propertyTypes[config.name] = result.processed;
        let statusText = `    ✅ ${config.name}: ${result.processed} records`;
        if (result.dropped > 0) statusText += ` (${result.dropped} dropped)`;
        console.log(statusText);
        return { name: config.name, count: result.processed };
        
      } catch (error) {
        console.error(`    ❌ ${config.name}: ${error.message}`);
        results.errors.push(`${config.name}: ${error.message}`);
        results.propertyTypes[config.name] = 0;
        return { name: config.name, count: 0, error: error.message };
      }
    });
    
    await Promise.all(propertyTypePromises);
    
    // 3. Process detail tables (parallel)
    console.log(`  📦 Fetching detail tables...`);
    const detailPromises = SYNC_CONFIG.details.map(async (config) => {
      try {
        const result = await fetchTableInWindow(config, windowStart, windowEnd, testMode);
        
        if (result.records.length > 0) {
          const chunks = chunk(result.records, UPSERT_CHUNK);
          for (const rows of chunks) {
            await upsertWithRetry(config.name, rows, config.conflictKeys);
            await sleep(30);
          }
        }
        
        results.details[config.name] = result.processed;
        let statusText = `    ✅ ${config.name}: ${result.processed} records`;
        if (result.dropped > 0) statusText += ` (${result.dropped} dropped)`;
        console.log(statusText);
        return { name: config.name, count: result.processed };
        
      } catch (error) {
        console.error(`    ❌ ${config.name}: ${error.message}`);
        results.errors.push(`${config.name}: ${error.message}`);
        results.details[config.name] = 0;
        return { name: config.name, count: 0, error: error.message };
      }
    });
    
    await Promise.all(detailPromises);
    
    // 4. Compute derived tables for this window
    if (results.listingKeys.size > 0) {
      try {
        const listingKeysArray = Array.from(results.listingKeys);
        await computePropertyFirstImages(listingKeysArray);
        console.log(`    ✅ property_first_image: computed for ${listingKeysArray.length} listings`);
      } catch (error) {
        console.error(`    ❌ property_first_image: ${error.message}`);
        results.errors.push(`property_first_image: ${error.message}`);
      }
    }
    
    return results;
    
  } catch (error) {
    console.error(`    ❌ Time window error:`, error.message);
    results.errors.push(`Window processing: ${error.message}`);
    return results;
  }
}

function createTimeWindows(startDate, endDate, windowSizeDays) {
  const windows = [];
  const windowSizeMs = windowSizeDays * 24 * 60 * 60 * 1000;
  
  let currentStart = new Date(startDate);
  
  while (currentStart < endDate) {
    const currentEnd = new Date(Math.min(currentStart.getTime() + windowSizeMs, endDate.getTime()));
    windows.push({
      start: new Date(currentStart),
      end: new Date(currentEnd)
    });
    currentStart = new Date(currentEnd);
  }
  
  return windows;
}

export async function syncListingsIdx(testMode = false, incrementalMode = false) {
  const syncType = incrementalMode ? 'incremental' : testMode ? 'test' : 'full';
  console.log(`🚀 Starting IDX sync (${syncType} mode) - Time Window Coordinated`);
  
  // Determine date range
  let startDate, endDate;
  if (incrementalMode) {
    const lastSync = await getSyncState('idx-incremental');
    startDate = lastSync || new Date(Date.now() - INCREMENTAL_WINDOW_HOURS * 60 * 60 * 1000);
    endDate = new Date();
    
    console.log(`📅 Incremental sync from: ${startDate.toISOString()}`);
    console.log(`📅 Incremental sync until: ${endDate.toISOString()}`);
  } else if (testMode) {
    // Test mode: just last 7 days
    endDate = new Date();
    startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log(`🧪 Test mode: syncing last 7 days`);
    console.log(`📅 From: ${startDate.toISOString()}`);
    console.log(`📅 Until: ${endDate.toISOString()}`);
  } else {
    // Full sync: last 2 years
    endDate = new Date();
    startDate = new Date(endDate.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
    
    console.log(`🔄 Full sync: last 2 years`);
    console.log(`📅 From: ${startDate.toISOString()}`);
    console.log(`📅 Until: ${endDate.toISOString()}`);
  }
  
  // Create time windows
  const windowSizeDays = testMode ? 1 : (incrementalMode ? 1 : WINDOW_SIZE_DAYS);
  const windows = createTimeWindows(startDate, endDate, windowSizeDays);
  
  console.log(`📊 Processing ${windows.length} time windows (${windowSizeDays} days each)`);
  
  const totals = {
    windows: windows.length,
    masterRecords: 0,
    propertyTypes: {},
    details: {},
    errors: []
  };
  
  // Initialize totals for tracking
  SYNC_CONFIG.propertyTypes.forEach(config => {
    totals.propertyTypes[config.name] = 0;
  });
  SYNC_CONFIG.details.forEach(config => {
    totals.details[config.name] = 0;
  });
  
  // Process each time window
  for (let i = 0; i < windows.length; i++) {
    const window = windows[i];
    console.log(`\n📊 Window ${i + 1}/${windows.length}:`);
    
    const windowResult = await processTimeWindow(window.start, window.end, testMode);
    
    // Update totals
    totals.masterRecords += windowResult.master || 0;
    
    if (windowResult.propertyTypes) {
      Object.entries(windowResult.propertyTypes).forEach(([name, count]) => {
        totals.propertyTypes[name] += count;
      });
    }
    
    if (windowResult.details) {
      Object.entries(windowResult.details).forEach(([name, count]) => {
        totals.details[name] += count;
      });
    }
    
    if (windowResult.errors?.length) {
      totals.errors.push(...windowResult.errors);
    }
    
    // Small delay between windows
    await sleep(200);
  }
  
  console.log('\n📈 Final Results:');
  console.log(`  Windows processed: ${totals.windows}`);
  console.log(`  ${SYNC_CONFIG.master.name}: ${totals.masterRecords} records processed`);
  
  Object.entries(totals.propertyTypes).forEach(([name, count]) => {
    console.log(`  ${name}: ${count} records processed`);
  });
  
  Object.entries(totals.details).forEach(([name, count]) => {
    console.log(`  ${name}: ${count} records processed`);
  });
  
  if (totals.errors.length > 0) {
    console.log(`\n⚠️ Errors encountered:`);
    totals.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // Update sync state for incremental mode
  if (incrementalMode) {
    await updateSyncState('idx-incremental', endDate);
    console.log(`✅ Updated incremental sync state to: ${endDate.toISOString()}`);
  }
  
  console.log('\n✅ IDX time window sync complete');
}

// Format date for OData query (with datetime prefix)
const formatODataDate = (date) => {
  const isoString = date.toISOString().split('.')[0] + 'Z';
  return `datetime'${isoString}'`;
};

// Local testing support - Windows compatible
if (process.argv[1] && process.argv[1].endsWith('syncListingsIdx.js')) {
  console.log('🚀 Testing IDX time window sync locally...');
  const testMode = process.argv.includes('--test');
  const incrementalMode = process.argv.includes('--incremental');
  
  syncListingsIdx(testMode, incrementalMode)
    .then(() => {
      console.log('✅ Local test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Local test failed:', error);
      process.exit(1);
    });
}