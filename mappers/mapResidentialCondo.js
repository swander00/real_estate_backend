// mappers/mapResidentialCondo.js

// Local utility functions
const extractSingleFromArrayString = (value) => {
  if (!value) return null;
  return Array.isArray(value) && value.length > 0 ? value[0] : value;
};

const joinArray = (arr) => {
  if (!arr) return null;
  return Array.isArray(arr) ? arr.join(', ') : String(arr);
};

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
    SystemModificationTimestamp: cleanDate(get('SystemModificationTimestamp')),
  };
}