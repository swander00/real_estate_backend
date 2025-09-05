// mappers/mapPropertyRooms.js - Maps to property_rooms table

export function mapPropertyRooms(item) {
  return {
    // === PRIMARY IDENTIFIERS ===
    RoomKey:                   item.RoomKey,       // Primary key for room record
    ListingKey:                item.ListingKey,    // FK to common_fields
    
    // === ROOM DETAILS ===
    RoomType:                  item.RoomType,
    RoomLevel:                 item.RoomLevel,
    RoomDescription:           item.RoomDescription,
    RoomDimensions:            item.RoomDimensions,
    RoomLengthWidthUnits:      item.RoomLengthWidthUnits,
    RoomFeatures:              item.RoomFeatures,
    RoomFeature1:              item.RoomFeature1,
    RoomFeature2:              item.RoomFeature2,
    RoomFeature3:              item.RoomFeature3,
    
    // === ROOM MEASUREMENTS ===
    RoomArea:                  item.RoomArea,
    RoomAreaSource:            item.RoomAreaSource,
    RoomAreaUnits:             item.RoomAreaUnits,
    RoomLength:                item.RoomLength,
    RoomWidth:                 item.RoomWidth,
    RoomHeight:                item.RoomHeight,
    
    // === ROOM ORDERING ===
    Order:                     item.Order || 0,  // Default to 0 if no order specified
    
    // === TIMESTAMPS ===
    ModificationTimestamp:     item.ModificationTimestamp
  };
}
