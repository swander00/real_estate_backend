/**
 * validators.js
 *
 * Validation utilities for URLs and enum values.
 */

export function validateUrl(url) {
  if (!url) return null;
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://') ? url : null;
  } catch {
    return null;
  }
}

export function validateResoEnumValue(value, validValues = []) {
  if (!value) return null;
  const v = String(value).trim();
  if (validValues.includes(v)) return v;
  const match = validValues.find(opt => opt.toLowerCase() === v.toLowerCase());
  return match || null;
}
