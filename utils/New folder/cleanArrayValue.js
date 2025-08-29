/**
 * cleanArrayValue.js
 * 
 * A legacy wrapper around cleanValue that handles array values,
 * ensuring that it always returns an array (empty array instead of null).
 * Used when an empty array is preferred over null for array-type values.
 * 
 * @param {any} value - Value to clean and convert to array
 * @returns {Array} - Cleaned array (never null)
 */
import { cleanValue } from './cleanValue.js';

export function cleanArrayValue(value) {
  const result = cleanValue(value, []);
  return result || [];
}