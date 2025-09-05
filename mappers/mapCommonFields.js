// mappers/mapCommonFields.js
// Mapper for common_fields table - maps feed data to database columns

export function mapCommonFields(idx = {}, vow = {}) {
  // Use the original field mapping that matches the database schema
  return mapCommonFieldsLegacy(idx, vow);
}

// Legacy function for backward compatibility
export function mapCommonFieldsLegacy(idx = {}, vow = {}) {
  const get = field => (vow[field] ?? idx[field] ?? null);

  return {
    // === PRIMARY IDENTIFIERS AND PRICING ===
    ListingKey:                  get('ListingKey'),
    ListPrice:                   get('ListPrice'),
    ClosePrice:                  get('ClosePrice'),

    // === STATUS FIELDS ===
    MlsStatus:                   get('MlsStatus'),
    ContractStatus:              get('ContractStatus'),
    StandardStatus:              get('StandardStatus'),
    TransactionType:             get('TransactionType'),

    // === PROPERTY TYPE AND STYLE ===
    PropertyType:                get('PropertyType'),
    PropertySubType:             get('PropertySubType'),
    ArchitecturalStyle:          get('ArchitecturalStyle'),

    // === ADDRESS FIELDS ===
    UnparsedAddress:             get('UnparsedAddress'),
    StreetNumber:                get('StreetNumber'),
    StreetName:                  get('StreetName'),
    StreetSuffix:                get('StreetSuffix'),
    City:                        get('City'),
    StateOrProvince:             get('StateOrProvince'),
    PostalCode:                  get('PostalCode'),
    CountyOrParish:              get('CountyOrParish'),
    CityRegion:                  get('CityRegion'),

    // === ROOM COUNTS ===
    KitchensAboveGrade:          get('KitchensAboveGrade'),
    BedroomsAboveGrade:          get('BedroomsAboveGrade'),
    BathroomsTotalInteger:       get('BathroomsTotalInteger'),
    BedroomsBelowGrade:          get('BedroomsBelowGrade'),
    KitchensBelowGrade:          get('KitchensBelowGrade'),
    KitchensTotal:               get('KitchensTotal'),
    DenFamilyRoomYN:             get('DenFamilyRoomYN'),

    // === DESCRIPTIONS ===
    PublicRemarks:               get('PublicRemarks'),
    PossessionDetails:           get('PossessionDetails'),

    // === TIMESTAMPS ===
    PhotosChangeTimestamp:       get('PhotosChangeTimestamp'),
    MediaChangeTimestamp:        get('MediaChangeTimestamp'),
    ModificationTimestamp:       get('ModificationTimestamp'),
    SystemModificationTimestamp: get('SystemModificationTimestamp'),
    OriginalEntryTimestamp:      get('OriginalEntryTimestamp'),

    SoldConditionalEntryTimestamp: get('SoldConditionalEntryTimestamp'),
    SoldEntryTimestamp:            get('SoldEntryTimestamp'),
    SuspendedEntryTimestamp:       get('SuspendedEntryTimestamp'),
    TerminatedEntryTimestamp:      get('TerminatedEntryTimestamp'),

    // === IMPORTANT DATES ===
    CloseDate:                  get('CloseDate'),
    ConditionalExpiryDate:      get('ConditionalExpiryDate'),
    PurchaseContractDate:       get('PurchaseContractDate'),
    SuspendedDate:              get('SuspendedDate'),
    TerminatedDate:             get('TerminatedDate'),
    UnavailableDate:            get('UnavailableDate'),

    // === PROPERTY FEATURES (RAW ARRAYS/VALUES) ===
    Cooling:                    get('Cooling'),
    Sewer:                      get('Sewer'),
    Basement:                   get('Basement'),
    BasementEntrance:           get('BasementEntrance'),
    ExteriorFeatures:           get('ExteriorFeatures'),
    InteriorFeatures:           get('InteriorFeatures'),
    PoolFeatures:               get('PoolFeatures'),
    PropertyFeatures:           get('PropertyFeatures'),

    // === SINGLE VALUE PROPERTY CHARACTERISTICS ===
    HeatType:                   get('HeatType'),
    FireplaceYN:                get('FireplaceYN'),
    LivingAreaRange:            get('LivingAreaRange'),
    WaterfrontYN:               get('WaterfrontYN'),
    PossessionType:             get('PossessionType'),

    // === PARKING ===
    CoveredSpaces:              get('CoveredSpaces'),
    ParkingSpaces:              get('ParkingSpaces'),
    ParkingTotal:               get('ParkingTotal'),
  };
}
