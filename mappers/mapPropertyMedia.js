// mappers/mapPropertyMedia.js - Maps to property_media table

export function mapPropertyMedia(idx = {}, vow = {}) {
  const get = field => (vow[field] ?? idx[field] ?? null);

  return {
    // === PRIMARY IDENTIFIERS ===
    ListingKey:                 get('ListingKey') || get('ResourceRecordKey'), // ensure non-null
    MediaKey:                   get('MediaKey'),
    ResourceRecordKey:          get('ResourceRecordKey'),
    
    // === MEDIA DETAILS ===
    MediaURL:                   get('MediaURL'),
    MediaType:                  get('MediaType'),
    MediaCategory:              get('MediaCategory'),
    MediaStatus:                get('MediaStatus'),
    MediaObjectID:              get('MediaObjectID'),
    OriginatingSystemID:        get('OriginatingSystemID'),
    
    // === MEDIA CLASSIFICATION ===
    ClassName:                  get('ClassName'),
    ImageOf:                    get('ImageOf'),
    ImageSizeDescription:       get('ImageSizeDescription'),
    ResourceName:               get('ResourceName') || 'Property',
    
    // === MEDIA METADATA ===
    ShortDescription:           get('ShortDescription'),
    OrderNumber:                get('Order'),
    PreferredPhotoYN:           get('PreferredPhotoYN') === 'Y' || get('PreferredPhotoYN') === true,
    
    // === TIMESTAMPS ===
    MediaModificationTimestamp: get('MediaModificationTimestamp'),
    ModificationTimestamp:      get('ModificationTimestamp')
  };
}
