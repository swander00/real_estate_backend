// lib/mapMedia.js
const logger = require('../utils/logger');

function mapMedia(raw) {
  try {
    return {
      // Composite key fields
      ResourceRecordKey: raw.ResourceRecordKey,
      MediaKey: raw.MediaKey,

      // Media attributes
      MediaObjectID: raw.MediaObjectID,
      MediaURL: raw.MediaURL,
      MediaCategory: raw.MediaCategory,
      MediaType: raw.MediaType,
      MediaStatus: raw.MediaStatus,
      ImageOf: raw.ImageOf,
      ClassName: raw.ClassName,
      ImageSizeDescription: raw.ImageSizeDescription,
      Order: safeInt(raw.Order),
      PreferredPhotoYN: safeBool(raw.PreferredPhotoYN),
      ShortDescription: raw.ShortDescription,
      ResourceName: raw.ResourceName,
      OriginatingSystemID: raw.OriginatingSystemID,

      // Timestamps
      MediaModificationTimestamp: safeDate(raw.MediaModificationTimestamp),
      ModificationTimestamp: safeDate(raw.ModificationTimestamp),

      // Sync metadata
      CreatedAt: raw.CreatedAt || new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error mapping media:', {
      ResourceRecordKey: raw?.ResourceRecordKey,
      MediaKey: raw?.MediaKey,
      error: error.message
    });
    throw error;
  }
}

// Helper utilities
function safeInt(value) {
  return value !== null && value !== undefined ? parseInt(value, 10) : null;
}

function safeBool(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true' || value === 'Y';
}

function safeDate(value) {
  return value ? new Date(value).toISOString() : null;
}

function validateMedia(media) {
  const requiredFields = ['ResourceRecordKey', 'MediaKey', 'MediaURL'];
  const missing = requiredFields.filter((f) => !media[f]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  return true;
}

module.exports = {
  mapMedia,
  validateMedia
};
