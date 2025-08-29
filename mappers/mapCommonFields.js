// mappers/mapCommonFields.js
// Maps and normalizes common fields from IDX and VOW data sources for real estate listings

// Import helpers from new utility files
import {
  cleanValue,
  cleanSingleValue,
  cleanArrayValue,
  deepCleanArray
} from '../utils/valueCleaners.js';

import { cleanTimestamp } from '../utils/dateTimeHelpers.js';

import { capitalizeWords } from '../utils/textFormatters.js';

import { normalizeCityName } from '../utils/locationHelpers.js';

import {
  mapPropertySubType,
  mapArchitecturalStyle,
  normalizeMlsStatus,
  parseBasementInfo
} from '../utils/propertyClassifiers.js';

// Removed buildLotSize import as it's no longer needed

/**
 * Maps common fields from IDX and VOW data sources
 * Updated to use comprehensive helper functions for better data cleaning
 */
export function mapCommonFields(idx = {}, vow = {}) {
  const get = field => (vow[field] ?? idx[field] ?? null);

  // =========================================================================
  // PROCESS FIELDS WITH SPECIAL CLEANING
  // =========================================================================
  
  // MLS Status with transaction type fallback
  const MlsStatus = normalizeMlsStatus(get('MlsStatus'), get('TransactionType'));
  
  // Property SubType mapping
  const PropertySubType = mapPropertySubType(get('PropertySubType'));
  
  // Architectural Style mapping
  const ArchitecturalStyle = mapArchitecturalStyle(get('ArchitecturalStyle'));
  
  // Basement and Entrance cleaning
  const basementInfo = parseBasementInfo(get('Basement'));
  const Basement = basementInfo.basement && 
    basementInfo.basement.length > 0 && 
    !basementInfo.basement.every(item => item === "None") 
      ? basementInfo.basement.filter(item => item !== "None").join(", ")
      : null;
      
  const BasementEntrance = basementInfo.entrances && 
    basementInfo.entrances.length > 0 && 
    !basementInfo.entrances.every(item => item === "None") 
      ? basementInfo.entrances.filter(item => item !== "None").join(", ")
      : null;
  
  // Interior Features cleaning
  const cleanedInteriorFeatures = deepCleanArray(get('InteriorFeatures'));
  const InteriorFeatures = cleanedInteriorFeatures 
    ? cleanedInteriorFeatures.join(", ")
    : null;
  
  // Property Features cleaning
  const cleanedPropertyFeatures = deepCleanArray(get('PropertyFeatures'));
  const PropertyFeatures = cleanedPropertyFeatures
    ? cleanedPropertyFeatures.join(", ")
    : null;
  
  // Pool Features cleaning
  const cleanedPoolFeatures = deepCleanArray(get('PoolFeatures'));
  const PoolFeatures = cleanedPoolFeatures
    ? cleanedPoolFeatures.join(", ")
    : null;
  
  // Exterior Features cleaning
  const cleanedExteriorFeatures = deepCleanArray(get('ExteriorFeatures'));
  const ExteriorFeatures = cleanedExteriorFeatures
    ? cleanedExteriorFeatures.join(", ")
    : null;
  
  // Sewer - handle as single value, not array
  const sewerValue = get('Sewer');
  // If it's already an array, get the first value; otherwise, clean as is
  const Sewer = Array.isArray(sewerValue) 
    ? cleanSingleValue(sewerValue[0]) 
    : cleanSingleValue(sewerValue);
  
  // Removed entire LotSize processing block as it's now handled in residentialFreehold mapper

  return {
    // =========================================================================
    // PRIMARY IDENTIFIERS AND PRICING
    // =========================================================================
    ListingKey:                        get('ListingKey'),
    ListPrice:                         get('ListPrice'),
    ClosePrice:                        get('ClosePrice'),

    // =========================================================================
    // STATUS FIELDS with enhanced cleaning
    // =========================================================================
    MlsStatus,                         // Using normalizeMlsStatus helper
    ContractStatus:                    get('ContractStatus'),
    StandardStatus:                    get('StandardStatus'),
    TransactionType:                   get('TransactionType'),

    // =========================================================================
    // PROPERTY TYPE AND STYLE with enhanced cleaning
    // =========================================================================
    PropertyType:                      get('PropertyType'),
    PropertySubType,                   // Using mapPropertySubType helper
    ArchitecturalStyle,                // Using mapArchitecturalStyle helper

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
    // PROPERTY FEATURES - CLEANED and FORMATTED
    // =========================================================================
    Cooling:                           cleanValue(get('Cooling')),
    Sewer,                             // Special handling for array to single value
    Basement,                          // Using parseBasementInfo helper
    BasementEntrance,                  // Using parseBasementInfo helper
    ExteriorFeatures,                  // Using deepCleanArray helper with string conversion
    InteriorFeatures,                  // Using deepCleanArray helper with string conversion
    PoolFeatures,                      // Using deepCleanArray helper with string conversion
    PropertyFeatures,                  // Using deepCleanArray helper with string conversion

    // =========================================================================
    // SINGLE VALUE PROPERTY CHARACTERISTICS
    // =========================================================================
    HeatType:                          get('HeatType'),
    FireplaceYN:                       get('FireplaceYN'),
    LivingAreaRange:                   get('LivingAreaRange'),
    WaterfrontYN:                      get('WaterfrontYN'),
    PossessionType:                    get('PossessionType'),

    // =========================================================================
    // PARKING INFORMATION (keeping original values as-is)
    // =========================================================================
    CoveredSpaces:                     get('CoveredSpaces'),
    ParkingSpaces:                     get('ParkingSpaces'),
    ParkingTotal:                      get('ParkingTotal')
  };
}