// mappers/mapResidentialLease.js - Maps to residential_lease table

export function mapResidentialLease(idx = {}, vow = {}) {
  const get = field => (vow[field] ?? idx[field] ?? null);

  return {
    // === PRIMARY IDENTIFIER ===
    ListingKey:                 get('ListingKey'),   // FK to common_fields

    // === TIMESTAMPS ===
    ModificationTimestamp:      get('ModificationTimestamp'),
    SystemModificationTimestamp: get('SystemModificationTimestamp'),

    // === LEASE DETAILS ===
    RentIncludes:               get('RentIncludes') || null,         // Multi (array)
    Furnished:                  get('Furnished') || null,            // Single
    PetsAllowed:                get('PetsAllowed') || null,          // Multi (array)
    LeasedTerms:                get('LeasedTerms') || null,          // Description
    LeasedLandFee:              get('LeasedLandFee') || null,        // Numeric
    LaundryFeatures:            get('LaundryFeatures') || null,      // Multi (array)
    ParkingMonthlyCost:         get('ParkingMonthlyCost') || null,   // Numeric
    OccupantType:               get('OccupantType') || null          // Single
  };
}
