// lib/syncListingsIdx.js - IDX properties sync (without media)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchODataPage } from './fetchFeed.js';

import { mapCommonFields } from '../mappers/mapCommonFields.js';
import { mapResidentialFreehold } from '../mappers/mapResidentialFreehold.js';
import { mapResidentialCondo } from '../mappers/mapResidentialCondo.js';
import { mapResidentialLease } from '../mappers/mapResidentialLease.js';
import { mapPropertyOpenhouse } from '../mappers/mapPropertyOpenhouse.js';
import { mapPropertyRooms } from '../mappers/mapPropertyRooms.js';

const DEBUG = true;
const DEBUG_SAMPLE = 5;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const FETCH_BATCH = 5000;
const UPSERT_CHUNK = 1000;
const UPSERT_RETRIES = 3;

// Helpers
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));
const dlog = (...args) => { if (DEBUG) console.log(...args); };

// Table configuration - Using IDX-specific URLs
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
    name: 'property_openhouse',
    url: process.env.IDX_OPENHOUSE_URL,  // IDX only
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapPropertyOpenhouse(item) }),
    conflictKeys: 'ListingKey,OpenHouseKey',
    filterFn: (r) => !!r.ListingKey && !!r.OpenHouseKey,
    enforceParent: true,
    priority: 3
  },
  {
    name: 'property_rooms',
    url: process.env.IDX_ROOMS_URL,  // IDX only
    token: process.env.IDX_TOKEN,
    mapRow: (item) => mapPropertyRooms(item),
    conflictKeys: 'RoomKey',
    filterFn: (r) => !!r.RoomKey && !!r.ListingKey,
    enforceParent: true,
    priority: 3
  }
];

async function upsertWithRetry(table, rows, conflict) {
  let attempt = 0;
  dlog(`    ⬆️ Upserting ${rows.length} rows to ${table}`);

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
      console.warn(`    ⚠️ Retry ${attempt}/${UPSERT_RETRIES} in ${backoff}ms`);
      await sleep(backoff);
    }
  }
}

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
      console.error('    ❌ Parent check error:', error.message);
      continue;
    }
    for (const row of data || []) existing.add(row.ListingKey);
  }
  return existing;
}

async function fetchAndProcessBatch(tableConfig, state) {
  const { name, url, token, mapRow, conflictKeys, filterFn, enforceParent } = tableConfig;

  if (state.completed) return { fetched: 0, processed: 0 };

  // Check if URL is configured
  if (!url) {
    console.error(`    ❌ ${name}: No URL configured`);
    state.completed = true;
    return { fetched: 0, processed: 0, error: true };
  }

  try {
    const fetchParams = {
      baseUrl: url,
      token,
      top: FETCH_BATCH,
      skip: state.skip
    };

    const { records } = await fetchODataPage(fetchParams);
    dlog(`  📊 ${name}: fetched ${records.length} records (skip=${state.skip})`);

    if (!records.length) {
      state.completed = true;
      return { fetched: 0, processed: 0 };
    }

    // Map records
    let mapped = records.map(mapRow);
    
    // Filter
    if (filterFn) {
      const before = mapped.length;
      mapped = mapped.filter(filterFn);
      const dropped = before - mapped.length;
      if (dropped > 0) dlog(`    🚫 Filtered out ${dropped} invalid records`);
    }

    // Parent enforcement
    if (enforceParent) {
      const keys = Array.from(new Set(mapped.map(r => r.ListingKey).filter(Boolean)));
      const existing = await intersectWithCommonFields(keys);
      const before = mapped.length;
      mapped = mapped.filter(r => existing.has(r.ListingKey));
      const dropped = before - mapped.length;
      if (dropped > 0) dlog(`    🔗 Dropped ${dropped} orphaned records`);
    }

    // Upsert in chunks
    const chunks = chunk(mapped, UPSERT_CHUNK);
    for (const batch of chunks) {
      if (!batch.length) continue;
      await upsertWithRetry(name, batch, conflictKeys);
      await sleep(30);
    }

    // FIXED: Count actual processed records, not fetched
    state.totalProcessed += mapped.length;
    state.skip += FETCH_BATCH;

    if (records.length < FETCH_BATCH) {
      state.completed = true;
    }

    return {
      fetched: records.length,
      processed: mapped.length,
      completed: state.completed
    };

  } catch (error) {
    console.error(`    ❌ ${name} error:`, error.message);
    return { fetched: 0, processed: 0, error: true };
  }
}

export async function syncListingsIdx() {
  console.log('🚀 Starting IDX sync (properties only, no media)');
  
  // Validate required environment variables
  if (!process.env.IDX_URL) {
    console.error('❌ IDX_URL environment variable is not set');
    return;
  }
  
  const tableStates = TABLES.map(table => ({
    name: table.name,
    skip: 0,
    totalProcessed: 0,
    completed: false
  }));

  const sortedTables = TABLES.sort((a, b) => a.priority - b.priority);
  let round = 1;
  let globalCompleted = false;

  while (!globalCompleted) {
    console.log(`\n📊 Round ${round}:`);
    let roundActivity = false;

    for (const table of sortedTables) {
      const state = tableStates.find(s => s.name === table.name);
      if (state.completed) continue;

      const result = await fetchAndProcessBatch(table, state);
      if (result.fetched > 0) {
        roundActivity = true;
        console.log(`  ${table.name}: fetched ${result.fetched}, processed ${result.processed}${result.completed ? ' ✅' : ''}`);
      }
    }

    globalCompleted = tableStates.every(state => state.completed);
    if (!roundActivity && !globalCompleted) {
      console.log('  ⚠️ No activity but not complete');
      break;
    }

    round++;
    if (round > 50) {
      console.log('  ⚠️ Max rounds reached');
      break;
    }
  }

  console.log('\n📈 Final Results:');
  tableStates.forEach(state => {
    console.log(`  ${state.name}: ${state.totalProcessed} records`);
  });

  // Add database verification
  const { count: actualCount } = await supabase
    .from('common_fields')
    .select('*', { count: 'exact', head: true })
    .eq('DataSource', 'IDX');
  
  console.log(`\n🔍 Verification: ${actualCount} IDX records actually in database`);

  console.log('\n✅ IDX sync complete (properties only)');
  return tableStates;
}

// Run if executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  syncListingsIdx()
    .then(() => {
      console.log('✅ Done');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}