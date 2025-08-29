// mappers/mapPropertyMedia.js
// Clean RESO-compliant mapper for property_media table

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

// More lenient enum validation that handles case-insensitivity
function lenientValidateEnum(value, validValues) {
  if (!value) return null;
  
  // Try direct match
  if (validValues.includes(value)) return value;
  
  // Try case-insensitive match
  const lowerValue = value.toLowerCase();
  for (const validValue of validValues) {
    if (validValue.toLowerCase() === lowerValue) {
      return validValue; // Return properly cased valid value
    }
  }
  
  return null;
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
  
  // Extract ListingKey - CRITICAL addition
  let listingKey = cleanSingleValue(get("ListingKey"));
  
  // Log raw field values for debugging
  const rawMediaType = get("MediaType");
  const rawMediaCategory = get("MediaCategory");
  
  // [5] Fallback fabrication for keys
  if (!rrk && mediaUrl) {
    rrk = `rrk_${stableHash(mediaUrl)}`;
  }
  if (!mediaKey && rrk && mediaUrl) {
    mediaKey = `mk_${stableHash(rrk + "|" + mediaUrl)}`;
  }
  
  // If ListingKey is missing, use ResourceRecordKey directly
  if (!listingKey && rrk) {
    // Use ResourceRecordKey as-is without any transformation of prefixes
    listingKey = rrk;
    
    // If ResourceRecordKey contains a colon, extract just the first part
    if (rrk.includes(':')) {
      listingKey = rrk.split(':')[0];
    }
    // No logging to keep output clean
  }
  
  // Infer MediaType from URL if not provided
  let mediaType = lenientValidateEnum(cleanSingleValue(rawMediaType), VALID_MEDIA_TYPES);
  if (!mediaType && mediaUrl) {
    // Try to guess from URL extension
    const urlLower = mediaUrl.toLowerCase();
    if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg') || 
        urlLower.endsWith('.png') || urlLower.endsWith('.gif') || 
        urlLower.endsWith('.webp')) {
      mediaType = "Photo";
    } else if (urlLower.endsWith('.mp4') || urlLower.endsWith('.avi') || 
               urlLower.endsWith('.mov') || urlLower.includes('youtube.com') || 
               urlLower.includes('vimeo.com')) {
      mediaType = "Video";
    } else if (urlLower.includes('tour') || urlLower.includes('360') || 
               urlLower.includes('virtual')) {
      mediaType = "VirtualTour";
    } else if (urlLower.endsWith('.pdf') || urlLower.endsWith('.doc') || 
               urlLower.endsWith('.docx')) {
      mediaType = "Document";
    } else {
      mediaType = "Image"; // Default to Image if we can't determine
    }
  }
  
  // Set default MediaCategory if not provided
  let mediaCategory = lenientValidateEnum(cleanSingleValue(rawMediaCategory), VALID_MEDIA_CATEGORIES);
  if (!mediaCategory) {
    mediaCategory = "Property"; // Default to Property
  }

  // [6] Return mapped object aligned to DB schema
  return {
    MediaKey: mediaKey,                                // PK
    ResourceRecordKey: rrk,                            // Media identifier 
    ListingKey: listingKey,                            // CRITICAL: Parent key
    ResourceName: cleanSingleValue(get("ResourceName")) ?? "Property",
    ClassName: cleanSingleValue(get("ClassName")) ?? "Unknown",

    MediaURL: mediaUrl,                                // NOT NULL
    ImageOf: cleanSingleValue(get("ImageOf")),
    ImageSizeDescription: cleanSingleValue(get("ImageSizeDescription")),
    MediaCategory: mediaCategory,                      // Using our improved validation/fallback
    MediaType: mediaType,                              // Using our improved validation/fallback
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
  const valid = mapped.filter(
    (m) => m.MediaKey && m.ResourceRecordKey && m.ListingKey && m.ResourceName && m.ClassName && m.MediaURL
  );

  if (valid.length === 0) {
    console.warn("[property_media] No valid media rows to upsert.");
    return { success: true, count: 0 };
  }

  // [9] Batch UPSERT
  let successCount = 0;
  const BATCH_SIZE = 500;

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const chunk = valid.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from("property_media")
      .upsert(chunk, {
        onConflict: "ResourceRecordKey,MediaURL", // [10] Match with syncListingsIdx.js
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