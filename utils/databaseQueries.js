/**
 * databaseQueries.js
 * 
 * Database query abstractions for common operations.
 * Focused on media-related database operations.
 */

/**
 * Find the primary virtual tour for a listing
 * @param {object} supabase - Supabase client
 * @param {string} listingKey - The ListingKey to find primary virtual tour for
 * @returns {object|null} - Primary virtual tour record or null if not found
 */
export async function findPrimaryVirtualTour(supabase, listingKey) {
  if (!listingKey) return null;
  
  // First try to find a record with VirtualTourFlagYN = true
  let { data: primaryVT, error } = await supabase
    .from('property_media')
    .select('*')
    .eq('ListingKey', listingKey)
    .eq('VirtualTourFlagYN', true)
    .order('Order', { ascending: true })
    .limit(1)
    .single();
    
  if (!error && primaryVT) {
    return primaryVT;
  }
  
  // Next, try to find a record with MediaType = 'VirtualTour'
  ({ data: primaryVT, error } = await supabase
    .from('property_media')
    .select('*')
    .eq('ListingKey', listingKey)
    .eq('MediaType', 'VirtualTour')
    .order('Order', { ascending: true })
    .limit(1)
    .single());
    
  if (!error && primaryVT) {
    return primaryVT;
  }
  
  // Finally, try to find any record with a virtual tour URL
  ({ data: primaryVT, error } = await supabase
    .from('property_media')
    .select('*')
    .eq('ListingKey', listingKey)
    .or('VirtualTourURLUnbranded.neq.null,VirtualTourURLBranded.neq.null')
    .order('Order', { ascending: true })
    .limit(1)
    .single());
    
  return primaryVT || null;
}

/**
 * Gets media responses for a listing
 * @param {object} supabase - Supabase client
 * @param {string} listingKey - The listing key
 * @param {object} options - Query options
 * @returns {object} - Media response object
 */
export async function getListingMedia(supabase, listingKey, options = {}) {
  if (!listingKey) {
    return { success: false, error: 'Listing key is required' };
  }
  
  const { 
    mediaTypes = null,
    limit = 100,
    baseUrl = '',
    includeVirtualTours = true
  } = options;
  
  // Build query with proper filters
  let query = supabase
    .from('property_media')
    .select('*')
    .eq('ListingKey', listingKey)
    .order('Order', { ascending: true });
  
  // Filter by media types if specified
  if (mediaTypes && Array.isArray(mediaTypes) && mediaTypes.length > 0) {
    query = query.in('MediaType', mediaTypes);
  }
  
  // Execute query with pagination
  const { data, error } = await query.limit(limit);
  
  if (error) {
    return { 
      success: false, 
      error: `Error retrieving media: ${error.message}`
    };
  }
  
  // Format complete response with organized data
  const response = {
    success: true,
    listingKey,
    count: data.length,
    media: data
  };

  return response;
}