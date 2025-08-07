/**
 * Map IDX and VOW feeds into the property_rooms table structure
 * Without helper functions
 */
export function mapPropertyRooms(idx = {}, vow = {}) {
  // Pull ListingID directly
  const ListingID = idx.ListingID ?? idx.ListingKey ?? null;
  const ListingKey = idx.ListingKey ?? vow.ListingKey ?? null;
  const ModificationTimestamp = idx.ModificationTimestamp ?? vow.ModificationTimestamp ?? null;
  const Order = idx.Order ?? vow.Order ?? null;

  // Value getters
  const getValue = field => (vow[field] !== undefined && vow[field] !== null)
    ? vow[field]
    : (idx[field] !== undefined ? idx[field] : null);

  // Extract first element if array, or return string
  const single = value => Array.isArray(value)
    ? (value.length ? value[0] : null)
    : (typeof value === 'string' ? value : null);

  // Ensure arrays for multi-select
  const multi = value => Array.isArray(value) ? value : null;

  return {
    ListingID,
    ListingKey,
    ModificationTimestamp,
    Order,

    RoomArea:               getValue('RoomArea'),
    RoomAreaSource:         single(getValue('RoomAreaSource')),
    RoomAreaUnits:          single(getValue('RoomAreaUnits')),

    RoomDescription:        getValue('RoomDescription'),
    RoomDimensions:         getValue('RoomDimensions'),

    RoomFeature1:           single(getValue('RoomFeature1')),
    RoomFeature2:           single(getValue('RoomFeature2')),
    RoomFeature3:           single(getValue('RoomFeature3')),
    RoomFeatures:           multi(getValue('RoomFeatures')),

    RoomKey:                getValue('RoomKey'),
    RoomLength:             getValue('RoomLength'),
    RoomLengthWidthSource:  single(getValue('RoomLengthWidthSource')),
    RoomLengthWidthUnits:   single(getValue('RoomLengthWidthUnits')),

    RoomLevel:              single(getValue('RoomLevel')),
    RoomStatus:             single(getValue('RoomStatus')),
    RoomType:               single(getValue('RoomType')),
    RoomWidth:              getValue('RoomWidth')
  };
}
