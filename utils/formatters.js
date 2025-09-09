/**
 * formatters.js
 * 
 * All formatting utilities for dates, text, measurements, and locations.
 */

import { cleanSingleValue, cleanArrayValue } from './dataCleaners.js';

// ============= DATE/TIME FORMATTERS =============

/**
 * Cleans and formats a timestamp value to ISO format
 * @param {string} timestamp - Timestamp to clean
 * @returns {string|null} - ISO timestamp or null
 */
export function cleanTimestamp(timestamp) {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch (e) {
    return null;
  }
}

/**
 * Formats open house date information
 * @param {string} rawDate - Raw date string
 * @returns {object} - Object with formatted date information
 */
export function formatOpenHouseDate(rawDate) {
  let isoDate = null;
  let formattedDate = null;
  let dayOfWeek = null;
  
  if (rawDate) {
    const date = new Date(rawDate);
    if (!isNaN(date.getTime())) {
      isoDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
    }
  }
  
  return {
    isoDate,
    formattedDate,
    dayOfWeek
  };
}

/**
 * Formats open house time information
 * @param {string} rawStartTime - Raw start time string
 * @param {string} rawEndTime - Raw end time string
 * @returns {object} - Object with formatted time information
 */
export function formatOpenHouseTime(rawStartTime, rawEndTime) {
  let startTime = null;
  let endTime = null;
  let formattedRange = null;
  
  // Helper function to parse time string (HH:MM:SS or HH:MM format)
  function parseTimeString(timeStr) {
    if (!timeStr) return null;
    
    // If it's already in HH:MM:SS format, return as-is
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    
    // If it's in HH:MM format, add seconds
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      return timeStr + ':00';
    }
    
    // Try to parse as a full timestamp
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      return date.toTimeString().split(' ')[0]; // HH:MM:SS format
    }
    
    return null;
  }
  
  // Helper function to format time for display
  function formatTimeForDisplay(timeStr) {
    if (!timeStr) return null;
    
    // Parse the time string
    const time = parseTimeString(timeStr);
    if (!time) return null;
    
    // Convert to 12-hour format for display
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    
    return `${displayHour}:${minutes} ${ampm}`;
  }
  
  if (rawStartTime) {
    startTime = parseTimeString(rawStartTime);
  }
  
  if (rawEndTime) {
    endTime = parseTimeString(rawEndTime);
  }
  
  if (rawStartTime && rawEndTime) {
    const startDisplay = formatTimeForDisplay(rawStartTime);
    const endDisplay = formatTimeForDisplay(rawEndTime);
    
    if (startDisplay && endDisplay) {
      formattedRange = `${startDisplay} - ${endDisplay}`;
    }
  }
  
  return {
    startTime,
    endTime,
    formattedRange
  };
}

/**
 * Formats open house date and time into a single display string
 * @param {string} isoDate - ISO date string (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM:SS)
 * @param {string} endTime - End time (HH:MM:SS)
 * @returns {string|null} - Formatted string like "Feb 22nd | Sat 2-4PM" or "Feb 22nd | Sat 2:30-4:30PM"
 */
export function formatOpenHouseDateTime(isoDate, startTime, endTime) {
  if (!isoDate || !startTime || !endTime) return null;
  
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return null;
    
    // Helper function to get day suffix
    const getDaySuffix = (day) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    // Format date as "Feb 22nd"
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const dayWithSuffix = day + getDaySuffix(day);
    
    // Get day of week as "Sat"
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    // Format times from HH:MM:SS to 12-hour format
    const formatTime = (timeStr, includeMinutes) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 || 12;
      
      // Only show minutes if they're not :00 or if forced to include
      if (minutes === 0 && !includeMinutes) {
        return `${displayHour}`;
      } else {
        return `${displayHour}:${minutes.toString().padStart(2, '0')}`;
      }
    };
    
    // Parse minutes to check if both times are on the hour
    const startMinutes = parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(endTime.split(':')[1]);
    const bothOnHour = startMinutes === 0 && endMinutes === 0;
    
    // Get the AM/PM for each time
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    const startAmPm = startHour >= 12 ? 'PM' : 'AM';
    const endAmPm = endHour >= 12 ? 'PM' : 'AM';
    
    // Format the times
    const startFormatted = formatTime(startTime, false);
    const endFormatted = formatTime(endTime, false);
    
    // Build the time range
    let timeRange;
    if (bothOnHour && startAmPm === endAmPm) {
      // Both on hour and same AM/PM: "2-4PM"
      timeRange = `${startFormatted}-${endFormatted}${endAmPm}`;
    } else if (startAmPm === endAmPm) {
      // Same AM/PM but not both on hour: "2:30-4:30PM"
      timeRange = `${startFormatted}-${endFormatted}${endAmPm}`;
    } else {
      // Different AM/PM: "10AM-2PM" or "10:30AM-2:30PM"
      timeRange = `${startFormatted}${startAmPm}-${endFormatted}${endAmPm}`;
    }
    
    // Combine in format: "Feb 22nd | Sat 2-4PM" or "Feb 22nd | Sat 2:30-4:30PM"
    return `${month} ${dayWithSuffix} | ${dayOfWeek} ${timeRange}`;
    
  } catch (e) {
    console.error('Error formatting open house datetime:', e);
    return null;
  }
}

// ============= TEXT FORMATTERS =============

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
 * Combines room features from multiple fields into a comma-separated string
 * @param {*} feature1 - First feature
 * @param {*} feature2 - Second feature
 * @param {*} feature3 - Third feature
 * @returns {string|null} - Combined features as comma-separated string or null
 */
export function combineRoomFeatures(feature1, feature2, feature3) {
  const features = [
    cleanSingleValue(feature1),
    cleanSingleValue(feature2),
    cleanSingleValue(feature3)
  ].filter(Boolean);
  
  return features.length > 0 ? features.join(', ') : null;
}

// ============= LOCATION FORMATTERS =============

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

// ============= MEASUREMENT FORMATTERS =============

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
    return dim.replace(/[x×″*]/g, '×').replace(/\s+×\s+/g, ' × ');
  }
  
  // Extract dimensions
  const parts = dim.split(/\s*[x×″*]\s*/);
  
  if (parts.length === 2) {
    // Format based on units
    if (unit.toLowerCase().includes('meter')) {
      // Format metric measurements with 2 decimal places
      return `${parseFloat(parts[0]).toFixed(2)}m × ${parseFloat(parts[1]).toFixed(2)}m`;
    } else if (unit.toLowerCase().includes('feet') || unit.toLowerCase().includes('foot')) {
      // Format imperial measurements
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