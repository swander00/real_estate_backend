// mappers/mapperHelpers.js
// Shared utility functions for data transformation across all RESO mappers

/**
 * Cleans single-value fields that arrive as arrays but should be stored as strings
 */
export const cleanSingleValue = (value) => {
  if (!value) return null;
  
  const array = Array.isArray(value) ? value : [value];
  const cleaned = array.filter(v => v && v !== 'None' && String(v).trim() !== '');
  
  return cleaned.length > 0 ? String(cleaned[0]).trim() : null;
};

/**
 * Cleans array fields by removing placeholder values and duplicates
 * Returns comma-separated string for storage in text columns
 */
export const cleanArrayValue = (value) => {
  if (!value) return null;
  
  const array = Array.isArray(value) ? value : [value];
  const cleaned = array
    .filter(v => v && v !== 'None' && String(v).trim() !== '')
    .map(v => String(v).trim())
    .filter((v, i, arr) => arr.indexOf(v) === i);
  
  return cleaned.length > 0 ? cleaned.join(', ') : null;
};

/**
 * Capitalizes the first letter of each word in a string
 */
export const capitalizeWords = (str) => {
  if (!str) return null;
  
  return String(str).replace(/\w\S*/g, (word) => 
    word.charAt(0).toUpperCase() + word.substr(1).toLowerCase()
  );
};

/**
 * Normalizes city names with consistent formatting
 */
export const normalizeCityName = (city) => {
  if (!city) return null;
  return capitalizeWords(String(city).trim());
};

/**
 * Safely converts timestamps to ISO format
 */
export const cleanTimestamp = (value) => {
  if (!value) return null;
  
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

/**
 * Safely converts various formats to boolean values
 */
export const cleanBoolean = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  
  const str = String(value).toLowerCase().trim();
  if (str === '') return null;
  
  return str === 'true' || str === '1' || str === 'yes';
};

/**
 * Safely converts values to numbers
 */
export const safeNumeric = (value) => {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  const strValue = String(value).trim();
  if (strValue === '') return null;
  
  const nonNumericPatterns = [
    /^<\s*.+/, /^>\s*.+/, /^\+\s*./,
    /^n\/a$/i, /^none$/i, /^unknown$/i, /^tbd$/i, /^varies$/i, /^call$/i,
    /^see\s+remarks$/i
  ];
  
  for (const pattern of nonNumericPatterns) {
    if (pattern.test(strValue)) return null;
  }
  
  const cleaned = strValue
    .replace(/[$,\s]/g, '')
    .replace(/[^\d.-]/g, '');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Safely converts values to integers
 */
export const safeInteger = (value) => {
  const numValue = safeNumeric(value);
  return numValue === null ? null : Math.round(numValue);
};

// Convenience aliases
export const capitalize = capitalizeWords;
export const normalizeCity = normalizeCityName;
export const cleanSingle = cleanSingleValue;
export const cleanArray = cleanArrayValue;