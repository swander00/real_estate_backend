// lib/syncIdx.js - Complete IDX synchronization (all tables including media)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchODataPage } from './fetchFeed.js';
import { mapCommonFields } from '../mappers/mapCommonFields.js';
import { mapPropertyMedia } from '../mappers/mapPropertyMedia.js';
import { mapPropertyOpenhouse } from '../mappers/mapPropertyOpenhouse.js';
import { mapPropertyRooms } from '../mappers/mapPropertyRooms.js';
import { mapResidentialCondo } from '../mappers/mapResidentialCondo.js';
import { mapResidentialFreehold } from '../mappers/mapResidentialFreehold.js';
import { mapResidentialLease } from '../mappers/mapResidentialLease.js';

const DEBUG = true;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const FETCH_BATCH = 5000;
const UPSERT_CHUNK = 1000;
const UPSERT_RETRIES = 3;

// Helpers
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));
const dlog = (...args) => { if (DEBUG) console.log(...args); };

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
    url: process.env.IDX_MEDIA_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => mapPropertyMedia(item),
    conflictKeys: 'MediaKey',
    filterFn: (r) => !!r.MediaKey && !!r.ResourceRecordKey,
    enforceParent: true,
    priority: 3
  },
  {
    name: 'property_openhouse',
    url: process.env.IDX_OPENHOUSE_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapPropertyOpenhouse(item) }),
    conflictKeys: 'ListingKey,OpenHouseKey',
    filterFn: (r) => !!r.ListingKey && !!r.OpenHouseKey,
    enforceParent: true,
    priority: 3
  },
  {
    name: 'property_rooms',
    url: process.env.IDX_ROOMS_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => mapPropertyRooms(item),
    conflictKeys: 'RoomKey',
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
      if (DEBUG) console.warn(`    ⚠️ ${table} retry ${attempt}/${UPSERT_RETRIES} in ${backoff}ms`);
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
    const fetchParams = {
      baseUrl: url,
      token,
      top: FETCH_BATCH,
      skip: state.skip
    };

    const { records } = await fetchODataPage(fetchParams);
    if (DEBUG) dlog(`  📊 ${name}: fetched ${records.length} records (skip=${state.skip})`);

    if (!records.length) {
      state.completed = true;
      return { fetched: 0, processed: 0, dropped: 0 };
    }

    // Map records
    let mapped = records.map(mapRow);
    let totalDropped = 0;
    
    // Filter invalid records
    if (filterFn) {
      const before = mapped.length;
      mapped = mapped.filter(filterFn);
      const filterDropped = before - mapped.length;
      totalDropped += filterDropped;
      if (DEBUG && filterDropped > 0) dlog(`    🚫 Filtered out ${filterDropped} invalid records`);
    }

    // Handle preferred photo conflicts for property_media
    if (name === 'property_media') {
      const preferredByProperty = new Map();
      
      // First pass: find the media with lowest Order value per property that claims to be preferred
      mapped.forEach(record => {
        if (record.PreferredPhotoYN && record.ResourceRecordKey) {
          const key = record.ResourceRecordKey;
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
        if (record.PreferredPhotoYN && record.ResourceRecordKey) {
          const preferred = preferredByProperty.get(record.ResourceRecordKey);
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

    // Parent enforcement for media - use ResourceRecordKey instead of ListingKey
    if (enforceParent) {
      let keys;
      if (name === 'property_media') {
        // For media, check ResourceRecordKey against common_fields.ListingKey
        keys = Array.from(new Set(mapped.map(r => r.ResourceRecordKey).filter(Boolean)));
      } else {
        // For other tables, use ListingKey
        keys = Array.from(new Set(mapped.map(r => r.ListingKey).filter(Boolean)));
      }
      
      const existing = await intersectWithCommonFields(keys);
      const before = mapped.length;
      
      if (name === 'property_media') {
        mapped = mapped.filter(r => existing.has(r.ResourceRecordKey));
      } else {
        mapped = mapped.filter(r => existing.has(r.ListingKey));
      }
      
      const orphanDropped = before - mapped.length;
      totalDropped += orphanDropped;
      if (DEBUG && orphanDropped > 0) dlog(`    🔗 Dropped ${orphanDropped} orphaned records`);
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
  
  // Validate required environment variables
  if (!process.env.IDX_URL) {
    console.error('❌ IDX_URL environment variable is not set');
    return;
  }

  try {
    console.log('\n📥 Starting data sync...');

    const tableStates = TABLES.map(table => ({
      name: table.name,
      skip: 0,
      totalProcessed: 0,
      totalDropped: 0,
      completed: false
    }));

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
          
          console.log(`${status} ${displayName.padEnd(17)} | Fetched: ${result.fetched.toString().padStart(4)} | Processed: ${result.processed.toString().padStart(4)} | Dropped: ${result.dropped.toString().padStart(6)} | Success: ${successRate.toString().padStart(3)}%`);
        }
      }

      console.log(`══════════════════════════════════════════════`);

      globalCompleted = tableStates.every(state => state.completed);
      if (!roundActivity && !globalCompleted) {
        console.log('⚠️ No activity but not complete');
        break;
      }

      round++;
      if (round > 50) {
        console.log('⚠️ Max rounds reached');
        break;
      }
    }

    console.log('\n📈 Final Results:');
    tableStates.forEach(state => {
      const totalFetched = state.totalProcessed + state.totalDropped;
      const successRate = totalFetched > 0 ? Math.round((state.totalProcessed / totalFetched) * 100) : 0;
      console.log(`  ${state.name}: ${state.totalProcessed} processed, ${state.totalDropped} dropped (${successRate}% success)`);
    });

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