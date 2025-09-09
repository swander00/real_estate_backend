export function mapResidentialLease(idx = {}, vow = {}) {
  const get = (field) => vow[field] ?? idx[field] ?? null;

  return {
    // Core identifiers
    ListingKey: get('ListingKey'),
    Furnished: get('Furnished'),
    RentIncludes: get('RentIncludes'),

    // RESO timestamps
    ModificationTimestamp: get('ModificationTimestamp'),

    // Database housekeeping
    CreatedAt: get('CreatedAt') || new Date().toISOString(),
    UpdatedAt: new Date().toISOString()
  };
}
