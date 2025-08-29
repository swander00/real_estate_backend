/**
 * cleanSingleValue.js
 * 
 * A legacy wrapper around cleanValue that focuses on cleaning a single value
 * without applying filter terms. Used for simple string cleaning operations
 * where no filtering of specific terms is needed.
 * 
 * @param {any} value - Value to clean
 * @returns {string|null} - Cleaned value or null
 */
import { cleanValue } from './cleanValue.js';

export function cleanSingleValue(value) {
  return cleanValue(value, []);
}