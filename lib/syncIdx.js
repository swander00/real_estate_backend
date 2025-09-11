// lib/syncIdx.js - Complete IDX synchronization (all tables including media)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchODataPage } from './fetchFeed.js';
import { mapCommonFields } from '../mappers/mapCommonFields.js';
import { mapPropertyMedia } from '../mappers/mapPropertyMediaNew.js';
import { mapPropertyOpenhouse } from '../mappers/mapPropertyOpenhouse.js';
import { mapPropertyRooms } from '../mappers/mapPropertyRooms.js';
import { mapResidentialCondo } from '../mappers/mapResidentialCondo.js';
import { mapResidentialFreehold } from '../mappers/mapResidentialFreehold.js';
import { mapResidentialLease } from '../mappers/mapResidentialLease.js';
import { stageOrphanedRecords } from './orphanStaging.js';

const DEBUG = true;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const FETCH_BATCH = 5000;
const UPSERT_CHUNK = 2000;
const UPSERT_RETRIES = 3;
const MAX_RECORDS_PER_SYNC = 95000;
const API_MAX_SKIP_PLUS_TOP = 100000;

// Helpers
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));
const dlog = (...args) => { if (DEBUG) console.log(...args); };

/**
 * Get the current record count for a table to determine starting skip position
 * @param {string} tableName - Table to check
 * @returns {Promise<number>} Current record count
 */
async function getCurrentRecordCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`❌ Error getting record count for ${tableName}:`, error);
      return 0;
    }
    
    const actualCount = count || 0;
    if (DEBUG) {
      console.log(`  🔍 ${tableName} actual count: ${actualCount}`);
    }
    
    return actualCount;
  } catch (error) {
    console.error(`❌ Error in getCurrentRecordCount for ${tableName}:`, error);
    return 0;
  }
}

// Table configuration - All IDX tables
const TABLES = [
  {
    name: 'common_fields',
    url: process.env.IDX_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapCommonFields(item, {}), DataSource: 'IDX' }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: false,
    priority: 1
  },
  {
    name: 'residential_freehold',
    url: process.env.IDX_FREEHOLD_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialFreehold(item, {}) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: true,
    priority: 2
  },
  {
    name: 'residential_condo',
    url: process.env.IDX_CONDO_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialCondo(item) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: true,
    priority: 2
  },
  {
    name: 'residential_lease',
    url: process.env.IDX_LEASE_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialLease(item) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: true,
    priority: 2
  },
  {
    name: 'property_media',
    url: process.env.MEDIA_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => mapPropertyMedia(item),
    conflictKeys: 'ResourceRecordKey,MediaKey',
    filterFn: (r) => !!r.MediaKey && !!r.ResourceRecordKey,
    enforceParent: true,
    priority: 3,
    // Add RESO-compliant filters as per document recommendations
    apiFilters: "ResourceName eq 'Property' and ImageSizeDescription eq 'Largest'"
  },
  {
    name: 'property_openhouse',
    url: process.env.IDX_OPENHOUSE_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapPropertyOpenhouse(item) }),
    conflictKeys: 'OpenHouseKey',
    filterFn: (r) => !!r.ListingKey && !!r.OpenHouseKey,
    enforceParent: true,
    priority: 3
  },
  {
    name: 'property_rooms',
    url: process.env.IDX_ROOMS_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => mapPropertyRooms(item),
    conflictKeys: 'ListingKey,RoomKey',
    filterFn: (r) => !!r.RoomKey && !!r.ListingKey,
    enforceParent: true,
    priority: 3
  }
];

// Clear table data before sync with chunked deletion
async function clearTable(tableName) {
  try {
    dlog(`🗑️  Clearing ${tableName} table...`);
    
    let totalDeleted = 0;
    let batchSize = 5000;
    
    while (true) {
      let deleteQuery;
      
      // Use table-specific clearing strategy with LIMIT
      switch (tableName) {
        case 'common_fields':
          deleteQuery = supabase
            .from(tableName)
            .delete()
            .neq('ListingKey', '')
            .limit(batchSize);
          break;
        case 'residential_freehold':
        case 'residential_condo':
        case 'residential_lease':
          deleteQuery = supabase
            .from(tableName)
            .delete()
            .neq('ListingKey', '')
            .limit(batchSize);
          break;
        case 'property_media':
          deleteQuery = supabase
            .from(tableName)
            .delete()
            .neq('MediaKey', '')
            .limit(batchSize);
          break;
        case 'property_openhouse':
          deleteQuery = supabase
            .from(tableName)
            .delete()
            .neq('OpenHouseKey', '')
            .limit(batchSize);
          break;
        case 'property_rooms':
          deleteQuery = supabase
            .from(tableName)
            .delete()
            .neq('RoomKey', '')
            .limit(batchSize);
          break;
        default:
          // Fallback: delete with timestamp limit
          deleteQuery = supabase
            .from(tableName)
            .delete()
            .gte('created_at', '1900-01-01')
            .limit(batchSize);
      }
      
      const { error, count } = await deleteQuery;
      
      if (error && !error.message.includes('No rows found')) {
        throw new Error(error.message);
      }
      
      // If no rows were deleted, we're done
      if (!count || count === 0) {
        break;
      }
      
      totalDeleted += count;
      dlog(`    Deleted ${count} rows (${totalDeleted} total)`);
      
      // Small delay between batches to prevent overwhelming the DB
      await sleep(100);
      
      // If we deleted fewer than batch size, we're done
      if (count < batchSize) {
        break;
      }
    }
    
    console.log(`✅ ${tableName} table cleared (${totalDeleted} records deleted)`);
  } catch (error) {
    console.error(`❌ Failed to clear ${tableName}:`, error.message);
    throw error;
  }
}

async function upsertWithRetry(table, rows, conflict) {
  let attempt = 0;

  if (DEBUG) {
    dlog(`    💾 ${table} upsert: ${rows.length} records, conflict: ${conflict || 'none'}`);
  }

  while (true) {
    try {
      let query;
      if (conflict) {
        // Use upsert with conflict resolution
        query = supabase.from(table).upsert(rows, { onConflict: conflict, returning: 'minimal' });
      } else {
        // Use regular insert
        query = supabase.from(table).insert(rows, { returning: 'minimal' });
      }
      
      const { data, error } = await query;
      
      if (error) {
        if (DEBUG) {
          dlog(`    ❌ ${table} database error: ${error.message}`);
          dlog(`    📊 Error details: ${JSON.stringify(error, null, 2)}`);
          
          // Log sample problematic records for debugging
          if (rows.length > 0) {
            dlog(`    🔍 Sample record being processed: ${JSON.stringify(rows[0], null, 2)}`);
          }
        }
        throw new Error(error.message);
      }
      
      if (DEBUG) {
        dlog(`    ✅ ${table} upsert successful: ${rows.length} records processed`);
      }
      return;
    } catch (err) {
      attempt += 1;
      if (attempt > UPSERT_RETRIES) {
        console.error(`    ❌ ${table} ${conflict ? 'upsert' : 'insert'} failed after ${UPSERT_RETRIES} retries:`, err.message);
        
        // Log detailed error information
        if (DEBUG) {
          dlog(`    🔍 Final error details: ${err.stack || err.message}`);
          dlog(`    📊 Failed batch size: ${rows.length}`);
          if (rows.length > 0) {
            dlog(`    🔍 First failed record: ${JSON.stringify(rows[0], null, 2)}`);
          }
        }
        throw err;
      }
      const backoff = 500 * Math.pow(2, attempt - 1);
      if (DEBUG) {
        console.warn(`    ⚠️ ${table} retry ${attempt}/${UPSERT_RETRIES} in ${backoff}ms - Error: ${err.message}`);
      }
      await sleep(backoff);
    }
  }
}

async function intersectWithCommonFields(resourceKeys) {
  if (!resourceKeys.length) return new Set();
  const chunks = chunk(resourceKeys, 1000);
  const existing = new Set();
  for (const keys of chunks) {
    const { data, error } = await supabase
      .from('common_fields')
      .select('ListingKey')
      .in('ListingKey', keys);
    if (error) {
      if (DEBUG) console.error('    ❌ Parent check error:', error.message);
      continue;
    }
    for (const row of data || []) existing.add(row.ListingKey);
  }
  return existing;
}

async function fetchAndProcessBatch(tableConfig, state) {
  const { name, url, token, mapRow, conflictKeys, filterFn, enforceParent } = tableConfig;

  if (state.completed) return { fetched: 0, processed: 0, dropped: 0 };

  if (!url) {
    if (DEBUG) console.error(`    ❌ ${name}: No URL configured`);
    state.completed = true;
    return { fetched: 0, processed: 0, dropped: 0, error: true };
  }

  try {
    // Adjust batch size if skip + top would exceed API limit
    let adjustedBatchSize = FETCH_BATCH;
    if (state.skip + FETCH_BATCH > API_MAX_SKIP_PLUS_TOP) {
      adjustedBatchSize = Math.max(1, API_MAX_SKIP_PLUS_TOP - state.skip);
      if (DEBUG) {
        dlog(`    ⚠️ ${name}: Adjusted batch size from ${FETCH_BATCH} to ${adjustedBatchSize} to respect API limit`);
      }
      
      // If we can't fetch any records due to API limits, mark as completed
      if (adjustedBatchSize <= 0) {
        if (DEBUG) {
          dlog(`    🛑 ${name}: Cannot fetch more records due to API limit (skip=${state.skip}), marking as completed`);
        }
        state.completed = true;
        return { fetched: 0, processed: 0, dropped: 0 };
      }
    }

    const fetchParams = {
      baseUrl: url,
      token,
      top: adjustedBatchSize,
      skip: state.skip,
      filter: tableConfig.apiFilters || null  // Add API filters if specified
    };

    const { records } = await fetchODataPage(fetchParams);
    if (DEBUG) dlog(`  📊 ${name}: fetched ${records.length} records (skip=${state.skip})`);

    if (!records.length) {
      state.completed = true;
      return { fetched: 0, processed: 0, dropped: 0 };
    }

    // Map records
    if (DEBUG) {
      dlog(`    🔄 ${name} mapping ${records.length} raw records`);
    }
    
    let mapped = records.map(mapRow).filter(record => record !== null);
    
    let totalDropped = 0;
    
    // Filter invalid records
    if (filterFn) {
      const before = mapped.length;
      mapped = mapped.filter(filterFn);
      const filterDropped = before - mapped.length;
      totalDropped += filterDropped;
      
      if (DEBUG) {
        dlog(`    📊 ${name} mapping results: ${mapped.length} valid, ${filterDropped} filtered out`);
        
        if (filterDropped > 0) {
          dlog(`    🚫 Filtered out ${filterDropped} invalid records`);
          
          // Log sample invalid records for debugging
          const invalidRecords = records.slice(0, 3).filter(record => {
            const mapped = mapRow(record);
            return mapped && !filterFn(mapped);
          });
          
          if (invalidRecords.length > 0) {
            dlog(`    🔍 Sample invalid records:`);
            invalidRecords.forEach((record, idx) => {
              const mapped = mapRow(record);
              dlog(`      ${idx + 1}. Raw: ${JSON.stringify(record, null, 2)}`);
              dlog(`         Mapped: ${JSON.stringify(mapped, null, 2)}`);
              dlog(`         Filter result: ${filterFn(mapped)}`);
            });
          }
        }
      }
    }

    // Handle preferred photo conflicts for property_media
    if (name === 'property_media') {
      const preferredByProperty = new Map();
      
      // First pass: find the media with lowest Order value per property that claims to be preferred
      mapped.forEach(record => {
        if (record && record.PreferredPhotoYN && record.ListingKey) {
          const key = record.ListingKey;
          const currentOrder = record.Order || 999999; // Default high value if no order

          if (!preferredByProperty.has(key)) {
            preferredByProperty.set(key, { MediaKey: record.MediaKey, Order: currentOrder });
          } else {
            const existing = preferredByProperty.get(key);
            if (currentOrder < existing.Order) {
              // This record has lower order, it should be the preferred one
              preferredByProperty.set(key, { MediaKey: record.MediaKey, Order: currentOrder });
            }
          }
        }
      });

      // Second pass: only keep PreferredPhotoYN = true for the record with lowest Order
      let preferredResolved = 0;
      mapped.forEach(record => {
        if (record && record.PreferredPhotoYN && record.ListingKey) {
          const preferred = preferredByProperty.get(record.ListingKey);
          if (preferred && record.MediaKey !== preferred.MediaKey) {
            // This is not the lowest order preferred photo for this property
            record.PreferredPhotoYN = false;
            preferredResolved++;
          }
        }
      });
      
      if (DEBUG && preferredResolved > 0) {
        dlog(`    📸 Resolved ${preferredResolved} preferred photo conflicts using Order values`);
      }
    }

    // Parent enforcement - use appropriate key for each table
    if (enforceParent) {
      // Use ResourceRecordKey for property_media, ListingKey for all other tables
      const keyField = name === 'property_media' ? 'ResourceRecordKey' : 'ListingKey';
      const keys = Array.from(new Set(mapped.map(r => r && r[keyField]).filter(Boolean)));
      
      if (DEBUG) {
        dlog(`    🔍 ${name} parent enforcement: checking ${keys.length} unique ${keyField}s`);
        if (keys.length > 0) {
          dlog(`    📋 Sample ${keyField}s: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
        }
      }
      
      const existing = await intersectWithCommonFields(keys);
      const before = mapped.length;
      
      if (DEBUG) {
        dlog(`    ✅ Found ${existing.size} existing parent records out of ${keys.length} requested`);
      }
      
      mapped = mapped.filter(r => r && existing.has(r[keyField]));
      
      const orphanDropped = before - mapped.length;
      totalDropped += orphanDropped;
      
      if (DEBUG && orphanDropped > 0) {
        dlog(`    🔗 Dropped ${orphanDropped} orphaned records`);
        
        // Log sample orphaned keys for debugging
        const orphanedKeys = mapped.map(r => r && r[keyField]).filter(key => key && !existing.has(key));
        const uniqueOrphaned = Array.from(new Set(orphanedKeys)).slice(0, 10);
        if (uniqueOrphaned.length > 0) {
          dlog(`    🚫 Sample orphaned ${keyField}s: ${uniqueOrphaned.join(', ')}${uniqueOrphaned.length === 10 ? '...' : ''}`);
        }
        
        // Stage orphaned records for later processing instead of dropping them
        const orphanedRecords = mapped.filter(r => r && r[keyField] && !existing.has(r[keyField]));
        if (orphanedRecords.length > 0) {
          const stagedCount = await stageOrphanedRecords(name, orphanedRecords);
          if (stagedCount > 0) {
            dlog(`    📦 Staged ${stagedCount} orphaned records for later processing`);
          }
        }
      }
    }

    // Final null filter before upsert
    mapped = mapped.filter(record => record !== null);
    
    // Remove duplicates within the batch to prevent constraint violations
    if (conflictKeys) {
      const keyFields = conflictKeys.split(',').map(k => k.trim());
      const seen = new Set();
      mapped = mapped.filter(record => {
        const key = keyFields.map(field => record[field]).join('|');
        if (seen.has(key)) {
          if (DEBUG) {
            dlog(`    🔄 Removed duplicate record: ${keyFields.map(f => `${f}=${record[f]}`).join(', ')}`);
          }
          return false;
        }
        seen.add(key);
        return true;
      });
    }
    
    // Upsert in chunks
    const chunks = chunk(mapped, UPSERT_CHUNK);
    for (const batch of chunks) {
      if (!batch.length) continue;
      
      
      await upsertWithRetry(name, batch, conflictKeys);
      await sleep(30);
    }

    state.totalProcessed += mapped.length;
    state.totalDropped += totalDropped;
    state.skip += FETCH_BATCH;

    if (records.length < FETCH_BATCH) {
      state.completed = true;
    }

    return {
      fetched: records.length,
      processed: mapped.length,
      dropped: totalDropped,
      completed: state.completed
    };

  } catch (error) {
    console.error(`    ❌ ${name} error:`, error.message);
    return { fetched: 0, processed: 0, dropped: 0, error: true };
  }
}

export async function syncIdxComplete() {
  console.log('🚀 Starting complete IDX synchronization (all tables including media)');
  console.log(`📊 Sync Configuration: ${FETCH_BATCH} records per batch, max ${MAX_RECORDS_PER_SYNC} records per sync`);
  
  // Validate required environment variables
  if (!process.env.IDX_URL) {
    console.error('❌ IDX_URL environment variable is not set');
    return;
  }

  try {
    console.log('\n📥 Starting data sync...');

    // Get current record counts to determine starting skip positions
    console.log('🔍 Checking current database state...');
    const tableStates = [];
    
    for (const table of TABLES) {
      const currentCount = await getCurrentRecordCount(table.name);
      const startingSkip = currentCount;
      
      // Check if this table has hit the API limit
      const canFetchMore = startingSkip + FETCH_BATCH <= API_MAX_SKIP_PLUS_TOP;
      
      console.log(`  📋 ${table.name}: ${currentCount} existing records, starting skip: ${startingSkip}`);
      if (!canFetchMore) {
        console.log(`    ⚠️ ${table.name}: Cannot fetch more records (skip ${startingSkip} + batch ${FETCH_BATCH} > API limit ${API_MAX_SKIP_PLUS_TOP})`);
      }
      
      tableStates.push({
        name: table.name,
        skip: startingSkip,
        totalProcessed: 0,
        totalDropped: 0,
        completed: !canFetchMore, // Mark as completed if we can't fetch more
        maxRecords: MAX_RECORDS_PER_SYNC,
        canFetchMore: canFetchMore
      });
    }

    const sortedTables = TABLES.sort((a, b) => a.priority - b.priority);
    let round = 1;
    let globalCompleted = false;

    while (!globalCompleted) {
      console.log(`══════════════════════════════════════════════`);
      console.log(`📊 Sync Round ${round} — Batch (skip=${sortedTables[0] ? tableStates.find(s => s.name === sortedTables[0].name)?.skip || 0 : 0}, top=${FETCH_BATCH})`);
      console.log(`══════════════════════════════════════════════`);
      let roundActivity = false;

      for (const table of sortedTables) {
        const state = tableStates.find(s => s.name === table.name);
        if (state.completed) continue;

        // Check if we've reached the maximum records limit for this sync
        if (state.totalProcessed >= state.maxRecords) {
          console.log(`  🛑 ${table.name}: Reached maximum records limit (${state.maxRecords}), marking as completed`);
          state.completed = true;
          continue;
        }

        const result = await fetchAndProcessBatch(table, state);
        if (result.fetched > 0) {
          roundActivity = true;
          const successRate = result.fetched > 0 ? Math.round((result.processed / result.fetched) * 100) : 0;
          
          // Map table names to shorter display names
          const displayNames = {
            'common_fields': 'COMMON_FIELDS',
            'residential_freehold': 'RES_FREEHOLD',
            'residential_condo': 'RES_CONDO', 
            'residential_lease': 'RES_LEASE',
            'property_media': 'PROPERTY_MEDIA',
            'property_openhouse': 'PROPERTY_OPENHOUSE',
            'property_rooms': 'PROPERTY_ROOMS'
          };
          
          const displayName = displayNames[table.name] || table.name.toUpperCase();
          const status = result.error ? '❌' : '✅';
          
          console.log(`${status} ${displayName.padEnd(15)} | Fetched: ${result.fetched.toString().padStart(4)} | Processed: ${result.processed.toString().padStart(4)} | Dropped: ${result.dropped.toString().padStart(4)} | Success: ${successRate.toString().padStart(3)}% | Total: ${state.totalProcessed}/${state.maxRecords}`);
        }
      }

      console.log(`══════════════════════════════════════════════`);

      globalCompleted = tableStates.every(state => state.completed);
      if (!roundActivity && !globalCompleted) {
        console.log('⚠️ No activity but not complete');
        break;
      }

      round++;
      if (round > 200) {
        console.log('⚠️ Max rounds reached');
        break;
      }
    }

    console.log('\n📈 Final Results:');
    tableStates.forEach(state => {
      const totalFetched = state.totalProcessed + state.totalDropped;
      const successRate = totalFetched > 0 ? Math.round((state.totalProcessed / totalFetched) * 100) : 0;
      const status = state.canFetchMore ? '🔄' : '🛑';
      console.log(`  ${status} ${state.name}: ${state.totalProcessed} processed, ${state.totalDropped} dropped (${successRate}% success) ${state.canFetchMore ? '' : '- API limit reached'}`);
    });

    // Show which tables can still be synced
    const syncableTables = tableStates.filter(state => state.canFetchMore);
    const completedTables = tableStates.filter(state => !state.canFetchMore);
    
    if (completedTables.length > 0) {
      console.log('\n🛑 Tables that cannot fetch more data (API limit reached):');
      completedTables.forEach(state => {
        console.log(`  - ${state.name}: ${state.skip} existing records`);
      });
    }
    
    if (syncableTables.length > 0) {
      console.log('\n🔄 Tables that can still be synced:');
      syncableTables.forEach(state => {
        console.log(`  - ${state.name}: ${state.skip} existing records, can fetch up to ${API_MAX_SKIP_PLUS_TOP - state.skip} more`);
      });
    }

    // Verification
    for (const table of TABLES) {
      const { count } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      console.log(`🔍 ${table.name}: ${count} records in database`);
    }

    console.log('\n✅ Complete IDX synchronization finished (fetch and upsert only)');
    return tableStates;

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  syncIdxComplete()
    .then(() => {
      console.log('✅ Done');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}