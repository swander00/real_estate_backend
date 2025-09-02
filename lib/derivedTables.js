// lib/derivedTables.js - Compute derived tables from existing data
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const BATCH_SIZE = 1000;

/**
 * Compute property_first_image table from property_media
 * This finds the first/preferred image for each listing
 * @param {string[]} listingKeys - Array of ListingKeys to process (optional, processes all if not provided)
 * @returns {Promise<number>} Number of records processed
 */
export async function computePropertyFirstImages(listingKeys = null) {
  try {
    console.log('🖼️ Computing property first images...');
    
    let processedCount = 0;
    
    if (listingKeys && listingKeys.length > 0) {
      // Process specific listings
      const batches = chunkArray(listingKeys, BATCH_SIZE);
      
      for (const batch of batches) {
        const count = await processFirstImageBatch(batch);
        processedCount += count;
      }
    } else {
      // Process all listings that have media
      processedCount = await processAllFirstImages();
    }
    
    console.log(`✅ Processed ${processedCount} property first images`);
    return processedCount;
    
  } catch (error) {
    console.error('❌ Error computing property first images:', error);
    throw error;
  }
}

/**
 * Process a batch of listings for first images
 * @param {string[]} listingKeys - Array of ListingKeys to process
 * @returns {Promise<number>} Number of records processed
 */
async function processFirstImageBatch(listingKeys) {
  if (!listingKeys || !listingKeys.length) {
    return 0;
  }
  
  try {
    // Query property_media for these listings, ordered by preference
    const { data: mediaRecords, error } = await supabase
      .from('property_media')
      .select('ListingKey, MediaURL, PreferredPhotoYN, Order, MediaType')
      .in('ListingKey', listingKeys)
      .eq('MediaType', 'Photo') // Only photos, not videos
      .not('MediaURL', 'is', null)
      .order('ListingKey')
      .order('PreferredPhotoYN', { ascending: false, nullsFirst: false }) // Preferred first
      .order('Order', { ascending: true, nullsFirst: false }) // Then by order
      .order('MediaKey', { ascending: true }); // Then by MediaKey for consistency
    
    if (error) {
      console.error('Error querying property_media:', error);
      return 0;
    }
    
    if (!mediaRecords || !mediaRecords.length) {
      return 0;
    }
    
    // Group by ListingKey and take first image for each
    const firstImages = [];
    const processedListings = new Set();
    
    for (const record of mediaRecords) {
      if (!processedListings.has(record.ListingKey)) {
        firstImages.push({
          ListingKey: record.ListingKey,
          MediaURL: record.MediaURL
        });
        processedListings.add(record.ListingKey);
      }
    }
    
    if (firstImages.length > 0) {
      // Upsert to property_first_image table
      const { error: upsertError } = await supabase
        .from('property_first_image')
        .upsert(firstImages, {
          onConflict: 'ListingKey',
          returning: 'minimal'
        });
      
      if (upsertError) {
        console.error('Error upserting first images:', upsertError);
        return 0;
      }
    }
    
    return firstImages.length;
    
  } catch (error) {
    console.error('Error processing first image batch:', error);
    return 0;
  }
}

/**
 * Process all listings for first images (used when no specific keys provided)
 * @returns {Promise<number>} Number of records processed
 */
async function processAllFirstImages() {
  try {
    // Get all distinct ListingKeys that have media
    const { data: listingData, error } = await supabase
      .from('property_media')
      .select('ListingKey')
      .eq('MediaType', 'Photo')
      .not('MediaURL', 'is', null);
    
    if (error) {
      console.error('Error getting listings with media:', error);
      return 0;
    }
    
    if (!listingData || !listingData.length) {
      return 0;
    }
    
    // Get unique listing keys
    const uniqueListings = [...new Set(listingData.map(r => r.ListingKey))];
    
    // Process in batches
    let totalProcessed = 0;
    const batches = chunkArray(uniqueListings, BATCH_SIZE);
    
    for (const batch of batches) {
      const count = await processFirstImageBatch(batch);
      totalProcessed += count;
      
      // Small delay between batches
      await sleep(100);
    }
    
    return totalProcessed;
    
  } catch (error) {
    console.error('Error processing all first images:', error);
    return 0;
  }
}

/**
 * Clean up orphaned first images (where listing no longer exists)
 * @returns {Promise<number>} Number of records cleaned up
 */
export async function cleanupOrphanedFirstImages() {
  try {
    console.log('🧹 Cleaning up orphaned first images...');
    
    // Delete first images where ListingKey doesn't exist in common_fields
    const { data, error } = await supabase
      .rpc('cleanup_orphaned_first_images');
    
    if (error) {
      console.error('Error cleaning up orphaned first images:', error);
      return 0;
    }
    
    const deletedCount = data || 0;
    console.log(`✅ Cleaned up ${deletedCount} orphaned first images`);
    return deletedCount;
    
  } catch (error) {
    // Fallback if RPC doesn't exist - do manual cleanup
    console.log('RPC not available, doing manual cleanup...');
    return await manualCleanupOrphanedFirstImages();
  }
}

/**
 * Manual cleanup of orphaned first images (fallback method)
 * @returns {Promise<number>} Number of records cleaned up
 */
async function manualCleanupOrphanedFirstImages() {
  try {
    // Get all first image ListingKeys
    const { data: firstImageKeys, error: selectError } = await supabase
      .from('property_first_image')
      .select('ListingKey');
    
    if (selectError || !firstImageKeys?.length) {
      return 0;
    }
    
    // Check which ones exist in common_fields
    const batches = chunkArray(firstImageKeys.map(r => r.ListingKey), BATCH_SIZE);
    const orphanedKeys = [];
    
    for (const batch of batches) {
      const { data: existingKeys, error } = await supabase
        .from('common_fields')
        .select('ListingKey')
        .in('ListingKey', batch);
      
      if (error) continue;
      
      const existing = new Set(existingKeys?.map(r => r.ListingKey) || []);
      const orphaned = batch.filter(key => !existing.has(key));
      orphanedKeys.push(...orphaned);
    }
    
    if (orphanedKeys.length > 0) {
      // Delete orphaned records
      const { error: deleteError } = await supabase
        .from('property_first_image')
        .delete()
        .in('ListingKey', orphanedKeys);
      
      if (deleteError) {
        console.error('Error deleting orphaned first images:', deleteError);
        return 0;
      }
    }
    
    return orphanedKeys.length;
    
  } catch (error) {
    console.error('Error in manual cleanup:', error);
    return 0;
  }
}

/**
 * Utility function to chunk an array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Size of each chunk
 * @returns {Array[]} Array of chunks
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Simple sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}