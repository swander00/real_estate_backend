// api/syncListingsVow.js - Round-robin sync for sold/historical listings (VOW data)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchODataPage } from '../lib/fetchFeed.js';

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

// VOW feed URLs and tokens - using sold/historical listings
const TABLES = [
  {
    name: 'common_fields',
    url: process.env.VOW_URL,  // VOW URL for sold/historical listings
    token: process.env.VOW_TOKEN,  // VOW token
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapCommonFields({}, item) }), // VOW data in second param
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: false,
    priority: 1 // Parent table - highest priority
  },
  {
    name: 'residential_freehold',
    url: process.env.FREEHOLD_URL,  // Note: These might need VOW equivalents
    token: process.env.VOW_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialFreehold({}, item) }), // VOW data
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: true,
    priority: 2
  },
  {
    name: 'residential_condo',
    url: process.env.CONDO_URL,
    token: process.env.VOW_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialCondo(item) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: true,
    priority: 2
  },
  {
    name: 'residential_lease',
    url: process.env.LEASE_URL,
    token: process.env.VOW_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialLease(item) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: true,
    priority: 2
  },
  {
    name: 'property_media',
    url: process.env.MEDIA_URL,
    token: process.env.VOW_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ResourceRecordKey, ...mapPropertyMedia(item) }),
    conflictKeys: 'MediaKey',
    filterFn: (r) => !!r.ResourceRecordKey && !!r.MediaKey,
    enforceParent: true, // CHANGED: Only sync media with matching VOW properties
    priority: 3
  }
];

const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));

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

async function fetchAndProcessBatch(tableConfig, state, testMode) {
  const { name, url, token, mapRow, conflictKeys, filterFn, enforceParent } = tableConfig;
  
  // Check if this table is complete
  if (state.completed) return { fetched: 0, processed: 0 };
  
  // Check test mode limits
  if (testMode && state.totalProcessed >= state.maxRecords) {
    state.completed = true;
    return { fetched: 0, processed: 0 };
  }
  
  try {
    // Fetch batch
    const { records, next: nextLink } = await fetchODataPage({
      baseUrl: url,
      token,
      top: FETCH_BATCH,
      next: state.next,
      skip: state.skip
    });

    if (!records.length) {
      state.completed = true;
      return { fetched: 0, processed: 0 };
    }

    // Map and base filter
    let mapped = (filterFn ? records.map(mapRow).filter(filterFn) : records.map(mapRow));

    // Enforce parent for FK tables
    let dropped = 0;
    if (enforceParent) {
      const keys = Array.from(new Set(mapped.map(r => r.ListingKey).filter(Boolean)));
      const existing = await intersectWithCommonFields(keys);
      const before = mapped.length;
      mapped = mapped.filter(r => existing.has(r.ListingKey));
      dropped = before - mapped.length;
    }

    // Upsert in chunks
    const chunks = chunk(mapped, UPSERT_CHUNK);
    for (let i = 0; i < chunks.length; i++) {
      const rows = chunks[i];
      if (!rows.length) continue;
      await upsertWithRetry(name, rows, conflictKeys);
      await sleep(30); // Shorter sleep for round-robin
    }

    // Update state
    state.totalProcessed += records.length;
    if (nextLink) {
      state.next = nextLink;
    } else {
      if (records.length < FETCH_BATCH) {
        state.completed = true;
      } else {
        state.skip += FETCH_BATCH;
      }
    }

    return { 
      fetched: records.length, 
      processed: mapped.length, 
      dropped,
      completed: state.completed 
    };

  } catch (error) {
    console.error(`    ❌ ${name} error:`, error.message);
    return { fetched: 0, processed: 0, error: true };
  }
}

async function syncListingsVow(testMode = false) {
  console.log(`🚀 Starting VOW sync${testMode ? ' (test mode)' : ''} - Round Robin (Sold/Historical)`);
  
  // Initialize state for each table
  const tableStates = TABLES.map(table => ({
    name: table.name,
    next: null,
    skip: 0,
    totalProcessed: 0,
    completed: false,
    maxRecords: testMode ? getTestLimit(table.name) : null
  }));

  // Sort tables by priority (parent tables first)
  const sortedTables = TABLES.sort((a, b) => a.priority - b.priority);
  
  let round = 1;
  let globalCompleted = false;

  while (!globalCompleted) {
    console.log(`\n📊 Round ${round}:`);
    
    let roundActivity = false;
    
    for (let i = 0; i < sortedTables.length; i++) {
      const table = sortedTables[i];
      const state = tableStates.find(s => s.name === table.name);
      
      if (state.completed) continue;
      
      const result = await fetchAndProcessBatch(table, state, testMode);
      
      if (result.fetched > 0) {
        roundActivity = true;
        let statusText = `  ${table.name}: fetched ${result.fetched}, processed ${result.processed}`;
        if (result.dropped > 0) statusText += `, dropped ${result.dropped}`;
        if (result.completed) statusText += ' ✅';
        console.log(statusText);
      }
    }
    
    // Check if all tables are complete
    globalCompleted = tableStates.every(state => state.completed);
    
    if (!roundActivity && !globalCompleted) {
      console.log('  ⚠️ No activity this round but not all tables complete');
      break;
    }
    
    round++;
    
    // Safety break for test mode
    if (testMode && round > 20) {
      console.log('  ⚠️ Test mode: stopping after 20 rounds');
      break;
    }
  }

  console.log('\n📈 Final Results:');
  tableStates.forEach(state => {
    console.log(`  ${state.name}: ${state.totalProcessed} records processed`);
  });

  console.log('\n✅ VOW sync complete');
}

function getTestLimit(tableName) {
  const limits = {
    'common_fields': 15000,
    'residential_freehold': 8000,
    'residential_condo': 8000,
    'residential_lease': 8000,
    'property_media': 12000
  };
  return limits[tableName] || 5000;
}

// Check if running in test mode
const testMode = process.argv.includes('--test');
await syncListingsVow(testMode);