// mappers/mapCommonFields.js
// Maps and normalizes common fields from IDX and VOW data sources for real estate listings

import {
  cleanSingleValue,
  cleanArrayValue,
  capitalizeWords,
  normalizeCityName,
  cleanTimestamp
} from './mapperHelpers.js';

/**
 * Maps common fields from IDX and VOW data sources
 * Updated to use comprehensive helper functions for better data cleaning
 */
export function mapCommonFields(idx = {}, vow = {}) {
  const get = field => (vow[field] ?? idx[field] ?? null);

  return {
    // =========================================================================
    // PRIMARY IDENTIFIERS AND PRICING
    // =========================================================================
    ListingKey:                        get('ListingKey'),
    ListPrice:                         get('ListPrice'),
    ClosePrice:                        get('ClosePrice'),

    // =========================================================================
    // STATUS FIELDS
    // =========================================================================
    MlsStatus:                         get('MlsStatus'),
    ContractStatus:                    get('ContractStatus'),
    StandardStatus:                    get('StandardStatus'),
    TransactionType:                   get('TransactionType'),

    // =========================================================================
    // PROPERTY TYPE AND STYLE
    // =========================================================================
    PropertyType:                      get('PropertyType'),
    PropertySubType:                   get('PropertySubType'),
    
    // ArchitecturalStyle: Usually single value like "2-Storey", "Apartment"
    // Clean as single value, not array
    ArchitecturalStyle:                cleanSingleValue(get('ArchitecturalStyle')),

    // =========================================================================
    // ADDRESS FIELDS
    // =========================================================================
    UnparsedAddress:                   capitalizeWords(get('UnparsedAddress')),
    StreetNumber:                      get('StreetNumber'),
    StreetName:                        capitalizeWords(get('StreetName')),
    StreetSuffix:                      get('StreetSuffix'),
    City:                              normalizeCityName(get('City')),
    StateOrProvince:                   get('StateOrProvince'),
    PostalCode:                        get('PostalCode'),
    CountyOrParish:                    get('CountyOrParish'),
    CityRegion:                        get('CityRegion'),

    // =========================================================================
    // ROOM COUNTS (keeping original values as-is)
    // =========================================================================
    KitchensAboveGrade:                get('KitchensAboveGrade'),
    BedroomsAboveGrade:                get('BedroomsAboveGrade'),
    BathroomsTotalInteger:             get('BathroomsTotalInteger'),
    BedroomsBelowGrade:                get('BedroomsBelowGrade'),
    KitchensBelowGrade:                get('KitchensBelowGrade'),
    KitchensTotal:                     get('KitchensTotal'),
    DenFamilyRoomYN:                   get('DenFamilyRoomYN'),

    // =========================================================================
    // DESCRIPTIONS AND REMARKS
    // =========================================================================
    PublicRemarks:                     capitalizeWords(get('PublicRemarks')),
    PossessionDetails:                 capitalizeWords(get('PossessionDetails')),

    // =========================================================================
    // TIMESTAMP FIELDS
    // =========================================================================
    PhotosChangeTimestamp:             cleanTimestamp(get('PhotosChangeTimestamp')),
    MediaChangeTimestamp:              cleanTimestamp(get('MediaChangeTimestamp')),
    ModificationTimestamp:             cleanTimestamp(get('ModificationTimestamp')),
    SystemModificationTimestamp:       cleanTimestamp(get('SystemModificationTimestamp')),
    OriginalEntryTimestamp:            cleanTimestamp(get('OriginalEntryTimestamp')),

    // Status change timestamps
    SoldConditionalEntryTimestamp:     cleanTimestamp(get('SoldConditionalEntryTimestamp')),
    SoldEntryTimestamp:                cleanTimestamp(get('SoldEntryTimestamp')),
    SuspendedEntryTimestamp:           cleanTimestamp(get('SuspendedEntryTimestamp')),
    TerminatedEntryTimestamp:          cleanTimestamp(get('TerminatedEntryTimestamp')),

    // =========================================================================
    // IMPORTANT DATES
    // =========================================================================
    CloseDate:                         cleanTimestamp(get('CloseDate')),
    ConditionalExpiryDate:             cleanTimestamp(get('ConditionalExpiryDate')),
    PurchaseContractDate:              cleanTimestamp(get('PurchaseContractDate')),
    SuspendedDate:                     cleanTimestamp(get('SuspendedDate')),
    TerminatedDate:                    cleanTimestamp(get('TerminatedDate')),
    UnavailableDate:                   cleanTimestamp(get('UnavailableDate')),

    // =========================================================================
    // PROPERTY FEATURES - SINGLE VALUES (stored as text)
    // =========================================================================
    // These often come as arrays but should be stored as single values
    
    // Cooling: Usually single value like "Central Air", "None"
    Cooling:                           cleanSingleValue(get('Cooling')),
    
    // Sewer: Usually single value like "Municipal", "Septic"
    Sewer:                             cleanSingleValue(get('Sewer')),

    // =========================================================================
    // PROPERTY FEATURES - MULTI-VALUES (stored as comma-separated strings)
    // =========================================================================
    // These genuinely contain multiple values and will be stored as comma-separated strings
    
    // Basement: Can have multiple values like "Finished, Separate Entrance"
    Basement:                          cleanArrayValue(get('Basement')),
    
    // ExteriorFeatures: Multiple features like "Deck, Garage, Patio"
    ExteriorFeatures:                  cleanArrayValue(get('ExteriorFeatures')),
    
    // InteriorFeatures: Multiple features like "Hardwood Floors, Fireplace"
    InteriorFeatures:                  cleanArrayValue(get('InteriorFeatures')),
    
    // PoolFeatures: Multiple features like "Inground Pool, Pool Heater"
    PoolFeatures:                      cleanArrayValue(get('PoolFeatures')),
    
    // PropertyFeatures: General property features as comma-separated string
    PropertyFeatures:                  cleanArrayValue(get('PropertyFeatures')),

    // =========================================================================
    // SINGLE VALUE PROPERTY CHARACTERISTICS
    // =========================================================================
    HeatType:                          get('HeatType'),
    FireplaceYN:                       get('FireplaceYN'),
    LivingAreaRange:                   get('LivingAreaRange'),
    WaterfrontYN:                      get('WaterfrontYN'),
    LotSizeRangeAcres:                 get('LotSizeRangeAcres'),
    PossessionType:                    get('PossessionType'),

    // =========================================================================
    // PARKING INFORMATION (keeping original values as-is)
    // =========================================================================
    CoveredSpaces:                     get('CoveredSpaces'),
    ParkingSpaces:                     get('ParkingSpaces'),
    ParkingTotal:                      get('ParkingTotal')
  };
}