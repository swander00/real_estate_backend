/**
 * numericHelpers.js
 * 
 * Utilities for processing and formatting numeric values.
 */

/**
 * Formats a price value consistently
 * @param {*} price - Price value to format
 * @returns {number|null} - Formatted price or null
 */
export function formatPrice(price) {
  if (!price) return null;
  const num = parseFloat(price);
  return isNaN(num) ? null : num;
}

/**
 * Extract and validate image dimensions
 * @param {any} width - Image width
 * @param {any} height - Image height
 * @param {any} size - Image file size in bytes
 * @returns {object} - Object with validated width, height, and size
 */
export function getImageDimensions(width, height, size) {
  const cleanInt = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  
  return {
    width: cleanInt(width),
    height: cleanInt(height),
    size: cleanInt(size)
  };
}