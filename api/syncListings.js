// api/syncListings.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchODataPage } from '../lib/fetchFeed.js';

import { mapCommonFields } from '../mappers/mapCommonFields.js';
import { mapResidentalFreehold } from '../mappers/mapResidentalFreehold.js';
import { mapResidentialCondo } from '../mappers/mapResidentialCondo.js';
import { mapResidentialLease } from '../mappers/mapResidentialLease.js';
import { mapPropertyOpenhouse } from '../mappers/mapPropertyOpenhouse.js';
import { mapPropertyMedia } from '../mappers/mapPropertyMedia.js';
import { mapPropertyRooms } from '../mappers/mapPropertyRooms.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const FETCH_BATCH = 5000;   // records per API page
const UPSERT_CHUNK = 1000;  // rows per DB upsert
const UPSERT_RETRIES = 3;

const URLS = {
  IDX:        { url: process.env.IDX_URL,       token: process.env.IDX_TOKEN },
  VOW:        { url: process.env.VOW_URL,       token: process.env.VOW_TOKEN },
  Freehold:   { url: process.env.FREEHOLD_URL,  token: process.env.IDX_TOKEN },
  Condo:      { url: process.env.CONDO_URL,     token: process.env.IDX_TOKEN },
  Lease:      { url: process.env.LEASE_URL,     token: process.env.IDX_TOKEN },
  OpenHouse:  { url: process.env.OPENHOUSE_URL, token: process.env.IDX_TOKEN },
  Media:      { url: process.env.MEDIA_URL,     token: process.env.IDX_TOKEN },
  Rooms:      { url: process.env.ROOMS_URL,     token: process.env.IDX_TOKEN },
};

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
        console.error(`❌ ${table} upsert failed after ${UPSERT_RETRIES} retries:`, err.message);
        throw err;
      }
      const backoff = 500 * Math.pow(2, attempt - 1);
      console.warn(`⚠️ ${table} upsert attempt ${attempt} failed: ${err.message}. Retrying in ${backoff}ms…`);
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
      console.error('❌ intersect query error:', error.message);
      continue;
    }
    for (const row of data || []) existing.add(row.ListingKey);
  }
  return existing;
}

async function processTable({ tableName, baseUrl, token, mapRow, conflictKeys, filterFn, enforceParent = false }) {
  let next = null;
  let skip = 0; // fallback only if nextLink is absent

  while (true) {
    console.log(`🔁 Fetching: ${tableName} ${next ? '(nextLink)' : `$skip=${skip}, $top=${FETCH_BATCH}`}`);
    const { records, next: nextLink } = await fetchODataPage({
      baseUrl,
      token,
      top: FETCH_BATCH,
      next,
      skip, // only used if server doesn't emit nextLink
    });

    if (!records.length) break;

    // Map and base filter
    let mapped = (filterFn ? records.map(mapRow).filter(filterFn) : records.map(mapRow));

    // Enforce parent for FK tables
    if (enforceParent) {
      const keys = Array.from(new Set(mapped.map(r => r.ListingKey).filter(Boolean)));
      const existing = await intersectWithCommonFields(keys);
      const before = mapped.length;
      mapped = mapped.filter(r => existing.has(r.ListingKey));
      const dropped = before - mapped.length;
      if (dropped > 0) console.warn(`🔎 ${tableName}: skipped ${dropped} rows with missing parent ListingKey`);
    }

    // Upsert in chunks
    const chunks = chunk(mapped, UPSERT_CHUNK);
    for (let i = 0; i < chunks.length; i++) {
      const rows = chunks[i];
      if (!rows.length) continue;
      console.log(`🧩 Upserting ${rows.length} into ${tableName} (chunk ${i + 1}/${chunks.length})`);
      await upsertWithRetry(tableName, rows, conflictKeys);
      await sleep(50);
    }

    if (nextLink) {
      next = nextLink;     // keep following the server’s cursor
    } else {
      // fallback manual paging if server doesn't provide nextLink for this feed
      if (records.length < FETCH_BATCH) break;
      skip += FETCH_BATCH;
    }
  }
}

async function syncListings() {
  console.log('🚀 Starting ordered full sync (cursor-aware)');

  // 1) PARENT: common_fields from BOTH feeds
  await processTable({
    tableName: 'common_fields',
    baseUrl: URLS.IDX.url,
    token: URLS.IDX.token,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapCommonFields(item, {}) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
  });

  await processTable({
    tableName: 'common_fields',
    baseUrl: URLS.VOW.url,
    token: URLS.VOW.token,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapCommonFields({}, item) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
  });

  // 2) CHILDREN (FK-safe)
  await processTable({
    tableName: 'residential_freehold',
    baseUrl: URLS.Freehold.url,
    token: URLS.Freehold.token,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentalFreehold(item, {}) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: true,
  });

  await processTable({
    tableName: 'residential_condo',
    baseUrl: URLS.Condo.url,
    token: URLS.Condo.token,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialCondo(item) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: true,
  });

  await processTable({
    tableName: 'residential_lease',
    baseUrl: URLS.Lease.url,
    token: URLS.Lease.token,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapResidentialLease(item) }),
    conflictKeys: 'ListingKey',
    filterFn: (r) => !!r.ListingKey,
    enforceParent: true,
  });

  await processTable({
    tableName: 'property_openhouse',
    baseUrl: URLS.OpenHouse.url,
    token: URLS.OpenHouse.token,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapPropertyOpenhouse(item) }),
    conflictKeys: ['ListingKey', 'OpenHouseKey'],
    filterFn: (r) => !!r.ListingKey && !!r.OpenHouseKey,
    enforceParent: true,
  });

  await processTable({
    tableName: 'property_media',
    baseUrl: URLS.Media.url,
    token: URLS.Media.token,
    mapRow: (item) => ({ ListingKey: item.ResourceRecordKey, ...mapPropertyMedia(item) }),
    conflictKeys: ['ListingKey', 'MediaKey'],
    filterFn: (r) => !!r.ListingKey && !!r.MediaKey,
    enforceParent: true,
  });

  await processTable({
    tableName: 'property_rooms',
    baseUrl: URLS.Rooms.url,
    token: URLS.Rooms.token,
    mapRow: (item) => ({ ListingKey: item.ListingKey, ...mapPropertyRooms(item) }),
    conflictKeys: 'RoomKey',
    filterFn: (r) => !!r.RoomKey && !!r.ListingKey,
    enforceParent: true,
  });

  console.log('✅ Full ordered sync complete');
}

await syncListings();
