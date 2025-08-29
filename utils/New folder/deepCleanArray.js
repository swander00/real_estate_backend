/**
 * deepCleanArray.js
 * 
 * A legacy wrapper around cleanValue specifically designed for arrays,
 * with support for filtering out common unwanted terms like 'None', 'Unknown'.
 * Unlike cleanArrayValue, this function may return null if all values are filtered out.
 * 
 * @param {any} value - Array to clean
 * @param {Array} filterTerms - Terms to filter out
 * @returns {Array|null} - Cleaned array or null
 */
import { cleanValue } from './cleanValue.js';

export function deepCleanArray(value, filterTerms = ['None', 'Unknown', 'null', 'Other']) {
  return cleanValue(value, filterTerms);
}