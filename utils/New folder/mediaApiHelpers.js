// utils/mediaApiHelpers.js

/**
 * Formats the primary photo URL for API responses
 * 
 * @param {object} mediaRecord - The media record from the database
 * @param {object} config - Configuration options
 * @returns {object} - Formatted media response
 */
export function formatMediaForApi(mediaRecord, config = {}) {
  if (!mediaRecord) return null;
  
  const { baseUrl = '', includeMetadata = true } = config;
  
  // Base media object
  const mediaObj = {
    id: mediaRecord.MediaKey,
    url: mediaRecord.MediaURL,
    thumbnailUrl: mediaRecord.ThumbnailURL || 
                  `${baseUrl}/media/${mediaRecord.MediaKey}/thumbnail`,
    type: mediaRecord.MediaType,
    category: mediaRecord.MediaCategory,
    order: mediaRecord.Order
  };
  
  // Add image-specific properties if this is an image
  if (mediaRecord.MediaType === 'Image') {
    mediaObj.isPrimary = !!mediaRecord.PrimaryPhotoYN;
    mediaObj.isPreferred = !!mediaRecord.PreferredPhotoYN;
    
    if (includeMetadata) {
      mediaObj.metadata = {
        width: mediaRecord.ImageWidth,
        height: mediaRecord.ImageHeight,
        size: mediaRecord.ImageSize,
        description: mediaRecord.ShortDescription
      };
    }
  }
  
  // Add virtual tour properties if this is a virtual tour
  if (mediaRecord.MediaType === 'VirtualTour' || mediaRecord.VirtualTourURL) {
    mediaObj.virtualTourUrl = mediaRecord.VirtualTourURL || mediaRecord.MediaURL;
    mediaObj.virtualTourType = mediaRecord.VirtualTourType;
  }
  
  return mediaObj;
}

/**
 * Gets media responses for a listing
 * 
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
  
  // Build query
  let query = supabase
    .from('property_media')
    .select('*')
    .eq('ListingKey', listingKey)
    .order('Order', { ascending: true });
  
  // Filter by media types if specified
  if (mediaTypes && Array.isArray(mediaTypes) && mediaTypes.length > 0) {
    query = query.in('MediaType', mediaTypes);
  }
  
  // Execute query
  const { data, error } = await query.limit(limit);
  
  if (error) {
    return { 
      success: false, 
      error: `Error retrieving media: ${error.message}`
    };
  }
  
  // Find primary photo
  const primaryPhoto = data.find(m => 
    m.MediaType === 'Image' && m.PrimaryPhotoYN === true
  ) || data.find(m => 
    m.MediaType === 'Image' && m.PreferredPhotoYN === true
  ) || data.find(m => 
    m.MediaType === 'Image'
  );
  
  // Find virtual tours
  const virtualTours = includeVirtualTours ? 
    data.filter(m => m.MediaType === 'VirtualTour' || m.VirtualTourURL) : [];
  
  // Format response
  return {
    success: true,
    listingKey,
    primaryPhoto: primaryPhoto ? formatMediaForApi(primaryPhoto, { baseUrl }) : null,
    virtualTours: virtualTours.map(vt => formatMediaForApi(vt, { baseUrl })),
    media: data.map(m => formatMediaForApi(m, { baseUrl })),
    count: data.length
  };
}