import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchPagesWithSkip } from './lib/fetchFeed.js';
import { mapCommonFields } from './mappers/mapCommonFields.js';
import { mapFreeholdSale } from './mappers/mapFreeholdSale.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const IDX_URL = process.env.IDX_FREEHOLD_SALE_URL;
const VOW_URL = process.env.VOW_FREEHOLD_SALE_URL;
const IDX_TOKEN = process.env.IDX_TOKEN;
const VOW_TOKEN = process.env.VOW_TOKEN;

const COMMON_TABLE = 'common_fields';
const FREEHOLD_TABLE = 'residential_freehold_sale';

async function testSync() {
  console.log('🧨 Clearing existing records...');
  await supabase.from(FREEHOLD_TABLE).delete().neq('listing_key', '');
  await supabase.from(COMMON_TABLE).delete().neq('ListingKey', '');
  console.log('🧼 Cleared all rows.');

  console.log('🔍 Fetching IDX...');
  const idxRaw = await fetchPagesWithSkip(IDX_URL, IDX_TOKEN);
  const idxMap = Object.fromEntries(idxRaw.map(item => [item.ListingKey, item]));

  console.log('🔍 Fetching VOW...');
  const vowRaw = await fetchPagesWithSkip(VOW_URL, VOW_TOKEN);
  const vowMap = Object.fromEntries(vowRaw.map(item => [item.ListingKey, item]));

  console.log(`📦 IDX: ${idxRaw.length} | VOW: ${vowRaw.length}`);

  const allKeys = new Set([...Object.keys(idxMap), ...Object.keys(vowMap)]);

  const commonRows = [];
  const freeholdRows = [];

  for (const listingKey of allKeys) {
    const idx = idxMap[listingKey] || {};
    const vow = vowMap[listingKey] || {};

    const common = mapCommonFields(idx, vow);
    const freehold = mapFreeholdSale(idx, vow);

    commonRows.push(common);
    freeholdRows.push({ listing_key: listingKey, ...freehold });
  }

  console.log(`🧩 Upserting ${commonRows.length} into common_fields...`);
  const { error: commonErr } = await supabase
    .from(COMMON_TABLE)
    .upsert(commonRows, { onConflict: 'ListingKey' });

  if (commonErr) {
    console.error('❌ Failed to upsert common_fields:', commonErr.message);
    return;
  }

  console.log(`🏘️ Upserting ${freeholdRows.length} into residential_freehold_sale...`);
  const { error: freeholdErr } = await supabase
    .from(FREEHOLD_TABLE)
    .upsert(freeholdRows, { onConflict: 'listing_key' });

  if (freeholdErr) {
    console.error('❌ Failed to upsert residential_freehold_sale:', freeholdErr.message);
    return;
  }

  console.log('✅ Full sync complete.');
}

testSync();
