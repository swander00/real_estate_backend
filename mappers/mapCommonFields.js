// mappers/mapCommonFields.js

import { extractSingleFromArrayString, capitalizeWords, normalizeCityName } from '../lib/utils.js';

// helper aliases for clarity
const cleanArray    = extractSingleFromArrayString;
const capitalize    = capitalizeWords;
const normalizeCity = normalizeCityName;

export function mapCommonFields(idx = {}, vow = {}) {
  // simple getter with VOW → IDX fallback
  const get = field => (vow[field] ?? idx[field] ?? null);

  return {
    ListingKey:                        get('ListingKey'),
    ListPrice:                         get('ListPrice'),
    ClosePrice:                        get('ClosePrice'),
    MlsStatus:                         get('MlsStatus'),
    ContractStatus:                    get('ContractStatus'),
    StandardStatus:                    get('StandardStatus'),
    TransactionType:                   get('TransactionType'),
    PropertyType:                      get('PropertyType'),
    PropertySubType:                   get('PropertySubType'),

    ArchitecturalStyle:                cleanArray(get('ArchitecturalStyle')),

    UnparsedAddress:                   capitalize(get('UnparsedAddress')),
    StreetNumber:                      get('StreetNumber'),
    StreetName:                        capitalize(get('StreetName')),
    StreetSuffix:                      get('StreetSuffix'),

    City:                              normalizeCity(get('City')),
    StateOrProvince:                   get('StateOrProvince'),
    PostalCode:                        get('PostalCode'),
    CountyOrParish:                    get('CountyOrParish'),
    CityRegion:                        get('CityRegion'),

    KitchensAboveGrade:                get('KitchensAboveGrade'),
    BedroomsAboveGrade:                get('BedroomsAboveGrade'),
    BathroomsTotalInteger:             get('BathroomsTotalInteger'),
    DenFamilyRoomYN:                   get('DenFamilyRoomYN'),

    PublicRemarks:                     capitalize(get('PublicRemarks')),

    PhotosChangeTimestamp:             get('PhotosChangeTimestamp'),
    MediaChangeTimestamp:              get('MediaChangeTimestamp'),
    ModificationTimestamp:             get('ModificationTimestamp'),
    SystemModificationTimestamp:       get('SystemModificationTimestamp'),

    OriginalEntryTimestamp:            get('OriginalEntryTimestamp'),
    SoldConditionalEntryTimestamp:     get('SoldConditionalEntryTimestamp'),
    SoldEntryTimestamp:                get('SoldEntryTimestamp'),
    SuspendedEntryTimestamp:           get('SuspendedEntryTimestamp'),
    TerminatedEntryTimestamp:          get('TerminatedEntryTimestamp'),
    CloseDate:                         get('CloseDate'),
    ConditionalExpiryDate:             get('ConditionalExpiryDate'),
    PurchaseContractDate:              get('PurchaseContractDate'),
    SuspendedDate:                     get('SuspendedDate'),
    TerminatedDate:                    get('TerminatedDate'),
    UnavailableDate:                   get('UnavailableDate'),

    Cooling:                           cleanArray(get('Cooling')),
    Basement:                          cleanArray(get('Basement')),
    HeatType:                          get('HeatType'),

    ExteriorFeatures:                  cleanArray(get('ExteriorFeatures')),
    InteriorFeatures:                  cleanArray(get('InteriorFeatures')),
    FireplaceYN:                       get('FireplaceYN'),
    PoolFeatures:                      cleanArray(get('PoolFeatures')),
    PropertyFeatures:                  cleanArray(get('PropertyFeatures')),
    Sewer:                             cleanArray(get('Sewer')),

    LivingAreaRange:                   get('LivingAreaRange'),
    CoveredSpaces:                     get('CoveredSpaces'),
    WaterfrontYN:                      get('WaterfrontYN'),
    BedroomsBelowGrade:                get('BedroomsBelowGrade'),
    CoveredSpaces:           		   get('CoveredSpaces'),
    KitchensBelowGrade:                get('KitchensBelowGrade'),
    KitchensTotal:                     get('KitchensTotal'),
    LotSizeRangeAcres:                 get('LotSizeRangeAcres'),

    ParkingSpaces:                     get('ParkingSpaces'),

    PossessionDetails:                 capitalize(get('PossessionDetails')),
    PossessionType:                    get('PossessionType'),

    ParkingTotal:                      get('ParkingTotal')
  };
}
