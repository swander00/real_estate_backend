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
  
  if (rawStartTime) {
    const startDate = new Date(rawStartTime);
    if (!isNaN(startDate.getTime())) {
      startTime = startDate.toTimeString().split(' ')[0]; // HH:MM:SS format
    }
  }
  
  if (rawEndTime) {
    const endDate = new Date(rawEndTime);
    if (!isNaN(endDate.getTime())) {
      endTime = endDate.toTimeString().split(' ')[0]; // HH:MM:SS format
    }
  }
  
  if (rawStartTime && rawEndTime) {
    const startDate = new Date(rawStartTime);
    const endDate = new Date(rawEndTime);
    
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      formattedRange = `${startDate.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      })} - ${endDate.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;
    }
  }
  
  return {
    startTime,
    endTime,
    formattedRange
  };
}