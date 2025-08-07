import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchPagesWithSkip } from './lib/fetchFeed.js';
import { mapCommonFields } from './mappers/mapCommonFields.js';
import { mapResidentalFreehold } from './mappers/mapResidentalFreehold.js';
import { mapPropertyOpenhouse } from './mappers/mapPropertyOpenhouse.js';
import { mapResidentialLease } from './mappers/mapResidentialLease.js';
import { mapResidentialCondo } from './mappers/mapResidentialCondo.js';
import { mapPropertyMedia } from './mappers/mapPropertyMedia.js';
import { mapPropertyRooms } from './mappers/mapPropertyRooms.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const URLS = {
  IDX:        { url: process.env.IDX_URL,       token: process.env.IDX_TOKEN },
  VOW:        { url: process.env.VOW_URL,       token: process.env.VOW_TOKEN },
  Freehold:   { url: process.env.FREEHOLD_URL,   token: process.env.IDX_TOKEN },
  Condo:      { url: process.env.CONDO_URL,      token: process.env.IDX_TOKEN },
  Lease:      { url: process.env.LEASE_URL,      token: process.env.IDX_TOKEN },
  OpenHouse:  { url: process.env.OPENHOUSE_URL,  token: process.env.IDX_TOKEN },
  Media:      { url: process.env.MEDIA_URL,      token: process.env.IDX_TOKEN },
  Rooms:      { url: process.env.ROOMS_URL,      token: process.env.IDX_TOKEN } // New rooms endpoint
};

async function fetchAndLog(name) {
  console.log(`🔍 ${name}…`);
  const prevLog = console.log;
  console.log = (...args) => args[0].startsWith('🔁') || prevLog(...args);
  const result = await fetchPagesWithSkip(URLS[name].url, URLS[name].token);
  console.log = prevLog;
  console.log(`📦 ${name}: ${result.length} items`);
  return result;
}

const combineUnique = (a, b) =>
  Array.from(new Map([...a, ...b].map(i => [i.ListingKey, i])).values());

async function testSync() {
  console.log('🧼 Clearing all tables');
  const tables = [
    'common_fields',
    'residential_freehold',
    'residential_condo',
    'residential_lease',
    'property_openhouse',
    'property_media',
    'property_rooms'
  ];
  await Promise.all(
    tables.map(t => supabase.from(t).delete().neq('ListingKey', ''))
  );

    const [idxRaw, vowRaw] = await Promise.all([
    fetchAndLog('IDX'),
    fetchAndLog('VOW')
  ]);

  // Fetch room records from separate rooms endpoint
  const roomsRaw = (await fetchAndLog('Rooms'))
    .filter(r => r.RoomKey && r.ListingKey);

  const freeholdRaw = combineUnique(
    await fetchAndLog('Freehold'),
    idxRaw.filter(i => i.PropertyType === 'Residential Freehold')
  );
  const condoRaw = combineUnique(
    await fetchAndLog('Condo'),
    vowRaw.filter(i => i.PropertyType === 'Residential Condo & Other')
  );
  const leaseRaw = combineUnique(
    await fetchAndLog('Lease'),
    vowRaw.filter(i => i.TransactionType === 'For Lease')
  );
  const openhouseRaw = (await fetchAndLog('OpenHouse'))
    .filter(o => o.OpenHouseKey && o.ListingKey);
  const allMediaRaw = await fetchAndLog('Media');

  const mediaRows = allMediaRaw
    .filter(m => m.ResourceRecordKey && m.MediaKey)
    .map(i => ({
      ListingKey: i.ResourceRecordKey,
      MediaKey:   i.MediaKey,
      MediaURL:   i.MediaURL,
      ...mapPropertyMedia(i)
    }));
  const dedupedMedia = Array.from(
    new Map(mediaRows.map(r => [`${r.ListingKey}-${r.MediaKey}`, r])).values()
  );

  const idxMap = Object.fromEntries(idxRaw.map(i => [i.ListingKey, i]));
  const vowMap = Object.fromEntries(vowRaw.map(i => [i.ListingKey, i]));

  const commonMap = new Map();
  idxRaw.forEach(item => commonMap.set(item.ListingKey, { idx: item, vow: {} }));
  vowRaw.forEach(item => {
    const entry = commonMap.get(item.ListingKey) || { idx: {}, vow: {} };
    entry.vow = item;
    commonMap.set(item.ListingKey, entry);
  });
  const commonRows = Array.from(commonMap.entries()).map(
    ([key, { idx, vow }]) => ({ ListingKey: key, ...mapCommonFields(idx, vow) })
  );

  const freeholdRows = freeholdRaw.map(item => ({
    ListingKey: item.ListingKey,
    ...mapResidentalFreehold(idxMap[item.ListingKey] ?? {}, idxMap[item.ListingKey] ?? {})
  }));
  const condoRows = condoRaw.map(item => ({
    ListingKey: item.ListingKey,
    ...mapResidentialCondo(item)
  }));
  const leaseRows = leaseRaw.map(item => ({
    ListingKey: item.ListingKey,
    ...mapResidentialLease(item)
  }));
  const openhouseRows = openhouseRaw.map(i => ({
    ListingKey: i.ListingKey,
    ...mapPropertyOpenhouse(i)
  }));
      const roomRows = roomsRaw.map(r => ({
    ListingID:   r.ListingID,
    ListingKey:  r.ListingKey,
    ...mapPropertyRooms(r, {})
  }));

  const upsert = async (table, rows, conflict, filterFn = () => true) => {
    const valid = rows.filter(filterFn);
    console.log(`🧩 Upserting ${valid.length} into ${table}`);
    const { error } = await supabase.from(table).upsert(valid, { onConflict: conflict });
    if (error) console.error(`❌ ${table}:`, error.message);
  };

  await upsert('common_fields', commonRows, 'ListingKey', r => !!r.ListingKey);
  await upsert('residential_freehold', freeholdRows, 'ListingKey', row =>
    commonRows.some(c => c.ListingKey === row.ListingKey)
  );
  await upsert('residential_condo', condoRows, 'ListingKey', row =>
    commonRows.some(c => c.ListingKey === row.ListingKey)
  );
  await upsert('residential_lease', leaseRows, 'ListingKey', row =>
    commonRows.some(c => c.ListingKey === row.ListingKey)
  );
  await upsert('property_openhouse', openhouseRows, ['ListingKey','OpenHouseKey'], r =>
    r.ListingKey && r.OpenHouseKey
  );
  await upsert('property_media', dedupedMedia, ['ListingKey','MediaKey'], r =>
    commonRows.some(c => c.ListingKey === r.ListingKey) && r.MediaKey
  );
    await upsert('property_rooms', roomRows, 'RoomKey', r =>
    r.RoomKey
  );

  console.log('✅ Sync complete');
}

await testSync();
