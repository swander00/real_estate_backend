// mappers/mapResidentialCondo.js

import { extractSingleFromArrayString, joinArray } from '../lib/utils.js';

export function mapResidentialCondo(idx = {}, vow = {}) {
  const get = field => vow[field] ?? idx[field] ?? null;

  return {
    ListingKey:              get('ListingKey'),
    UnitNumber:              get('UnitNumber'),
    AssociationAmenities:    joinArray(extractSingleFromArrayString(get('AssociationAmenities'))),
    Locker:                  get('Locker'),
    BalconyType:             get('BalconyType'),
    PetsAllowed:             joinArray(extractSingleFromArrayString(get('PetsAllowed'))),
    AssociationFee:          get('AssociationFee'),
    AssociationFeeIncludes:  joinArray(extractSingleFromArrayString(get('AssociationFeeIncludes')))
  };
}
