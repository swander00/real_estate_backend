// lib/syncListingsIdx.js - Simple coordinated sync with cleanup
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

// Simple coordinated table configuration
const TABLES = [
  {
    name: 'common_fields',
    url: process.env.IDX_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapCommonFields(item, {}) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: false,
    priority: 1, // Master table - highest priority
    testLimit: 15000
  },
  {
    name: 'residential_freehold',
    url: process.env.FREEHOLD_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialFreehold(item, {}) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: true,
    priority: 2
  },
  {
    name: 'residential_condo',
    url: process.env.CONDO_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialCondo(item) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: true,
    priority: 2
  },
  {
    name: 'residential_lease',
    url: process.env.LEASE_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialLease(item) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: true,
    priority: 2
  },
  {
    name: 'property_openhouse',
    url: process.env.OPENHOUSE_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapPropertyOpenhouse(item) }),
    conflictKeys: 'ListingKey,OpenHouseKey',
    filterFn: (r) => !!r.ListingKey && !!r.OpenHouseKey,
    enforceParent: true,
    priority: 3
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
    enforceParent: true,
    priority: 3
  },
  {
    name: 'property_rooms',
    url: process.env.ROOMS_URL,
    token: process.env.IDX_TOKEN,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapPropertyRooms(item) }),
    conflictKeys: 'RoomKey',
    filterFn: (r) => !!r.RoomKey && !!r.ListingKey,
    enforceParent: true,
    priority: 3
  }
];

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

async function fetchAndProcessBatch(tableConfig, state, testMode) {
  const { name, url, token, mapRow, conflictKeys, filterFn, enforceParent, testLimit } = tableConfig;
  
  // Check if this table is complete
  if (state.completed) return { fetched: 0, processed: 0 };
  
  // Check test mode limits (only for master table)
  if (testMode && name === 'common_fields' && state.totalProcessed >= testLimit) {
    state.completed = true;
    return { fetched: 0, processed: 0 };
  }
  
  try {
    // Build fetch parameters (simple - no complex filtering)
    let fetchParams = {
      baseUrl: url,
      token,
      top: FETCH_BATCH,
      skip: state.skip
    };

    // Fetch batch
    const { records, next: nextLink } = await fetchODataPage(fetchParams);

    if (!records.length) {
      state.completed = true;
      return { fetched: 0, processed: 0 };
    }

    // Apply test mode limit for master table
    let limitedRecords = records;
    if (testMode && name === 'common_fields') {
      const remaining = testLimit - state.totalProcessed;
      if (remaining <= 0) {
        state.completed = true;
        return { fetched: 0, processed: 0 };
      }
      limitedRecords = records.slice(0, remaining);
    }

    // Map and base filter
    let mapped = (filterFn ? limitedRecords.map(mapRow).filter(filterFn) : limitedRecords.map(mapRow));

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
      await sleep(30);
    }

    // Update state
    state.totalProcessed += limitedRecords.length;
    
    if (records.length < FETCH_BATCH || (testMode && name === 'common_fields' && state.totalProcessed >= testLimit)) {
      state.completed = true;
    } else {
      state.skip += FETCH_BATCH;
    }

    return { 
      fetched: limitedRecords.length, 
      processed: mapped.length, 
      dropped,
      completed: state.completed 
    };

  } catch (error) {
    console.error(`    ❌ ${name} error:`, error.message);
    return { fetched: 0, processed: 0, error: true };
  }
}

// Clean up orphaned records after sync
async function cleanupOrphanedRecords() {
  console.log('\n🧹 Cleaning up orphaned records...');
  
  const childTables = TABLES.filter(t => t.enforceParent);
  let totalCleaned = 0;
  
  for (const table of childTables) {
    try {
      console.log(`  🧹 Checking ${table.name} for orphaned records...`);
      
      // Get sample of ListingKeys from child table
      const { data: childKeys, error: selectError } = await supabase
        .from(table.name)
        .select('ListingKey')
        .limit(10000);
      
      if (selectError || !childKeys?.length) {
        console.log(`    ⚪ ${table.name}: No records to check`);
        continue;
      }
      
      const uniqueKeys = [...new Set(childKeys.map(r => r.ListingKey))];
      const batches = chunk(uniqueKeys, 1000);
      const orphanedKeys = [];
      
      for (const batch of batches) {
        const { data: existingKeys, error } = await supabase
          .from('common_fields')
          .select('ListingKey')
          .in('ListingKey', batch);
        
        if (error) continue;
        
        const existing = new Set(existingKeys?.map(r => r.ListingKey) || []);
        const orphaned = batch.filter(key => !existing.has(key));
        orphanedKeys.push(...orphaned);
      }
      
      if (orphanedKeys.length > 0) {
        // Delete orphaned records in batches
        const deleteBatches = chunk(orphanedKeys, 1000);
        let deleted = 0;
        
        for (const deleteBatch of deleteBatches) {
          const { error: deleteError } = await supabase
            .from(table.name)
            .delete()
            .in('ListingKey', deleteBatch);
          
          if (!deleteError) {
            deleted += deleteBatch.length;
          }
        }
        
        totalCleaned += deleted;
        console.log(`    ✅ ${table.name}: Cleaned ${deleted} orphaned records`);
      } else {
        console.log(`    ✅ ${table.name}: No orphaned records found`);
      }
      
    } catch (error) {
      console.error(`    ❌ ${table.name}: Cleanup error - ${error.message}`);
    }
  }
  
  console.log(`🧹 Cleanup complete: ${totalCleaned} total orphaned records removed`);
  return totalCleaned;
}

export async function syncListingsIdx(testMode = false, incrementalMode = false) {
  const syncType = incrementalMode ? 'incremental' : testMode ? 'test' : 'full';
  console.log(`🚀 Starting IDX sync (${syncType} mode) - Simple Coordinated with Cleanup`);
  
  // Initialize state for each table
  const tableStates = TABLES.map(table => ({
    name: table.name,
    skip: 0,
    totalProcessed: 0,
    completed: false
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
    if (testMode && round > 10) {
      console.log('  ⚠️ Test mode: stopping after 10 rounds');
      break;
    }
  }

  console.log('\n📈 Sync Results:');
  tableStates.forEach(state => {
    console.log(`  ${state.name}: ${state.totalProcessed} records processed`);
  });

  // Clean up orphaned records
  await cleanupOrphanedRecords();

  // Compute derived tables
  console.log('\n🖼️ Computing derived tables...');
  try {
    await computePropertyFirstImages();
    console.log('✅ property_first_image computed successfully');
  } catch (error) {
    console.error(`❌ property_first_image error: ${error.message}`);
  }

  // Update sync state for incremental mode
  if (incrementalMode) {
    await updateSyncState('idx-incremental', new Date());
    console.log(`✅ Updated incremental sync state`);
  }

  console.log('\n✅ IDX coordinated sync with cleanup complete');
}

// Local testing support - Windows compatible
if (process.argv[1] && process.argv[1].endsWith('syncListingsIdx.js')) {
  console.log('🚀 Testing IDX coordinated sync locally...');
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