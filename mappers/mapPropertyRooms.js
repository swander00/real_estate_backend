// mappers/mapPropertyRooms.js

// Import only necessary helpers from the new utility files
import { cleanSingleValue, deepCleanArray } from "../utils/valueCleaners.js";
import { formatRoomMeasurements } from "../utils/measurementFormatters.js";
import { cleanTimestamp } from "../utils/dateTimeHelpers.js";
import { combineRoomFeatures } from "../utils/textFormatters.js";

export function mapPropertyRooms(idx = {}) {
  // Get current timestamp for database operations
  const now = new Date().toISOString();
  const existingCreatedAt = idx.CreatedAt ?? null;
  
  // Use combineRoomFeatures helper to handle room features
  const roomFeatures = combineRoomFeatures(
    idx.RoomFeature1, 
    idx.RoomFeature2, 
    idx.RoomFeature3
  );
  
  // Additional features from the RoomFeatures field
  let combinedFeatures = roomFeatures;
  if (idx.RoomFeatures) {
    // Clean RoomFeatures using deepCleanArray
    const additionalFeatures = deepCleanArray(idx.RoomFeatures);
    
    // Combine with the already processed features
    if (additionalFeatures) {
      if (combinedFeatures) {
        combinedFeatures = [...combinedFeatures, ...additionalFeatures];
      } else {
        combinedFeatures = additionalFeatures;
      }
    }
  }
  
  // Format combined features as string if they exist
  const formattedFeatures = combinedFeatures ? combinedFeatures.join(", ") : null;
  
  return {
    RoomKey: idx.RoomKey ?? null,
    ListingKey: idx.ListingKey ?? null,
    Order: idx.Order ?? null,
    RoomType: cleanSingleValue(idx.RoomType) ?? null,
    RoomLevel: cleanSingleValue(idx.RoomLevel) ?? null,
    RoomMeasurements: formatRoomMeasurements(
      idx.RoomDimensions,
      idx.RoomLengthWidthUnits
    ),
    RoomFeatures: formattedFeatures,
    ModificationTimestamp: cleanTimestamp(idx.ModificationTimestamp),
    SystemModificationTimestamp: cleanTimestamp(idx.SystemModificationTimestamp),
    OriginalEntryTimestamp: cleanTimestamp(idx.OriginalEntryTimestamp),
    CreatedAt: existingCreatedAt || now,
    UpdatedAt: now
  };
}

/**
 * Upserts room records into the property_rooms table.
 *
 * @param {object} supabase - Supabase client
 * @param {Array<object>} records - Raw feed records
 */
export async function upsertRooms(supabase, records) {
  const mapped = records.map((record) => mapPropertyRooms(record));

  const { data, error } = await supabase
    .from("property_rooms")
    .upsert(mapped, { onConflict: "RoomKey" });

  if (error) {
    console.error("Error upserting room records:", error);
    throw error;
  } else {
    console.log(`Upserted ${mapped.length} room records`);
  }
}