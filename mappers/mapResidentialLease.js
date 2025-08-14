// mappers/mapResidentialLease.js

export function mapResidentialLease(idx = {}, vow = {}) {
  const get = (field) => vow[field] ?? idx[field] ?? null;

  const cleanDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  };

  return {
    ListingKey:                 get('ListingKey'),
    Furnished:                  extractSingleFromArrayString(get('Furnished')),
    RentIncludes:               get('RentIncludes') || [],
    SystemModificationTimestamp: cleanDate(get('SystemModificationTimestamp')),
  };
}

// Helper
function extractSingleFromArrayString(value) {
  return Array.isArray(value) && value.length > 0 ? value[0] : value || null;
}

/**
 * Upserts residential lease records into the residential_lease table.
 * 
 * @param {object} supabase - Supabase client
 * @param {Array<object>} records - Raw feed records
 */
export async function upsertResidentialLease(supabase, records) {
  const mapped = records.map(record => mapResidentialLease(record, {}));

  const { data, error } = await supabase
    .from('residential_lease') // <-- replace with your actual table name
    .upsert(mapped, { onConflict: 'ListingKey' });

  if (error) {
    console.error('❌ Error upserting residential lease records:', error);
    throw error;
  } else {
    console.log(`✅ Upserted ${mapped.length} residential lease records`);
  }
}
