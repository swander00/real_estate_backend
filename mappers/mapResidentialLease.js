// mappers/mapResidentialLease.js

// Helper function
function extractSingleFromArrayString(value) {
  if (!value) return null;
  return Array.isArray(value) && value.length > 0 ? value[0] : value;
}

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