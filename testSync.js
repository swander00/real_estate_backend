import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchAndProcess } from './lib/fetchFeed.js';
import { mapCommonFields } from './mappers/mapCommonFields.js';
import { mapResidentalFreehold } from './mappers/mapResidentalFreehold.js';
import { mapResidentialCondo } from './mappers/mapResidentialCondo.js';
import { mapResidentialLease } from './mappers/mapResidentialLease.js';
import { mapPropertyOpenhouse } from './mappers/mapPropertyOpenhouse.js';
import { mapPropertyMedia } from './mappers/mapPropertyMedia.js';
import { mapPropertyRooms } from './mappers/mapPropertyRooms.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const BATCH_SIZE = 5000;

const URLS = {
  IDX:        { url: process.env.IDX_URL,       token: process.env.IDX_TOKEN },
  VOW:        { url: process.env.VOW_URL,       token: process.env.VOW_TOKEN },
  Freehold:   { url: process.env.FREEHOLD_URL,  token: process.env.IDX_TOKEN },
  Condo:      { url: process.env.CONDO_URL,     token: process.env.IDX_TOKEN },
  Lease:      { url: process.env.LEASE_URL,     token: process.env.IDX_TOKEN },
  OpenHouse:  { url: process.env.OPENHOUSE_URL, token: process.env.IDX_TOKEN },
  Media:      { url: process.env.MEDIA_URL,     token: process.env.IDX_TOKEN },
  Rooms:      { url: process.env.ROOMS_URL,     token: process.env.IDX_TOKEN }
};

async function upsert(table, rows, conflictTarget) {
  console.log(`🧩 Upserting ${rows.length} into ${table}`);
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflictTarget });
  if (error) console.error(`❌ ${table}:`, error.message);
}

async function syncTable(name, mapFn, tableName, conflictKey) {
  await fetchAndProcess(URLS[name].url, URLS[name].token, BATCH_SIZE, async (batch) => {
    const mapped = batch.map(mapFn).filter(r => r && r[conflictKey]);
    await upsert(tableName, mapped, conflictKey);
  });
}

async function testSync() {
  console.log('🧼 Clearing all tables');
  await Promise.all(
    [
      'common_fields',
      'residential_freehold',
      'residential_condo',
      'residential_lease',
      'property_openhouse',
      'property_media',
      'property_rooms'
    ].map(t => supabase.from(t).delete().neq('ListingKey', ''))
  );

  // 1️⃣ Common fields — IDX pass
  await fetchAndProcess(URLS.IDX.url, URLS.IDX.token, BATCH_SIZE, async (batch) => {
    const mapped = batch.map(idx => ({ ListingKey: idx.ListingKey, ...mapCommonFields(idx, {}) }));
    await upsert('common_fields', mapped, 'ListingKey');
  });

  // 2️⃣ Common fields — VOW pass (merge)
  await fetchAndProcess(URLS.VOW.url, URLS.VOW.token, BATCH_SIZE, async (batch) => {
    const mapped = batch.map(vow => ({ ListingKey: vow.ListingKey, ...mapCommonFields({}, vow) }));
    await upsert('common_fields', mapped, 'ListingKey');
  });

  // 3️⃣ Freehold
  await syncTable('Freehold', (item) => ({
    ListingKey: item.ListingKey,
    ...mapResidentalFreehold(item, {})
  }), 'residential_freehold', 'ListingKey');

  // 4️⃣ Condo
  await syncTable('Condo', (item) => ({
    ListingKey: item.ListingKey,
    ...mapResidentialCondo(item)
  }), 'residential_condo', 'ListingKey');

  // 5️⃣ Lease
  await syncTable('Lease', (item) => ({
    ListingKey: item.ListingKey,
    ...mapResidentialLease(item)
  }), 'residential_lease', 'ListingKey');

  // 6️⃣ OpenHouse
  await syncTable('OpenHouse', (item) => ({
    ListingKey: item.ListingKey,
    ...mapPropertyOpenhouse(item)
  }), 'property_openhouse', ['ListingKey', 'OpenHouseKey']);

  // 7️⃣ Media
  await syncTable('Media', (item) => ({
    ListingKey: item.ResourceRecordKey,
    ...mapPropertyMedia(item)
  }), 'property_media', ['ListingKey', 'MediaKey']);

  // 8️⃣ Rooms
  await syncTable('Rooms', (item) => ({
    ListingKey: item.ListingKey,
    ...mapPropertyRooms(item)
  }), 'property_rooms', 'RoomKey');

  console.log('✅ Sync complete');
}

await testSync();
