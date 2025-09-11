// mappers/mapPropertyMediaNew.js - RESO-compliant Media mapper with all required fields
export function mapPropertyMedia(item) {
  // Skip records without required keys
  if (!item.MediaKey) {
    return null;
  }
  
  // Use ResourceRecordKey as the primary connection to common_fields table
  if (!item.ResourceRecordKey) {
    return null;
  }
  
  // Note: ResourceName filtering is now handled at API level for better performance
  
  return {
    // === PRIMARY KEYS & IDENTIFIERS ===
    "ResourceRecordKey": item.ResourceRecordKey, // Primary connection to common_fields.ListingKey
    "MediaKey": item.MediaKey,                   // Unique media record key
    "MediaObjectID": item.MediaObjectID,         // Groups size variants of the same image

    // === CORE MEDIA FIELDS ===
    "MediaURL": item.MediaURL,                   // Direct URL to the media file
    "MediaType": item.MediaType,                 // File type or MIME type (e.g. "jpeg", "png")
    "MediaCategory": item.MediaCategory,         // Category (e.g. "Photo", "Video", "Floor Plan")
    "MediaStatus": item.MediaStatus,             // Status ("Active" or "Inactive")

    // === DISPLAY & ORDERING ===
    "Order": item.Order,                         // Display order (0 = first photo)
    "PreferredPhotoYN": item.PreferredPhotoYN,   // Boolean flag for preferred photo

    // === ACCESS CONTROL (CRITICAL FOR TRREB COMPLIANCE) ===
    "Permission": item.Permission,               // Array of permission flags (e.g. ["Public"], ["Private"])

    // === DESCRIPTIONS ===
    "ShortDescription": item.ShortDescription,   // Short description of the media

    // === CLASSIFICATION ===
    "ClassName": item.ClassName,                 // Class name (e.g. "ResidentialFree")
    "ImageOf": item.ImageOf,                     // What the image shows
    "ImageSizeDescription": item.ImageSizeDescription, // Size description (e.g. "Largest", "Thumbnail")

    // === SYSTEM IDENTIFIERS ===
    "ResourceName": item.ResourceName,           // Resource type (e.g. "Property", "Member", "Office")
    "OriginatingSystemID": item.OriginatingSystemID, // Originating system identifier

    // === TIMESTAMPS ===
    "ModificationTimestamp": item.ModificationTimestamp,           // Last time any field was modified
    "MediaModificationTimestamp": item.MediaModificationTimestamp  // Last time media content was modified
  };
}
