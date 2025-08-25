// mappers/mapPropertyMedia.js

/**
 * Maps raw IDX and VOW media feed items into the property_media table schema.
 * Aligned with the actual database schema structure and constraints.
 */
export function mapPropertyMedia(idxItem = {}, vowItem = {}) {
  const get = (field) => idxItem[field] ?? vowItem[field] ?? null;

  /**
   * Safely converts timestamp values to proper format
   * @param {any} v - Timestamp value to clean
   * @returns {string|null} - ISO timestamp string or null
   */
  const cleanTimestamp = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  };

  /**
   * Safely converts values to integers
   * @param {any} v - Value to convert to integer
   * @returns {number|null} - Integer or null
   */
  const cleanInt = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };

  /**
   * Safely converts values to boolean
   * @param {any} v - Value to convert to boolean
   * @returns {boolean|null} - Boolean or null
   */
  const cleanBoolean = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'boolean') return v;
    const str = String(v).toLowerCase().trim();
    return str === 'true' || str === '1' || str === 'yes';
  };

  return {
    // Primary key - MediaKey is the single primary key (not composite)
    MediaKey:                     get('MediaKey'),           // Primary key
    
    // Required fields based on schema constraints
    ResourceRecordKey:            get('ResourceRecordKey'),  // Required, part of unique constraint
    MediaURL:                     get('MediaURL'),           // Required, part of unique constraint
    
    // Foreign key relationships
    ListingKey:                   get('ListingKey') || get('ResourceRecordKey'), // FK to common_fields
    ResourceRecordID:             get('ResourceRecordID'),   // Human-readable identifier per RESO standard
    
    // Schema field that was missing from mapper
    ClassName:                    get('ClassName'),          // Present in schema, missing in mapper
    
    // Media classification and metadata
    ResourceName:                 get('ResourceName'),
    MediaType:                    get('MediaType'),
    MediaCategory:                get('MediaCategory'),
    MediaStatus:                  get('MediaStatus'),
    MediaObjectID:                get('MediaObjectID'),
    
    // Image-specific fields
    ImageOf:                      get('ImageOf'),
    ImageSizeDescription:         get('ImageSizeDescription'),
    ShortDescription:             get('ShortDescription'),
    
    // Ordering and preferences
    Order:                        cleanInt(get('Order')),    // Integer field
    PreferredPhotoYN:             cleanBoolean(get('PreferredPhotoYN')), // Boolean field
    
    // System identification
    OriginatingSystemID:          get('OriginatingSystemID'),
    
    // Timestamps - all are timestamp without time zone
    MediaModificationTimestamp:   cleanTimestamp(get('MediaModificationTimestamp')),
    ModificationTimestamp:        cleanTimestamp(get('ModificationTimestamp')),
    SystemModificationTimestamp:  cleanTimestamp(get('SystemModificationTimestamp')),
    OriginalEntryTimestamp:       cleanTimestamp(get('OriginalEntryTimestamp')),
    
    // Database managed timestamps (explicitly set to ensure trigger compatibility)
    UpdatedAt:                    cleanTimestamp(new Date()), // Current timestamp for updates
    
    // Note: CreatedAt and UpdatedAt are handled automatically by database defaults and triggers
    // They should not be included in the mapper as they're managed by PostgreSQL
  };
}