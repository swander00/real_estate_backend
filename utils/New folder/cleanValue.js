/**
 * cleanValue.js
 * 
 * A unified cleaning utility that handles various types of data:
 * - For strings: Trims whitespace, removes quotes, filters out common empty values
 * - For arrays: Cleans each element, removes duplicates, filters unwanted terms
 * - For other types: Converts to string
 * 
 * This function serves as the foundation for data normalization across the system,
 * providing consistent handling of null values, empty strings, and unwanted terms.
 * 
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