// lib/utils.js
// General mapping utilities for data cleaning

/**
 * Parses a JSON-array string and returns the first element, or null if invalid.
 * @param {string} value - JSON string representing an array (e.g., '["Item"]').
 * @returns {string|null}
 */
export function extractSingleFromArrayString(value) {
  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0];
    }
  } catch {
    // If not valid JSON, return original string
    return value;
  }

  return null;
}

/**
 * Capitalizes the first letter of each word in a string and lowercases the rest.
 * @param {string} input
 * @returns {string}
 */
export function capitalizeWords(input) {
  if (typeof input !== 'string') return input;

  return input
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalizes city names by stripping known suffixes for Toronto.
 * @param {string} value
 * @returns {string}
 */
export function normalizeCityName(value) {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();

  // Strip suffixes like "C04", "C15" when the city is Toronto
  if (/^Toronto\s+C\d{2}$/i.test(trimmed)) {
    return 'Toronto';
  }

  return trimmed;
}
