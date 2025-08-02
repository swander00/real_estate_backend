// mappers/mapResidentialCondo.js

export function mapResidentialCondo(idx = {}, vow = {}) {
  const get = field => vow[field] ?? idx[field] ?? null;

  return {
    ListingKey:              get('ListingKey'),
    UnitNumber:              get('UnitNumber'),
    AssociationAmenities:    get('AssociationAmenities'),
    Locker:                  get('Locker'),
    BalconyType:             get('BalconyType'),
    PetsAllowed:             get('PetsAllowed'),
    AssociationFee:          get('AssociationFee'),
    AssociationFeeIncludes:  get('AssociationFeeIncludes')
  };
}
