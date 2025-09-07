// mappers/mapPropertyMedia.js - RESO-compliant Media mapper
export function mapPropertyMedia(item) {
  // Skip records without required keys
  if (!item.MediaKey) {
    return null;
  }
  
  // Use ResourceRecordKey as ListingKey if ListingKey is not available
  const listingKey = item.ListingKey || item.ResourceRecordKey;
  if (!listingKey) {
    return null;
  }
  
  return {
    // === PRIMARY KEYS & IDENTIFIERS ===
    MediaKey: item.MediaKey,
    ListingKey: listingKey,                   // Link to Property table (use ResourceRecordKey as fallback)
    ResourceRecordKey: item.ResourceRecordKey,
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
