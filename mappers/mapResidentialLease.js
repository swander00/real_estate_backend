// mappers/mapResidentialLease.js

export function mapResidentialLease(idx = {}, vow = {}) {
  return {
    ListingKey: vow.ListingKey || idx.ListingKey,
    Furnished: extractSingleFromArrayString(vow.Furnished || idx.Furnished),
    RentIncludes: vow.RentIncludes || idx.RentIncludes || [],
    LeasedTerms: vow.LeasedTerms || idx.LeasedTerms || null,
  };
}

// Helper
function extractSingleFromArrayString(value) {
  return Array.isArray(value) && value.length > 0 ? value[0] : value || null;
}
