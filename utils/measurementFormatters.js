/**
 * measurementFormatters.js
 * 
 * Utilities for formatting and standardizing physical measurements.
 */

import { cleanSingleValue } from './valueCleaners.js';

/**
 * Formats room dimensions in a consistent, readable format
 * @param {string} dimensions - Raw dimension string
 * @param {string} units - Unit of measurement
 * @returns {string|null} - Formatted dimensions or null
 */
export function formatRoomMeasurements(dimensions, units) {
  if (!dimensions || !units) return null;
  
  const dim = cleanSingleValue(dimensions);
  const unit = cleanSingleValue(units);
  
  if (!dim || !unit) return null;
  
  // Handle already formatted dimensions that include unit indicators
  if (dim.includes('ft') || dim.includes('in.') || dim.toLowerCase().includes('m')) {
    // This is likely already formatted, just ensure consistent delimiter
    return dim.replace(/[xÃƒâ€"*]/g, '×').replace(/\s+×\s+/g, ' × ');
  }
  
  // Extract dimensions
  const parts = dim.split(/\s*[xÃƒâ€"*]\s*/);
  
  if (parts.length === 2) {
    // Format based on units
    if (unit.toLowerCase().includes('meter')) {
      // Format metric measurements with 2 decimal places
      return `${parseFloat(parts[0]).toFixed(2)}m × ${parseFloat(parts[1]).toFixed(2)}m`;
    } else if (unit.toLowerCase().includes('feet') || unit.toLowerCase().includes('foot')) {
      // Format imperial measurements
      // Check if dimensions include decimals (mixed feet/inches)
      const width = parseFloat(parts[0]);
      const length = parseFloat(parts[1]);
      
      const widthFeet = Math.floor(width);
      const widthInches = Math.round((width - widthFeet) * 12);
      const lengthFeet = Math.floor(length);
      const lengthInches = Math.round((length - lengthFeet) * 12);
      
      // Format with feet and inches
      let result = '';
      
      // Add width
      result += `${widthFeet}ft.`;
      if (widthInches > 0) {
        result += ` ${widthInches}in.`;
      }
      
      // Add delimiter
      result += ' × ';
      
      // Add length
      result += `${lengthFeet}ft.`;
      if (lengthInches > 0) {
        result += ` ${lengthInches}in.`;
      }
      
      return result;
    } else {
      // Default formatting
      return `${parts[0]} × ${parts[1]} ${unit}`;
    }
  } else {
    // Fallback to original formatting with consistent delimiter
    return `${dim} ${unit.toLowerCase().includes('meter') ? 'm' : 'ft'}`;
  }
}

/**
 * Formats lot size information from frontage, depth, and units
 * @param {*} frontage - Lot frontage
 * @param {*} depth - Lot depth
 * @param {string} units - Measurement units
 * @returns {string|null} - Formatted lot size or null
 */
export function buildLotSize(frontage, depth, units) {
  const f = parseFloat(frontage);
  const d = parseFloat(depth);
  const u = cleanSingleValue(units);

  if (isNaN(f) || isNaN(d) || !u) return null;

  const abbr = u.toLowerCase().includes("meter") ? "m" : "ft";
  return `${f.toFixed(2)} x ${d.toFixed(2)} ${abbr}`;
}