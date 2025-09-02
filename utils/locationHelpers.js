/**
 * locationHelpers.js
 * 
 * Utilities for handling and standardizing location information.
 */

import { cleanSingleValue } from './valueCleaners.js';
import { capitalizeWords } from './textFormatters.js';

/**
 * Normalizes city names with standard mappings and MLS district cleanup
 * @param {string} city - City name to normalize
 * @returns {string|null} - Normalized city name or null
 */
export function normalizeCityName(city) {
  if (!city) return null;
  
  // First remove MLS district codes (like C01, W4, E09, etc.)
  let cleanCity = cleanSingleValue(city);
  if (!cleanCity) return null;
  
  // Remove MLS district patterns like "Toronto C3", "Toronto W02", etc.
  cleanCity = cleanCity.replace(/\s+[CWENS][0-9]{1,2}$/i, '');
  
  // Common city name mappings
  const cityMap = {
    "Toronto": "Toronto",
    "North York": "Toronto",
    "Etobicoke": "Toronto",
    "Scarborough": "Toronto",
    "East York": "Toronto",
    "York": "Toronto",
    "Mississauga": "Mississauga",
    "Brampton": "Brampton",
    "Vaughan": "Vaughan",
    "Markham": "Markham",
    "Richmond Hill": "Richmond Hill",
    "Oakville": "Oakville",
    "Burlington": "Burlington",
    "Oshawa": "Oshawa",
    "Ajax": "Ajax",
    "Pickering": "Pickering",
    "Whitby": "Whitby",
    "Milton": "Milton"
  };

  // Try exact match first
  const normalizedCity = cityMap[cleanCity];
  if (normalizedCity) return normalizedCity;

  // Try case-insensitive match
  const lowerCity = cleanCity.toLowerCase();
  for (const [key, value] of Object.entries(cityMap)) {
    if (key.toLowerCase() === lowerCity) {
      return value;
    }
  }

  // Otherwise, just capitalize the words
  return capitalizeWords(cleanCity);
}