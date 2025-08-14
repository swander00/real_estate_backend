// mappers/mapPropertyOpenhouse.js
export function mapPropertyOpenhouse(idxItem = {}, vowItem = {}) {
  const get = (field) => idxItem[field] ?? vowItem[field] ?? null;

  return {
    ListingKey:                  get('ListingKey'),
    OpenHouseKey:                get('OpenHouseKey'),
    OpenHouseId:                 get('OpenHouseId'),
    OpenHouseDate:               get('OpenHouseDate'),
    OpenHouseStartTime:          get('OpenHouseStartTime'),
    OpenHouseEndTime:            get('OpenHouseEndTime'),
    OpenHouseStatus:             get('OpenHouseStatus'),
    OpenHouseType:               get('OpenHouseType'),
    OriginalEntryTimestamp:      get('OriginalEntryTimestamp'),
    ModificationTimestamp:       get('ModificationTimestamp')
  };
}

/**
 * Upserts open house records into the property_openhouse table.
 * 
 * @param {object} supabase - Supabase client
 * @param {Array<object>} records - Raw feed records
 */
export async function upsertOpenHouses(supabase, records) {
  const mapped = records.map(record => mapPropertyOpenhouse(record, {}));

  const { data, error } = await supabase
    .from('property_openhouse')
    .upsert(mapped, { onConflict: 'OpenHouseKey' });

  if (error) {
    console.error('❌ Error upserting open houses:', error);
    throw error;
  } else {
    console.log(`✅ Upserted ${mapped.length} open house records`);
  }
}