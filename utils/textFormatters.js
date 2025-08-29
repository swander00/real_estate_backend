/**
 * textFormatters.js
 * 
 * Utilities for formatting and standardizing text content.
 */

import { cleanSingleValue } from './valueCleaners.js';

/**
 * Capitalizes first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string|null} - Capitalized text or null
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
 * Formats an address consistently
 * @param {string} address - Address to format
 * @returns {string|null} - Formatted address or null
 */
export function formatAddress(address) {
  if (!address) return null;
  return cleanSingleValue(address);
}

/**
 * Combines room features from multiple fields
 * @param {*} feature1 - First feature
 * @param {*} feature2 - Second feature
 * @param {*} feature3 - Third feature
 * @returns {Array|null} - Combined features or null
 */
export function combineRoomFeatures(feature1, feature2, feature3) {
  const features = [
    cleanSingleValue(feature1),
    cleanSingleValue(feature2),
    cleanSingleValue(feature3)
  ].filter(Boolean);
  
  return features.length > 0 ? features : null;
}