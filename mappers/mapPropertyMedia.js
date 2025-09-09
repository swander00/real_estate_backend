// mappers/mapPropertyMedia.js - RESO-compliant Media mapper
export function mapPropertyMedia(item) {
  // Skip records without required keys
  if (!item.MediaKey) {
    return null;
  }
  
  // Use ResourceRecordKey as the primary connection to common_fields table
  if (!item.ResourceRecordKey) {
    return null;
  }
  
  return {
    // === PRIMARY KEYS & IDENTIFIERS ===
    MediaKey: item.MediaKey,
    ListingKey: item.ListingKey || item.ResourceRecordKey, // Use ResourceRecordKey as fallback to satisfy NOT NULL constraint
    ResourceRecordKey: item.ResourceRecordKey, // Primary connection to common_fields.ListingKey
    ResourceName: item.ResourceName,

    // === CORE MEDIA FIELDS ===
    MediaURL: item.MediaURL,
    MediaType: item.MediaType,
    MediaCategory: item.MediaCategory,
    MediaStatus: item.MediaStatus,

    // === DISPLAY & ORDERING ===
    Order: item.Order,

    // === DESCRIPTIONS ===
    ShortDescription: item.ShortDescription,

    // === CLASSIFICATION ===
    ClassName: item.ClassName,
    ImageOf: item.ImageOf,
    ImageSizeDescription: item.ImageSizeDescription,

    // === SYSTEM IDENTIFIERS ===
    MediaObjectID: item.MediaObjectID,
    OriginatingSystemID: item.OriginatingSystemID,

    // === TIMESTAMPS ===
    ModificationTimestamp: item.ModificationTimestamp,
    MediaModificationTimestamp: item.MediaModificationTimestamp
  };
}
