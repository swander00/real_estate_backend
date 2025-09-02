/**
 * validationHelpers.js
 * 
 * Utilities for validating data against standards and schemas.
 * Focuses on RESO compliance and general data validation.
 */

/**
 * Validates a URL according to RESO standards
 * @param {string} url - The URL to validate
 * @returns {string|null} - Valid URL or null
 */
export function validateUrl(url) {
  if (!url) return null;
  
  try {
    // Basic URL validation
    new URL(url);
    
    // Check for RESO requirements (https or http)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return null;
    }
    
    return url;
  } catch (e) {
    return null;
  }
}

/**
 * Validates a value against a list of RESO standard enum values
 * @param {string} value - The value to validate
 * @param {Array<string>} validValues - List of valid values
 * @returns {string|null} - Valid value or null
 */
export function validateResoEnumValue(value, validValues) {
  if (!value) return null;
  if (!validValues || !Array.isArray(validValues)) return value;
  
  const cleanValue = String(value).trim();
  
  // If the value is in the valid list, return it
  if (validValues.includes(cleanValue)) {
    return cleanValue;
  }
  
  // Try case-insensitive match as a fallback
  const lowerValue = cleanValue.toLowerCase();
  const match = validValues.find(v => v.toLowerCase() === lowerValue);
  
  return match || null; // Return match if found, otherwise null for invalid values
}