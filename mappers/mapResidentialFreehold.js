// mappers/mapResidentialFreehold.js
// ✅ Renamed file and fixed function name to match convention

export function mapResidentialFreehold(idx = {}, vow = {}) {
  const get = (field) => vow[field] ?? idx[field] ?? null;

  return {
    LotDepth:              get('LotDepth'),
    LotWidth:              get('LotWidth'),
    LotSizeUnits:          get('LotSizeUnits'),
    ApproximateAge:        get('ApproximateAge'),
    AdditionalMonthlyFee:  get('AdditionalMonthlyFee'),
    LotSizeRangeAcres:     get('LotSizeRangeAcres'),
    TaxAnnualAmount:       get('TaxAnnualAmount'),
    TaxYear:               get('TaxYear')
  };
}

/**
 * Upserts residential freehold records into the residential_freehold table.
 * 
 * @param {object} supabase - Supabase client
 * @param {Array<object>} records - Raw feed records
 */
export async function upsertResidentialFreehold(supabase, records) {
  const mapped = records.map(record => mapResidentialFreehold(record, {}));

  const { data, error } = await supabase
    .from('residential_freehold') // <-- replace with your actual table name
    .upsert(mapped, { onConflict: 'ListingKey' });

  if (error) {
    console.error('❌ Error upserting residential freehold records:', error);
    throw error;
  } else {
    console.log(`✅ Upserted ${mapped.length} residential freehold records`);
  }
}
