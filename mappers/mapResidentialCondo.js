// mappers/mapResidentialCondo.js

import { extractSingleFromArrayString, joinArray } from '../lib/utils.js';

export function mapResidentialCondo(idx = {}, vow = {}) {
  const get = (field) => (vow[field] ?? idx[field] ?? null);

  const cleanDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  };

  return {
    ListingKey:              get('ListingKey'),
    UnitNumber:              get('UnitNumber'),
    AssociationAmenities:    joinArray(extractSingleFromArrayString(get('AssociationAmenities'))),
    Locker:                  get('Locker'),
    BalconyType:             get('BalconyType'),
    PetsAllowed:             joinArray(extractSingleFromArrayString(get('PetsAllowed'))),
    AssociationFee:          get('AssociationFee'),
    AssociationFeeIncludes:  joinArray(extractSingleFromArrayString(get('AssociationFeeIncludes'))),

    // NEW: system-level modification timestamp (IDX/VOW), ISO-normalized
    SystemModificationTimestamp: cleanDate(get('SystemModificationTimestamp')),
  };
}

/**
 * Upserts residential condo records into the residential_condo table.
 * 
 * @param {object} supabase - Supabase client
 * @param {Array<object>} records - Raw feed records
 */
export async function upsertResidentialCondo(supabase, records) {
  const mapped = records.map(record => mapResidentialCondo(record, {}));

  const { data, error } = await supabase
    .from('residential_condo') // <-- Replace with your actual table name
    .upsert(mapped, { onConflict: 'ListingKey' });

  if (error) {
    console.error('❌ Error upserting residential condo records:', error);
    throw error;
  } else {
    console.log(`✅ Upserted ${mapped.length} residential condo records`);
  }
}
