// mappers/mapResidentialCondo.js

// Import only necessary helpers from the new utility files
import { cleanSingleValue, cleanValue } from '../utils/valueCleaners.js';
import { cleanTimestamp } from '../utils/dateTimeHelpers.js';

export function mapResidentialCondo(idx = {}, vow = {}) {
  const get = (field) => (vow[field] ?? idx[field] ?? null);

  // For upserts: use existing timestamps if available, otherwise let DB defaults handle it
  const now = new Date().toISOString();
  const existingCreatedAt = get('CreatedAt');

  // Process array fields using the imported helpers
  const associationAmenities = cleanValue(get('AssociationAmenities'));
  const petsAllowed = cleanValue(get('PetsAllowed'));
  const associationFeeIncludes = cleanValue(get('AssociationFeeIncludes'));

  return {
    ListingKey:              cleanSingleValue(get('ListingKey')),
    UnitNumber:              cleanSingleValue(get('UnitNumber')),
    AssociationAmenities:    Array.isArray(associationAmenities) ? associationAmenities.join(', ') : associationAmenities,
    Locker:                  cleanSingleValue(get('Locker')),
    BalconyType:             cleanSingleValue(get('BalconyType')),
    PetsAllowed:             Array.isArray(petsAllowed) ? petsAllowed.join(', ') : petsAllowed,
    AssociationFee:          get('AssociationFee'),
    AssociationFeeIncludes:  Array.isArray(associationFeeIncludes) ? associationFeeIncludes.join(', ') : associationFeeIncludes,
    
    // Standard timestamp fields
    ModificationTimestamp:      cleanTimestamp(get('ModificationTimestamp')),
    SystemModificationTimestamp: cleanTimestamp(get('SystemModificationTimestamp')),
    OriginalEntryTimestamp:     cleanTimestamp(get('OriginalEntryTimestamp')),
    CreatedAt:                  existingCreatedAt || now,
    UpdatedAt:                  now
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
    .from('residential_condo')
    .upsert(mapped, { onConflict: 'ListingKey' });

  if (error) {
    console.error('Error upserting residential condo records:', error);
    throw error;
  } else {
    console.log(`Upserted ${mapped.length} residential condo records`);
  }
}