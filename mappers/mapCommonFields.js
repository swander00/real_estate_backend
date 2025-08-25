// mappers/mapCommonFields.js
// Maps and normalizes common fields from IDX and VOW data sources for real estate listings

/**
 * Extracts the first element from an array or returns the value if it's not an array
 * Used for fields that come as arrays but should be stored as single values
 * @param {any} value - The value to process
 * @returns {any|null} - Single value or null
 */
const extractSingleFromArrayString = (value) => {
  if (!value) return null;
  return Array.isArray(value) && value.length > 0 ? value[0] : value;
};

/**
 * Ensures a value is properly formatted as an array for PostgreSQL array fields
 * Handles various input formats: strings, arrays, comma-separated values
 * @param {any} value - The value to convert to array format
 * @returns {Array|null} - Array of values or null
 */
const ensureArray = (value) => {
  if (!value) return null;
  
  // If already an array, return as-is
  if (Array.isArray(value)) return value;
  
  // If it's a string, handle comma-separated values or single values
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    
    // Check if it contains commas (comma-separated list)
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(s => s.trim()).filter(s => s !== '');
    }
    
    // Single string value, wrap in array
    return [trimmed];
  }
  
  // For other types (numbers, booleans, etc.), wrap in array
  return [value];
};

/**
 * Capitalizes the first letter of each word in a string
 * @param {string} str - String to capitalize
 * @returns {string|null} - Capitalized string or null
 */
const capitalizeWords = (str) => {
  if (!str) return null;
  return String(str).replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Normalizes city names by trimming whitespace and capitalizing properly
 * @param {string} city - City name to normalize
 * @returns {string|null} - Normalized city name or null
 */
const normalizeCityName = (city) => {
  if (!city) return null;
  return capitalizeWords(String(city).trim());
};

// Legacy aliases for backward compatibility
const cleanArray = extractSingleFromArrayString;
const capitalize = capitalizeWords;
const normalizeCity = normalizeCityName;

/**
 * Maps common fields from IDX and VOW data sources into a standardized format
 * Prioritizes VOW data over IDX data when both are available
 * 
 * @param {Object} idx - IDX data object (public listings)
 * @param {Object} vow - VOW data object (sold/off-market listings)
 * @returns {Object} - Mapped common fields object
 */
export function mapCommonFields(idx = {}, vow = {}) {
  // Helper function to get field value, preferring VOW over IDX
  const get = field => (vow[field] ?? idx[field] ?? null);

  return {
    // Primary identifiers and pricing
    ListingKey:                        get('ListingKey'),
    ListPrice:                         get('ListPrice'),
    ClosePrice:                        get('ClosePrice'),

    // Status fields
    MlsStatus:                         get('MlsStatus'),
    ContractStatus:                    get('ContractStatus'),
    StandardStatus:                    get('StandardStatus'),
    TransactionType:                   get('TransactionType'),

    // Property type and style
    PropertyType:                      get('PropertyType'),
    PropertySubType:                   get('PropertySubType'),
    ArchitecturalStyle:                ensureArray(get('ArchitecturalStyle')), // Array field

    // Address fields
    UnparsedAddress:                   capitalize(get('UnparsedAddress')),
    StreetNumber:                      get('StreetNumber'),
    StreetName:                        capitalize(get('StreetName')),
    StreetSuffix:                      get('StreetSuffix'),
    City:                              normalizeCity(get('City')),
    StateOrProvince:                   get('StateOrProvince'),
    PostalCode:                        get('PostalCode'),
    CountyOrParish:                    get('CountyOrParish'),
    CityRegion:                        get('CityRegion'),

    // Room counts
    KitchensAboveGrade:                get('KitchensAboveGrade'),
    BedroomsAboveGrade:                get('BedroomsAboveGrade'),
    BathroomsTotalInteger:             get('BathroomsTotalInteger'),
    BedroomsBelowGrade:                get('BedroomsBelowGrade'),
    KitchensBelowGrade:                get('KitchensBelowGrade'),
    KitchensTotal:                     get('KitchensTotal'),
    DenFamilyRoomYN:                   get('DenFamilyRoomYN'),

    // Descriptions and remarks
    PublicRemarks:                     capitalize(get('PublicRemarks')),
    PossessionDetails:                 capitalize(get('PossessionDetails')),

    // Timestamp fields for tracking changes
    PhotosChangeTimestamp:             get('PhotosChangeTimestamp'),
    MediaChangeTimestamp:              get('MediaChangeTimestamp'),
    ModificationTimestamp:             get('ModificationTimestamp'),
    SystemModificationTimestamp:       get('SystemModificationTimestamp'),
    OriginalEntryTimestamp:            get('OriginalEntryTimestamp'),

    // Status change timestamps
    SoldConditionalEntryTimestamp:     get('SoldConditionalEntryTimestamp'),
    SoldEntryTimestamp:                get('SoldEntryTimestamp'),
    SuspendedEntryTimestamp:           get('SuspendedEntryTimestamp'),
    TerminatedEntryTimestamp:          get('TerminatedEntryTimestamp'),

    // Important dates
    CloseDate:                         get('CloseDate'),
    ConditionalExpiryDate:             get('ConditionalExpiryDate'),
    PurchaseContractDate:              get('PurchaseContractDate'),
    SuspendedDate:                     get('SuspendedDate'),
    TerminatedDate:                    get('TerminatedDate'),
    UnavailableDate:                   get('UnavailableDate'),

    // Property features and amenities (Array fields - these can contain multiple values)
    Cooling:                           ensureArray(get('Cooling')),
    Basement:                          ensureArray(get('Basement')), // This was causing the error
    ExteriorFeatures:                  ensureArray(get('ExteriorFeatures')),
    InteriorFeatures:                  ensureArray(get('InteriorFeatures')),
    PoolFeatures:                      ensureArray(get('PoolFeatures')),
    PropertyFeatures:                  ensureArray(get('PropertyFeatures')),
    Sewer:                             ensureArray(get('Sewer')),

    // Single value property characteristics
    HeatType:                          get('HeatType'),
    FireplaceYN:                       get('FireplaceYN'),
    LivingAreaRange:                   get('LivingAreaRange'),
    WaterfrontYN:                      get('WaterfrontYN'),
    LotSizeRangeAcres:                 get('LotSizeRangeAcres'),
    PossessionType:                    get('PossessionType'),

    // Parking information
    CoveredSpaces:                     get('CoveredSpaces'),
    ParkingSpaces:                     get('ParkingSpaces'),
    ParkingTotal:                      get('ParkingTotal')
  };
}