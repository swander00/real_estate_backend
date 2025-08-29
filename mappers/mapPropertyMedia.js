// mappers/mapPropertyMedia.js
// Clean RESO-compliant mapper for property_media table - FIXED VERSION

// [1] Imports
import crypto from "crypto";
import { cleanSingleValue, cleanInt, cleanBoolean } from "../utils/valueCleaners.js";
import { cleanTimestamp } from "../utils/dateTimeHelpers.js";
import { validateResoEnumValue } from "../utils/validationHelpers.js";

// [2] Utility: stable hash for fallback keys
function stableHash(str) {
  return crypto.createHash("sha1").update(String(str)).digest("hex");
}

// [3] Enum lists (can extend later)
const VALID_MEDIA_TYPES = ["Photo", "Image", "Video", "VirtualTour", "Document", "Audio", "Panorama", "Text"];
const VALID_MEDIA_CATEGORIES = ["Agent", "Branded", "Floor Plan", "Map", "Property", "Tour", "Office", "Community", "Unbranded", "Aerial"];

// Handle TRREB's MediaType format (MIME types) and map to RESO values
function handleMediaType(value) {
  if (!value) return "Photo"; // Default
  
  // Handle MIME types
  if (value.includes('/')) {
    if (value.startsWith('image/')) return "Photo";
    if (value.startsWith('video/')) return "Video";
    if (value.includes('pdf')) return "Document";
    return "Image"; // Default for unknown MIME types
  }
  
  // Handle standard RESO values
  if (VALID_MEDIA_TYPES.includes(value)) return value;
  
  // Try case-insensitive match for RESO values
  const lowerValue = value.toLowerCase();
  for (const validValue of VALID_MEDIA_TYPES) {
    if (validValue.toLowerCase() === lowerValue) {
      return validValue;
    }
  }
  
  return "Photo"; // Default fallback
}

// Handle potential field swapping in TRREB feed
function handleMediaCategory(value) {
  // If value matches one of our VALID_MEDIA_TYPES, it's likely swapped
  if (VALID_MEDIA_TYPES.includes(value)) {
    // Map from MediaType-like value to appropriate category
    if (value === "Photo" || value === "Image") return "Property";
    return value; // Use as-is for other types
  }
  
  // Handle standard RESO values
  if (VALID_MEDIA_CATEGORIES.includes(value)) return value;
  
  // Try case-insensitive match
  if (value) {
    const lowerValue = value.toLowerCase();
    for (const validValue of VALID_MEDIA_CATEGORIES) {
      if (validValue.toLowerCase() === lowerValue) {
        return validValue;
      }
    }
  }
  
  return "Property"; // Default fallback
}

/**
 * Map raw feed item into property_media row
 *
 * @param {Object} idxItem
 * @param {Object} vowItem
 * @returns {Object}
 */
export function mapPropertyMedia(idxItem = {}, vowItem = {}) {
  const get = (field) => idxItem[field] ?? vowItem[field] ?? null;

  // [4] Raw extraction
  let mediaKey = cleanSingleValue(get("MediaKey"));
  let rrk = cleanSingleValue(get("ResourceRecordKey"));
  let mediaUrl = cleanSingleValue(get("MediaURL"));
  
  // CRITICAL: Extract ListingKey properly
  // The API might provide it directly, or we need to derive it from ResourceRecordKey
  let listingKey = cleanSingleValue(get("ListingKey"));
  
  // [5] Fallback fabrication for keys
  
  // If no ResourceRecordKey but we have MediaURL, fabricate one
  if (!rrk && mediaUrl) {
    // This is a last resort - ideally RRK should come from the API
    rrk = `rrk_${stableHash(mediaUrl)}`;
  }
  
  // If no MediaKey, fabricate one from RRK and URL
  if (!mediaKey && rrk && mediaUrl) {
    mediaKey = `mk_${stableHash(rrk + "|" + mediaUrl)}`;
  }
  
  // CRITICAL FIX: Proper ListingKey derivation
  // ListingKey is what connects to common_fields parent table
  if (!listingKey && rrk) {
    // ResourceRecordKey typically contains the ListingKey
    // It might be in formats like:
    // - "W5429831" (direct match)
    // - "W5429831:1" (with suffix that needs removal)
    // - "Property:W5429831" (with prefix that needs removal)
    
    listingKey = rrk;
    
    // Remove common prefixes if present
    if (rrk.includes(':')) {
      const parts = rrk.split(':');
      // If first part looks like a type identifier, use second part
      if (parts[0].toLowerCase() === 'property' || parts[0].toLowerCase() === 'listing') {
        listingKey = parts[1] || rrk;
      } else {
        // Otherwise assume the listing key is the first part
        listingKey = parts[0];
      }
    }
    
    // Clean any remaining whitespace
    listingKey = listingKey.trim();
  }
  
  // Process MediaType and MediaCategory with our specialized handlers
  const rawMediaType = cleanSingleValue(get("MediaType"));
  const rawMediaCategory = cleanSingleValue(get("MediaCategory"));
  
  // Apply our specialized handlers for the TRREB feed format
  let mediaType = handleMediaType(rawMediaType);
  let mediaCategory = handleMediaCategory(rawMediaCategory);

  // [6] Return mapped object aligned to DB schema
  return {
    MediaKey: mediaKey,                                // PK (can be fabricated)
    ResourceRecordKey: rrk,                            // Media identifier 
    ListingKey: listingKey,                            // CRITICAL: Foreign key to common_fields
    ResourceName: cleanSingleValue(get("ResourceName")) ?? "Property",
    ClassName: cleanSingleValue(get("ClassName")) ?? "Unknown",

    MediaURL: mediaUrl,                                // NOT NULL
    ImageOf: cleanSingleValue(get("ImageOf")),
    ImageSizeDescription: cleanSingleValue(get("ImageSizeDescription")),
    MediaCategory: mediaCategory,                      // Using our specialized handler
    MediaType: mediaType,                              // Using our specialized handler
    MediaObjectID: cleanSingleValue(get("MediaObjectID")),
    MediaStatus: cleanSingleValue(get("MediaStatus")),
    ShortDescription: cleanSingleValue(get("ShortDescription")),
    Order: cleanInt(get("Order")),
    PreferredPhotoYN: cleanBoolean(get("PreferredPhotoYN")),
    OriginatingSystemID: cleanSingleValue(get("OriginatingSystemID")),

    MediaModificationTimestamp: cleanTimestamp(get("MediaModificationTimestamp")),
    ModificationTimestamp: cleanTimestamp(get("ModificationTimestamp")),
  };
}

/**
 * Upsert function for Supabase
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Array<Object>} records
 */
export async function upsertPropertyMedia(supabase, records) {
  // [7] Map
  const mapped = records.map((r) => mapPropertyMedia(r, {}));

  // [8] Validate required fields for DB (NOT NULL constraints)
  // UPDATED: Ensure ListingKey is present for parent relationship
  const valid = mapped.filter(
    (m) => m.MediaKey && m.ResourceRecordKey && m.ListingKey && m.ResourceName && m.ClassName && m.MediaURL
  );

  if (valid.length === 0) {
    console.warn("[property_media] No valid media rows to upsert.");
    return { success: true, count: 0 };
  }

  // Debug: Log sample of ListingKeys to verify format
  if (valid.length > 0) {
    console.log("[property_media] Sample ListingKeys:", valid.slice(0, 3).map(v => v.ListingKey));
  }

  // [9] Batch UPSERT
  let successCount = 0;
  const BATCH_SIZE = 500;

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const chunk = valid.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from("property_media")
      .upsert(chunk, {
        onConflict: "ResourceRecordKey,MediaURL", // Match with syncListingsIdx.js
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`[property_media] Upsert failed: ${error.message}`);
      throw error;
    }
    successCount += chunk.length;
  }

  return { success: true, count: successCount };
}