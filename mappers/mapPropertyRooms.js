// mappers/mapPropertyRooms_clean.js - Clean PropertyRooms mapper with PascalCase

import { cleanSingleValue } from "../utils/dataCleaners.js";
import { cleanTimestamp, combineRoomFeatures, buildLotSize } from "../utils/formatters.js";

export function mapPropertyRooms(item) {
  // Skip records without required keys
  if (!item.RoomKey) {
    return null;
  }
  
  if (!item.ListingKey) {
    return null;
  }

  // Get current timestamp
  const now = new Date().toISOString();

  return {
    // === PRIMARY IDENTIFIERS ===
    ListingID: cleanSingleValue(item.ListingID) || null,
    ListingKey: item.ListingKey,
    RoomKey: item.RoomKey,

    // === TIMESTAMPS ===
    ModificationTimestamp: cleanTimestamp(item.ModificationTimestamp),
    CreatedAt: now,
    UpdatedAt: now,

    // === ROOM ORDERING ===
    Order: item.Order || null,

    // === ROOM AREA & DIMENSIONS ===
    RoomDescription: cleanSingleValue(item.RoomDescription) || null,
    RoomLength: cleanSingleValue(item.RoomLength) || null,
    RoomLengthWidthUnits: cleanSingleValue(item.RoomLengthWidthUnits) || null,
    RoomWidth: cleanSingleValue(item.RoomWidth) || null,
    RoomDimensions: buildLotSize(item.RoomLength, item.RoomWidth, item.RoomLengthWidthUnits),

    // === ROOM FEATURES ===
    RoomFeature1: cleanSingleValue(item.RoomFeature1) || null,
    RoomFeature2: cleanSingleValue(item.RoomFeature2) || null,
    RoomFeature3: cleanSingleValue(item.RoomFeature3) || null,
    RoomFeatures: combineRoomFeatures(item.RoomFeature1, item.RoomFeature2, item.RoomFeature3),

    // === ROOM CLASSIFICATION ===
    RoomLevel: cleanSingleValue(item.RoomLevel) || null,
    RoomType: cleanSingleValue(item.RoomType) || null
  };
}