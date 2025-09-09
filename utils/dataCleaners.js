/**
 * dataCleaners.js
 * 
 * Core utilities for cleaning and parsing raw data values.
 * Handles strings, arrays, numbers, and booleans.
 * Note: PostgreSQL array format handling moved to postgreSQLCleaner.js
 */

/**
 * Core cleaning function for values, arrays, and filtering unwanted terms
 * @param {any} value - Value to clean (string, array, etc.)
 * @param {Array} filterTerms - Optional terms to filter out
 * @returns {string|Array|null} - Cleaned value, array, or null
 */
export function cleanValue(value, filterTerms = ['None', 'Unknown', 'null', 'Other']) {
  // Handle null/undefined
  if (value == null) return null;
  
  // Handle strings
  if (typeof value === 'string') {
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
  
  // Handle other types - convert to string
  return String(value);
}

/**
 * Simplified wrapper for single values without filtering
 * @param {any} value - Value to clean
 * @returns {string|null} - Cleaned value or null
 */
export function cleanSingleValue(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const cleaned = value.trim();
    return cleaned === "" ? null : cleaned;
  }
  return String(value);
}

/**
 * Array-focused wrapper ensuring array return
 * @param {any} value - Value to clean and convert to array
 * @returns {Array} - Cleaned array (never null)
 */
export function cleanArrayValue(value) {
  if (value == null) return [];
  
  if (Array.isArray(value)) {
    return cleanValue(value) || [];
  }
  
  // If it's a single value, wrap it in an array
  const cleaned = cleanValue(value);
  return cleaned ? [cleaned] : [];
}

/**
 * DEPRECATED - Use cleanPostgreSQLArrayString from postgreSQLCleaner.js instead
 * Kept for backward compatibility
 */
export function cleanArrayToString(value) {
  console.warn('cleanArrayToString is deprecated. Use cleanPostgreSQLArrayString from postgreSQLCleaner.js');
  
  if (!value) return null;
  
  if (Array.isArray(value)) {
    const filtered = value.filter(v => v && v !== 'None' && v !== 'Unknown' && v !== 'null' && v !== 'Other');
    return filtered.length > 0 ? filtered.join(', ') : null;
  }
  
  const cleaned = cleanValue(value);
  return typeof cleaned === 'string' ? cleaned : null;
}

/**
 * Safely converts values to integers
 * @param {any} value - Value to convert to integer
 * @returns {number|null} - Integer or null
 */
export function cleanInt(value) {
  if (value === null || value === undefined) return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Safely converts values to boolean
 * @param {any} value - Value to convert to boolean
 * @returns {boolean|null} - Boolean or null
 */
export function cleanBoolean(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  const str = String(value).toLowerCase().trim();
  return str === 'true' || str === '1' || str === 'yes';
}

/**
 * Converts Y/N values to boolean
 * @param {any} value - Y/N value to convert
 * @returns {boolean|null} - Boolean or null
 */
export function convertYNToBoolean(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).toUpperCase().trim();
  if (str === 'Y' || str === 'YES') return true;
  if (str === 'N' || str === 'NO') return false;
  return null;
}

/**
 * Ensures a value is returned as an integer
 * @param {any} value - Value to convert
 * @param {number} defaultValue - Default if conversion fails
 * @returns {number} - Integer value
 */
export function ensureInteger(value, defaultValue = 0) {
  const result = cleanInt(value);
  return result !== null ? result : defaultValue;
}

/**
 * Formats a price value consistently
 * @param {*} price - Price value to format
 * @returns {number|null} - Formatted price or null
 */
export function formatPrice(price) {
  if (!price) return null;
  const num = parseFloat(price);
  return isNaN(num) ? null : num;
}

/**
 * Safely converts values to float/decimal
 * @param {any} value - Value to convert to float
 * @returns {number|null} - Float or null
 */
export function cleanFloat(value) {
  if (value === null || value === undefined) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Extract and validate image dimensions
 * @param {any} width - Image width
 * @param {any} height - Image height
 * @param {any} size - Image file size in bytes
 * @returns {object} - Object with validated width, height, and size
 */
export function getImageDimensions(width, height, size) {
  const cleanInternal = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  
  return {
    width: cleanInternal(width),
    height: cleanInternal(height),
    size: cleanInternal(size)
  };
}