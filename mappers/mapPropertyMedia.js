// mappers/mapPropertyMedia.js

/**
 * Maps raw IDX and VOW media feed items into the property_media table schema.
 * Handles composite primary key (ResourceRecordKey, MediaKey) and proper timestamp formatting.
 */
export function mapPropertyMedia(idxItem = {}, vowItem = {}) {
  const get = (field) => idxItem[field] ?? vowItem[field] ?? null;

  const cleanTimestamp = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  };

  const cleanInt = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };

  const cleanBoolean = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'boolean') return v;
    const str = String(v).toLowerCase().trim();
    return str === 'true' || str === '1' || str === 'yes';
  };

  return {
    // Primary key components (both required)
    ResourceRecordKey:            get('ResourceRecordKey'),  // Links to ListingKey
    MediaKey:                     get('MediaKey'),           // Unique media identifier
    
    // Foreign key (redundant but required by your schema)
    ListingKey:                   get('ResourceRecordKey'), // Same as ResourceRecordKey
    
    // Media details
    ImageOf:                      get('ImageOf'),
    ImageSizeDescription:         get('ImageSizeDescription'),
    MediaCategory:                get('MediaCategory'),
    MediaObjectID:                get('MediaObjectID'),
    MediaStatus:                  get('MediaStatus'),
    MediaType:                    get('MediaType'),
    MediaURL:                     get('MediaURL'),
    ShortDescription:             get('ShortDescription'),
    ResourceName:                 get('ResourceName'),
    OriginatingSystemID:          get('OriginatingSystemID'),
    
    // Numeric fields
    Order:                        cleanInt(get('Order')),
    
    // Boolean fields
    PreferredPhotoYN:             cleanBoolean(get('PreferredPhotoYN')),
    
    // Timestamp fields
    MediaModificationTimestamp:   cleanTimestamp(get('MediaModificationTimestamp')),
    ModificationTimestamp:        cleanTimestamp(get('ModificationTimestamp')),
    SystemModificationTimestamp:  cleanTimestamp(get('SystemModificationTimestamp')),
    OriginalEntryTimestamp:       cleanTimestamp(get('OriginalEntryTimestamp'))
  };
}