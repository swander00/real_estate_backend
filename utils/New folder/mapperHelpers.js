/**
 * mapperHelpers.js - Utilities for data cleaning and normalization
 * Simplified version with combined cleaning functions
 */

// =============================
// ✅ Unified Cleaning Utility
// =============================

/**
 * Unified cleaning function for values, arrays, and filtering unwanted terms
 * Combines functionality of cleanSingleValue, cleanArrayValue, and deepCleanArray
 * @param {any} value - Value to clean (string, array, etc.)
 * @param {Array} filterTerms - Optional terms to filter out
 * @returns {string|Array|null} - Cleaned value, array, or null
 */
export function cleanValue(value, filterTerms = ['None', 'Unknown', 'null', 'Other']) {
  // Handle null/undefined
  if (value == null) return null;
  
  // Handle strings
  if (typeof value === 'string') {
    // Handle string that might be a JSON array
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        const parsed = JSON.parse(value);
        return cleanValue(parsed, filterTerms);
      } catch (e) {
        // Not a valid JSON array, treat as regular string
      }
    }
    
    const cleaned = value.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
    if (cleaned === "" || filterTerms.map(t => t.toLowerCase()).includes(cleaned.toLowerCase())) return null;
    return cleaned;
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    const cleanedArray = value
      .map(item => typeof item === 'string' ? 
        cleanValue(item, filterTerms) : 
        item)
      .filter(item => {
        if (!item) return false;
        
        // For strings, check against filter terms
        if (typeof item === 'string') {
          return !filterTerms.some(term => 
            item.toLowerCase() === term.toLowerCase());
        }
        
        return true;
      });
    
    return cleanedArray.length > 0 ? [...new Set(cleanedArray)] : null;
  }
  
  // Handle other types
  return String(value);
}

// Legacy functions for backward compatibility
export function cleanSingleValue(value) {
  return cleanValue(value, []);
}

export function cleanArrayValue(value) {
  const result = cleanValue(value, []);
  return result || [];
}

export function deepCleanArray(value, filterTerms = ['None', 'Unknown', 'null', 'Other']) {
  return cleanValue(value, filterTerms);
}

// =============================
// ✅ Text Formatting
// =============================

/**
 * Capitalizes first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string|null} Capitalized text or null
 */
export function capitalizeWords(text) {
  if (!text) return null;
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalizes city names with standard mappings and MLS district cleanup
 * @param {string} city - City name to normalize
 * @returns {string|null} Normalized city name or null
 */
export function normalizeCityName(city) {
  if (!city) return null;
  
  // First remove MLS district codes (like C01, W4, E09, etc.)
  let cleanCity = cleanSingleValue(city);
  if (!cleanCity) return null;
  
  // Remove MLS district patterns like "Toronto C3", "Toronto W02", etc.
  cleanCity = cleanCity.replace(/\s+[CWENS][0-9]{1,2}$/i, '');
  
  // Common city name mappings
  const cityMap = {
    "Toronto": "Toronto",
    "North York": "Toronto",
    "Etobicoke": "Toronto",
    "Scarborough": "Toronto",
    "East York": "Toronto",
    "York": "Toronto",
    "Mississauga": "Mississauga",
    "Brampton": "Brampton",
    "Vaughan": "Vaughan",
    "Markham": "Markham",
    "Richmond Hill": "Richmond Hill",
    "Oakville": "Oakville",
    "Burlington": "Burlington",
    "Oshawa": "Oshawa",
    "Ajax": "Ajax",
    "Pickering": "Pickering",
    "Whitby": "Whitby",
    "Milton": "Milton"
  };

  // Try exact match first
  const normalizedCity = cityMap[cleanCity];
  if (normalizedCity) return normalizedCity;

  // Try case-insensitive match
  const lowerCity = cleanCity.toLowerCase();
  for (const [key, value] of Object.entries(cityMap)) {
    if (key.toLowerCase() === lowerCity) {
      return value;
    }
  }

  // Otherwise, just capitalize the words
  return capitalizeWords(cleanCity);
}

/**
 * Formats an address consistently
 * @param {string} address - Address to format
 * @returns {string|null} Formatted address or null
 */
export function formatAddress(address) {
  if (!address) return null;
  return cleanSingleValue(address);
}

/**
 * Formats a price value consistently
 * @param {*} price - Price value to format
 * @returns {number|null} Formatted price or null
 */
export function formatPrice(price) {
  if (!price) return null;
  const num = parseFloat(price);
  return isNaN(num) ? null : num;
}

/**
 * Formats a date string to ISO format
 * @param {string} dateStr - Date string to format
 * @returns {string|null} ISO date string or null
 */
export function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toISOString();
  } catch (e) {
    return null;
  }
}

/**
 * Cleans and formats a timestamp value
 * @param {string} timestamp - Timestamp to clean
 * @returns {string|null} ISO timestamp or null
 */
export function cleanTimestamp(timestamp) {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch (e) {
    return null;
  }
}

// =============================
// ✅ MlsStatus Logic
// =============================

/**
 * Normalizes MLS status values with fallback to transaction type
 * @param {string} mlsStatus - MLS status
 * @param {string} transactionType - Transaction type for fallback
 * @returns {string} Normalized status
 */
export function normalizeMlsStatus(mlsStatus, transactionType) {
  const raw = cleanSingleValue(mlsStatus);
  if (!raw || raw.toLowerCase() === "new") {
    return cleanSingleValue(transactionType) || "Unknown";
  }
  return raw;
}

// =============================
// ✅ Basement & Entrance Parsing
// =============================

const basementTypes = [
  "Apartment",
  "Crawl Space",
  "Development Potential",
  "Exposed Rock",
  "Finished",
  "Full",
  "Half",
  "Other",
  "Partial Basement",
  "Partially Finished",
  "Unfinished",
  "Unknown",
  "null"
];

const basementEntrances = ["Walk-Out", "Walk-Up", "Separate Entrance"];

/**
 * Parses basement information into type and entrance arrays
 * @param {*} rawValue - Raw basement data
 * @returns {Object} Object with basement and entrances arrays
 */
export function parseBasementInfo(rawValue) {
  const entries = cleanArrayValue(rawValue);
  const basement = [];
  const entrances = [];

  entries.forEach((item) => {
    if (!item || item.toLowerCase() === 'none' || item.toLowerCase() === 'unknown') return;
    
    basementTypes.forEach((type) => {
      if (item.toLowerCase().includes(type.toLowerCase())) {
        basement.push(type);
      }
    });
    basementEntrances.forEach((entry) => {
      if (item.toLowerCase().includes(entry.toLowerCase())) {
        entrances.push(entry);
      }
    });
  });

  return {
    basement: basement.length > 0 ? [...new Set(basement)] : null,
    entrances: entrances.length > 0 ? [...new Set(entrances)] : null
  };
}

// =============================
// ✅ PropertySubType Mapping
// =============================

/**
 * Maps property subtypes to standardized values
 * @param {string} rawValue - Raw property subtype
 * @returns {string} Standardized property subtype
 */
export function mapPropertySubType(rawValue) {
  const cleaned = cleanSingleValue(rawValue);
  if (!cleaned) return "Other";

  const mapping = {
    // Freehold Houses
    "Detached": "Detached",
    "Semi-Detached": "Semi-Detached",
    "Att/Row/Townhouse": "Townhouse (Row)",
    "Link": "Link House",
    "Farm": "Rural / Farm",
    "Rural Residential": "Rural / Farm",

    // Condo Living
    "Condo Apartment": "Condo Apartment",
    "Co-op Apartment": "Condo Apartment",
    "Co-Ownership Apartment": "Condo Apartment",
    "Condo Townhouse": "Condo Townhouse",
    "Detached Condo": "Detached Condo",
    "Semi-Detached Condo": "Semi-Detached Condo",
    "Common Element Condo": "Specialty Condos",
    "Leasehold Condo": "Specialty Condos",
    "Vacant Land Condo": "Specialty Condos",

    // Multi-Unit
    "Duplex": "Duplex",
    "Triplex": "Triplex",
    "Fourplex": "Multiplex",
    "Multiplex": "Multiplex",
    "Store W Apt/Office": "Multiplex",

    // Recreational
    "Cottage": "Cottage",
    "MobileTrailer": "Mobile / Manufactured Home",
    "Modular Home": "Mobile / Manufactured Home",

    // Special Use
    "Vacant Land": "Vacant Land",
    "Parking Space": "Parking / Locker",
    "Locker": "Parking / Locker",
    "Room": "Individual Units",
    "Upper Level": "Individual Units",
    "Lower Level": "Individual Units",
    "Timeshare": "Timeshare",
    "Other": "Other"
  };

  return mapping[cleaned] || "Other";
}

// =============================
// ✅ ArchitecturalStyle Mapping
// =============================

/**
 * Maps architectural styles to standardized values
 * @param {string} rawValue - Raw architectural style
 * @returns {string} Standardized architectural style
 */
export function mapArchitecturalStyle(rawValue) {
  const cleaned = cleanSingleValue(rawValue);
  if (!cleaned) return "Unknown";

  const map = {
    // Stories
    "1 1/2 Storey": "1 Storey",
    "1 Storey/Apt": "1 Storey",
    "2-Storey": "2 Storey",
    "2 1/2 Storey": "2 Storey",
    "3-Storey": "3 Storey",

    // Bungalow types
    "Bungalow": "Bungalow",
    "Bungalow-Raised": "Bungalow",
    "Bungaloft": "Bungalow",

    // Backsplit
    "Backsplit 3": "Backsplit",
    "Backsplit 4": "Backsplit",
    "Backsplit 5": "Backsplit",

    // Sidesplit
    "Sidesplit": "Sidesplit",
    "Sidesplit 3": "Sidesplit",
    "Sidesplit 4": "Sidesplit",
    "Sidesplit 5": "Sidesplit",

    // Other direct
    "Apartment": "Apartment",
    "Stacked Townhouse": "Stacked Townhouse",
    "Loft": "Loft / Studio",
    "Bachelor/Studio": "Loft / Studio",
    "Chalet": "Modern",
    "Contemporary": "Modern",
    "Garden House": "Modern",
    "Log": "Custom",
    "Multi-Level": "Custom",
    "Other": "Other",
    "Unknown": "Unknown"
  };

  return map[cleaned] || "Unknown";
}

// =============================
// ✅ Enhanced Room Measurements Formatting
// =============================

/**
 * Formats room dimensions in a consistent, readable format
 * @param {string} dimensions - Raw dimension string
 * @param {string} units - Unit of measurement
 * @returns {string|null} Formatted dimensions or null
 */
export function formatRoomMeasurements(dimensions, units) {
  if (!dimensions || !units) return null;
  
  const dim = cleanSingleValue(dimensions);
  const unit = cleanSingleValue(units);
  
  if (!dim || !unit) return null;
  
  // Handle already formatted dimensions that include unit indicators
  if (dim.includes('ft') || dim.includes('in.') || dim.toLowerCase().includes('m')) {
    // This is likely already formatted, just ensure consistent delimiter
    return dim.replace(/[xÃ—*]/g, '×').replace(/\s+×\s+/g, ' × ');
  }
  
  // Extract dimensions
  const parts = dim.split(/\s*[xÃ—*]\s*/);
  
  if (parts.length === 2) {
    // Format based on units
    if (unit.toLowerCase().includes('meter')) {
      // Format metric measurements with 2 decimal places
      return `${parseFloat(parts[0]).toFixed(2)}m × ${parseFloat(parts[1]).toFixed(2)}m`;
    } else if (unit.toLowerCase().includes('feet') || unit.toLowerCase().includes('foot')) {
      // Format imperial measurements
      // Check if dimensions include decimals (mixed feet/inches)
      const width = parseFloat(parts[0]);
      const length = parseFloat(parts[1]);
      
      const widthFeet = Math.floor(width);
      const widthInches = Math.round((width - widthFeet) * 12);
      const lengthFeet = Math.floor(length);
      const lengthInches = Math.round((length - lengthFeet) * 12);
      
      // Format with feet and inches
      let result = '';
      
      // Add width
      result += `${widthFeet}ft.`;
      if (widthInches > 0) {
        result += ` ${widthInches}in.`;
      }
      
      // Add delimiter
      result += 'm × ';
      
      // Add length
      result += `${lengthFeet}ft.`;
      if (lengthInches > 0) {
        result += ` ${lengthInches}in.`;
      }
      result += 'm';
      
      return result;
    } else {
      // Default formatting
      return `${parts[0]} × ${parts[1]} ${unit}`;
    }
  } else {
    // Fallback to original formatting with consistent delimiter
    return `${dim} ${unit.toLowerCase().includes('meter') ? 'm' : 'ft'}`;
  }
}

// =============================
// ✅ Lot Size Merge and Format
// =============================

/**
 * Formats lot size information from frontage, depth, and units
 * @param {*} frontage - Lot frontage
 * @param {*} depth - Lot depth
 * @param {string} units - Measurement units
 * @returns {string|null} Formatted lot size or null
 */
export function buildLotSize(frontage, depth, units) {
  const f = parseFloat(frontage);
  const d = parseFloat(depth);
  const u = cleanSingleValue(units);

  if (isNaN(f) || isNaN(d) || !u) return null;

  const abbr = u.toLowerCase().includes("meter") ? "m" : "ft";
  return `${f.toFixed(2)} x ${d.toFixed(2)} ${abbr}`;
}

// =============================
// ✅ Room Features Combine
// =============================

/**
 * Combines room features from multiple fields
 * @param {*} feature1 - First feature
 * @param {*} feature2 - Second feature
 * @param {*} feature3 - Third feature
 * @returns {Array|null} Combined features or null
 */
export function combineRoomFeatures(feature1, feature2, feature3) {
  const features = [
    cleanSingleValue(feature1),
    cleanSingleValue(feature2),
    cleanSingleValue(feature3)
  ].filter(Boolean);
  
  return features.length > 0 ? features : null;
}