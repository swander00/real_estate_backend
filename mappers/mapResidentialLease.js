// mappers/mapResidentialLease.js

// Import only necessary helpers from the new utility files
import { cleanValue, cleanSingleValue } from '../utils/valueCleaners.js';
import { cleanTimestamp } from '../utils/dateTimeHelpers.js';

export function mapResidentialLease(idx = {}, vow = {}) {
  const get = (field) => vow[field] ?? idx[field] ?? null;
  
  // For RESO compliance, keep essential timestamps
  return {
    // Core fields
    ListingKey:                 cleanSingleValue(get('ListingKey')),
    Furnished:                  cleanValue(get('Furnished')),
    RentIncludes:               cleanValue(get('RentIncludes')),
    
    // Essential RESO timestamps
    ModificationTimestamp:      cleanTimestamp(get('ModificationTimestamp')),
    SystemModificationTimestamp: cleanTimestamp(get('SystemModificationTimestamp')),
    OriginalEntryTimestamp:     cleanTimestamp(get('OriginalEntryTimestamp')),
    
    // Database housekeeping
    CreatedAt:                  get('CreatedAt') || new Date().toISOString(),
    UpdatedAt:                  new Date().toISOString()
  };
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
    .from('residential_lease')
    .upsert(mapped, { onConflict: 'ListingKey' });

  if (error) {
    console.error('Error upserting residential lease records:', error);
    throw error;
  } else {
    console.log(`Upserted ${mapped.length} residential lease records`);
  }
}