// mappers/mapPropertyMedia.js - RESO-compliant Media mapper
export function mapPropertyMedia(item) {
  return {
    // === PRIMARY KEYS & IDENTIFIERS ===
    MediaKey: item.MediaKey || null,                              // Primary key - unique media identifier
    ResourceRecordKey: item.ResourceRecordKey || null,            // Foreign key to parent resource (e.g., ListingKey)
    ResourceName: item.ResourceName || 'Property',                // Resource type (Property, Office, Member)
    
    // === CORE MEDIA FIELDS ===
    MediaURL: item.MediaURL || null,                              // Media file URL
    MediaType: item.MediaType || null,                            // Photo, Video, VirtualTour, Document, etc.
    MediaCategory: item.MediaCategory || null,                    // Interior, Exterior, etc.
    MediaStatus: item.MediaStatus || 'Active',                    // Active, Inactive, etc.
    
    // === DISPLAY & ORDERING ===
    Order: item.Order ? parseInt(item.Order) : null,              // Display order (no preferred photo constraint)
    
    // === DESCRIPTIONS ===
    ShortDescription: item.ShortDescription || null,              // Brief media description
    
    // === CLASSIFICATION ===
    ClassName: item.ClassName || null,                            // RESO class name (PascalCase)
    ImageOf: item.ImageOf || null,                                // What the image shows
    ImageSizeDescription: item.ImageSizeDescription || null,      // Small, Medium, Large, etc.
    
    // === SYSTEM IDENTIFIERS ===
    MediaObjectID: item.MediaObjectID || null,                    // External media object ID
    OriginatingSystemID: item.OriginatingSystemID || null,        // Source system identifier
    
    // === TIMESTAMPS ===
    ModificationTimestamp: item.ModificationTimestamp || null,    // Generic modification timestamp
    MediaModificationTimestamp: item.MediaModificationTimestamp || null, // Media-specific modification timestamp
    
    // === METADATA ===
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
