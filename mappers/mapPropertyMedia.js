// mappers/mapPropertyMedia.js

/**
 * Maps raw IDX and VOW media feed items into the property_media table schema.
 * Ensures SystemModificationTimestamp is included and ResourceRecordKey is used
 * as the unique link to the related listing.
 */
export function mapPropertyMedia(idxItem = {}, vowItem = {}) {
  const get = (field) => idxItem[field] ?? vowItem[field] ?? null;

  return {
    ImageOf:                     get('ImageOf'),
    ImageSizeDescription:        get('ImageSizeDescription'),
    MediaCategory:               get('MediaCategory'),
    MediaKey:                     get('MediaKey'),
    MediaModificationTimestamp:   get('MediaModificationTimestamp'),
    MediaObjectID:                get('MediaObjectID'),
    MediaStatus:                  get('MediaStatus'),
    MediaType:                    get('MediaType'),
    MediaURL:                     get('MediaURL'),
    ModificationTimestamp:        get('ModificationTimestamp'),
    SystemModificationTimestamp:  get('SystemModificationTimestamp'),
    Order:                        get('Order'),
    OriginatingSystemID:          get('OriginatingSystemID'),
    PreferredPhotoYN:             get('PreferredPhotoYN'),
    ResourceName:                 get('ResourceName'),
    ResourceRecordKey:            get('ResourceRecordKey'), // Must match DB unique constraint
    ShortDescription:             get('ShortDescription')
  };
}

/**
 * Upserts media records into the property_media table.
 * 
 * @param {object} supabase - Supabase client
 * @param {Array<object>} records - Raw feed records
 */
export async function upsertMedia(supabase, records) {
  const mapped = records.map(record => mapPropertyMedia(record, {}));

  const { data, error } = await supabase
    .from('property_media') // <-- replace with your actual media table name if different
    .upsert(mapped, { onConflict: 'ResourceRecordKey' });

  if (error) {
    console.error('❌ Error upserting media:', error);
    throw error;
  } else {
    console.log(`✅ Upserted ${mapped.length} media records`);
  }
}
