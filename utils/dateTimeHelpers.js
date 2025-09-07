/**
 * dateTimeHelpers.js
 * 
 * Utilities for handling and formatting date and timestamp values.
 * Provides consistent date handling throughout the application.
 */

/**
 * Formats a date string to ISO format
 * @param {string} dateStr - Date string to format
 * @returns {string|null} - ISO date string or null
 */
export function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toISOString();
  } catch (e) {
    return null;
  }
}

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