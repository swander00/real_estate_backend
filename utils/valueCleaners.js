/**
 * valueCleaners.js
 * 
 * Core utilities for cleaning and normalizing data values.
 * These functions form the foundation for data normalization across the system.
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

/**
 * Simplified wrapper for single values without filtering
 * @param {any} value - Value to clean
 * @returns {string|null} - Cleaned value or null
 */
export function cleanSingleValue(value) {
  return cleanValue(value, []);
}

/**
 * Array-focused wrapper ensuring array return
 * @param {any} value - Value to clean and convert to array
 * @returns {Array} - Cleaned array (never null)
 */
export function cleanArrayValue(value) {
  const result = cleanValue(value, []);
  return result || [];
}

/**
 * Array-focused wrapper with filtering capability
 * @param {any} value - Array to clean
 * @param {Array} filterTerms - Terms to filter out
 * @returns {Array|null} - Cleaned array or null
 */
export function deepCleanArray(value, filterTerms = ['None', 'Unknown', 'null', 'Other']) {
  return cleanValue(value, filterTerms);
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