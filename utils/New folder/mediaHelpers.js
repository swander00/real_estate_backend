// utils/mediaHelpers.js

// 1. THUMBNAIL GENERATION FUNCTIONS
/**
 * Generates a thumbnail URL from a full image URL
 * 
 * @param {string} imageUrl - The full size image URL
 * @param {object} options - Thumbnail options
 * @returns {string|null} - Thumbnail URL or null
 */
export function generateThumbnailUrl(imageUrl, options = {}) {
  if (!imageUrl) return null;
  
  const { width = 300, height = 0 } = options;
  
  try {
    const url = new URL(imageUrl);
    
    // 1.1. Handle different CDN patterns for thumbnail generation
    if (imageUrl.includes('cloudinary.com')) {
      // 1.1.1. For Cloudinary, add thumbnail transformation
      const parts = url.pathname.split('/');
      // Insert thumbnail transformation before file name
      const transformIndex = parts.findIndex(part => part === 'upload') + 1;
      if (transformIndex > 0) {
        parts.splice(transformIndex, 0, `c_thumb,w_${width}${height ? `,h_${height}` : ''},g_auto`);
        url.pathname = parts.join('/');
        return url.toString();
      }
    } else if (imageUrl.includes('googleapis.com') && imageUrl.includes('storage')) {
      // 1.1.2. For Google Cloud Storage, add resizing parameter
      url.searchParams.set('sz', width.toString());
      return url.toString();
    } else if (imageUrl.includes('amazonaws.com') && imageUrl.includes('s3')) {
      // 1.1.3. For AWS S3, depends on if using CloudFront with Lambda@Edge or similar
      url.searchParams.set('width', width.toString());
      if (height) url.searchParams.set('height', height.toString());
      return url.toString();
    } else {
      // 1.1.4. For general URLs, add a thumbnail indicator
      const urlObj = new URL(imageUrl);
      urlObj.searchParams.set('thumbnail', 'true');
      urlObj.searchParams.set('width', width.toString());
      if (height) urlObj.searchParams.set('height', height.toString());
      return urlObj.toString();
    }
  } catch (e) {
    // 1.2. If URL parsing fails, just return null
    return null;
  }
}

// 2. DATA VALIDATION FUNCTIONS
/**
 * Extract and validate image dimensions
 * 
 * @param {any} width - Image width
 * @param {any} height - Image height
 * @param {any} size - Image file size in bytes
 * @returns {object} - Object with validated width, height, and size
 */
export function getImageDimensions(width, height, size) {
  const cleanInt = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  
  return {
    width: cleanInt(width),
    height: cleanInt(height),
    size: cleanInt(size)
  };
}

/**
 * Validates a value against a list of RESO standard enum values
 * 
 * @param {string} value - The value to validate
 * @param {Array<string>} validValues - List of valid values
 * @returns {string|null} - Valid value or null
 */
export function validateResoEnumValue(value, validValues) {
  if (!value) return null;
  if (!validValues || !Array.isArray(validValues)) return value;
  
  const cleanValue = String(value).trim();
  
  // 2.1. If the value is in the valid list, return it
  if (validValues.includes(cleanValue)) {
    return cleanValue;
  }
  
  // 2.2. Try case-insensitive match as a fallback
  const lowerValue = cleanValue.toLowerCase();
  const match = validValues.find(v => v.toLowerCase() === lowerValue);
  
  return match || cleanValue; // Return match if found, otherwise return original value
}

/**
 * Validates a URL according to RESO standards
 * 
 * @param {string} url - The URL to validate
 * @returns {string|null} - Valid URL or null
 */
export function validateUrl(url) {
  if (!url) return null;
  
  try {
    // Basic URL validation
    new URL(url);
    
    // Check for RESO requirements (https or http)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return null;
    }
    
    return url;
  } catch (e) {
    return null;
  }
}

// 3. DATABASE QUERY FUNCTIONS
/**
 * Find the primary photo for a listing to use as a thumbnail
 * 
 * @param {object} supabase - Supabase client
 * @param {string} listingKey - The ListingKey to find primary photo for
 * @returns {object|null} - Primary photo record or null if not found
 */
export async function findPrimaryPhoto(supabase, listingKey) {
  if (!listingKey) return null;
  
  // 3.1. First try to find an explicitly marked primary photo
  let { data: primaryPhoto, error } = await supabase
    .from('property_media')
    .select('*')
    .eq('ListingKey', listingKey)
    .eq('PrimaryPhotoYN', true)
    .eq('MediaType', 'Image')
    .limit(1)
    .single();
    
  if (!error && primaryPhoto) {
    return primaryPhoto;
  }
  
  // 3.2. If no primary photo found, try preferred photo
  ({ data: primaryPhoto, error } = await supabase
    .from('property_media')
    .select('*')
    .eq('ListingKey', listingKey)
    .eq('PreferredPhotoYN', true)
    .eq('MediaType', 'Image')
    .limit(1)
    .single());
    
  if (!error && primaryPhoto) {
    return primaryPhoto;
  }
  
  // 3.3. If still not found, try photos with ImageOf = 'PrimaryPhoto'
  ({ data: primaryPhoto, error } = await supabase
    .from('property_media')
    .select('*')
    .eq('ListingKey', listingKey)
    .eq('ImageOf', 'PrimaryPhoto')
    .eq('MediaType', 'Image')
    .limit(1)
    .single());
    
  if (!error && primaryPhoto) {
    return primaryPhoto;
  }
  
  // 3.4. If still not found, try the first photo by order
  ({ data: primaryPhoto, error } = await supabase
    .from('property_media')
    .select('*')
    .eq('ListingKey', listingKey)
    .eq('MediaType', 'Image')
    .order('Order', { ascending: true })
    .limit(1)
    .single());
    
  return primaryPhoto || null;
}

/**
 * Find all virtual tours for a listing
 * 
 * @param {object} supabase - Supabase client
 * @param {string} listingKey - The ListingKey to find virtual tours for
 * @returns {Array<object>} - Array of virtual tour records
 */
export async function findVirtualTours(supabase, listingKey) {
  if (!listingKey) return [];
  
  // 3.5. Find all virtual tours for this listing using expanded fields
  const { data, error } = await supabase
    .from('property_media')
    .select('*')
    .eq('ListingKey', listingKey)
    .or(`MediaType.eq.VirtualTour,VirtualTourFlagYN.eq.true,VirtualTourURLBranded.neq.null,VirtualTourURLUnbranded.neq.null`)
    .order('Order', { ascending: true });
    
  if (error || !data) {
    console.error('Error finding virtual tours:', error);
    return [];
  }
  
  return data;
}

/**
 * Find the primary virtual tour for a listing
 * 
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

// 4. API RESPONSE FORMATTING FUNCTIONS
/**
 * Format media record for API response
 * 
 * @param {object} mediaRecord - The media record
 * @param {object} options - Formatting options
 * @returns {object} - Formatted media object for API
 */
export function formatMediaForApi(mediaRecord, options = {}) {
  if (!mediaRecord) return null;
  
  const { baseUrl = '', includeMetadata = true, highQuality = false } = options;
  
  // 4.1. Base media object with common properties
  const mediaObj = {
    id: mediaRecord.MediaKey,
    url: mediaRecord.MediaURL,
    type: mediaRecord.MediaType,
    category: mediaRecord.MediaCategory,
    order: mediaRecord.Order,
    description: mediaRecord.ShortDescription
  };
  
  // 4.2. Add thumbnail URL - use existing or generate based on baseUrl
  if (mediaRecord.ThumbnailURL) {
    mediaObj.thumbnailUrl = mediaRecord.ThumbnailURL;
  } else if (baseUrl) {
    mediaObj.thumbnailUrl = `${baseUrl}/media/${mediaRecord.MediaKey}/thumbnail${highQuality ? '?quality=high' : ''}`;
  }
  
  // 4.3. Add image-specific properties
  if (mediaRecord.MediaType === 'Image') {
    mediaObj.isPrimary = !!mediaRecord.PrimaryPhotoYN;
    mediaObj.isPreferred = !!mediaRecord.PreferredPhotoYN;
    mediaObj.imageOf = mediaRecord.ImageOf;
  }
  
  // 4.4. Add virtual tour properties with expanded fields support
  const hasVirtualTour = mediaRecord.MediaType === 'VirtualTour' || 
                         mediaRecord.VirtualTourFlagYN === true ||
                         mediaRecord.VirtualTourURLBranded || 
                         mediaRecord.VirtualTourURLBranded2 ||
                         mediaRecord.VirtualTourURLUnbranded ||
                         mediaRecord.VirtualTourURLUnbranded2;
                         
  if (hasVirtualTour) {
    mediaObj.virtualTour = {
      type: mediaRecord.VirtualTourType || 'Standard',
      branded: {
        url: mediaRecord.VirtualTourURLBranded,
        url2: mediaRecord.VirtualTourURLBranded2
      },
      unbranded: {
        url: mediaRecord.VirtualTourURLUnbranded,
        url2: mediaRecord.VirtualTourURLUnbranded2
      }
    };
    
    // For backward compatibility
    mediaObj.virtualTourUrl = mediaRecord.VirtualTourURLUnbranded || 
                             mediaRecord.VirtualTourURLBranded || 
                             (mediaRecord.MediaType === 'VirtualTour' ? mediaRecord.MediaURL : null);
    mediaObj.virtualTourType = mediaRecord.VirtualTourType;
  }
  
  return mediaObj;
}

/**
 * Get a RESO-compliant media URL for the TRREB RESTful API
 * 
 * @param {string} baseUrl - Base API URL
 * @param {string} mediaKey - The MediaKey
 * @param {string} size - Size specification (optional)
 * @returns {string} - RESO Web API compliant URL
 */
export function getResoMediaUrl(baseUrl, mediaKey, size = 'full') {
  if (!baseUrl || !mediaKey) return null;
  
  // 4.5. Format follows RESO Web API RESTful standard
  return `${baseUrl}/Media/${mediaKey}?size=${size}`;
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
  
  // 4.6. Build query with proper filters
  let query = supabase
    .from('property_media')
    .select('*')
    .eq('ListingKey', listingKey)
    .order('Order', { ascending: true });
  
  // 4.7. Filter by media types if specified
  if (mediaTypes && Array.isArray(mediaTypes) && mediaTypes.length > 0) {
    query = query.in('MediaType', mediaTypes);
  }
  
  // 4.8. Execute query with pagination
  const { data, error } = await query.limit(limit);
  
  if (error) {
    return { 
      success: false, 
      error: `Error retrieving media: ${error.message}`
    };
  }
  
  // 4.9. Find primary photo using multiple criteria in priority order
  const primaryPhoto = data.find(m => 
    m.MediaType === 'Image' && m.PrimaryPhotoYN === true
  ) || data.find(m => 
    m.MediaType === 'Image' && m.PreferredPhotoYN === true
  ) || data.find(m => 
    m.MediaType === 'Image' && m.ImageOf === 'PrimaryPhoto'
  ) || data.find(m => 
    m.MediaType === 'Image' && (m.Order === 0 || m.Order === 1)
  ) || data.find(m => 
    m.MediaType === 'Image'
  );
  
  // 4.10. Find virtual tours if requested, with type detection
  const virtualTours = includeVirtualTours ? 
    data.filter(m => {
      // Include both explicit virtual tours and media with any virtual tour URL
      return m.MediaType === 'VirtualTour' || 
             m.VirtualTourFlagYN === true || 
             m.VirtualTourURLBranded || 
             m.VirtualTourURLBranded2 || 
             m.VirtualTourURLUnbranded || 
             m.VirtualTourURLUnbranded2;
    }).map(tour => {
      // Enhance with detected virtual tour type if not specified
      if (!tour.VirtualTourType) {
        // Try to determine VT type from URLs
        const urls = [
          tour.VirtualTourURLUnbranded, 
          tour.VirtualTourURLBranded,
          tour.VirtualTourURLUnbranded2,
          tour.VirtualTourURLBranded2,
          tour.MediaURL
        ].filter(Boolean);
        
        if (urls.length > 0) {
          const firstUrl = urls[0];
          if (firstUrl.includes('matterport.com')) {
            tour.VirtualTourType = '3D';
          } else if (firstUrl.includes('youtube.com') || firstUrl.includes('vimeo.com')) {
            tour.VirtualTourType = 'Video';
          } else if (firstUrl.includes('panorama') || firstUrl.includes('360')) {
            tour.VirtualTourType = 'Panoramic';
          } else {
            tour.VirtualTourType = 'Standard';
          }
        }
      }
      return tour;
    }) : [];
  
  // 4.11. Format complete response with organized data
  const response = {
    success: true,
    listingKey,
    count: data.length,
    // Format primary photo with high-quality flag
    primaryPhoto: primaryPhoto ? formatMediaForApi(primaryPhoto, { 
      baseUrl, 
      includeMetadata: true,
      highQuality: true 
    }) : null,
    // Format virtual tours with appropriate options
    virtualTours: virtualTours.map(vt => formatMediaForApi(vt, { 
      baseUrl,
      includeMetadata: true 
    })),
    // Format all media
    media: data.map(m => formatMediaForApi(m, { baseUrl }))
  };

  // 4.12. Add additional metadata for better client rendering
  if (data.length > 0) {
    // Add counts by media type for client-side filtering
    response.counts = {
      images: data.filter(m => m.MediaType === 'Image').length,
      virtualTours: virtualTours.length,
      videos: data.filter(m => m.MediaType === 'Video').length,
      documents: data.filter(m => m.MediaType === 'Document').length
    };
    
    // Add URL templates for dynamic sizing if supported
    if (baseUrl) {
      response.urlTemplates = {
        thumbnail: `${baseUrl}/media/{mediaKey}/thumbnail?width={width}`,
        fullSize: `${baseUrl}/media/{mediaKey}?size=full`
      };
    }
  }
  
  return response;
}

/**
 * Get the best available virtual tour URL for a media record
 * 
 * @param {object} mediaRecord - The media record
 * @param {boolean} preferUnbranded - Whether to prefer unbranded tours (default: true)
 * @returns {string|null} - Best available virtual tour URL
 */
export function getBestVirtualTourUrl(mediaRecord, preferUnbranded = true) {
  if (!mediaRecord) return null;
  
  if (preferUnbranded) {
    // Prefer unbranded URLs first
    return mediaRecord.VirtualTourURLUnbranded || 
           mediaRecord.VirtualTourURLUnbranded2 || 
           mediaRecord.VirtualTourURLBranded || 
           mediaRecord.VirtualTourURLBranded2 || 
           (mediaRecord.MediaType === 'VirtualTour' ? mediaRecord.MediaURL : null);
  } else {
    // Prefer branded URLs first
    return mediaRecord.VirtualTourURLBranded || 
           mediaRecord.VirtualTourURLBranded2 || 
           mediaRecord.VirtualTourURLUnbranded || 
           mediaRecord.VirtualTourURLUnbranded2 || 
           (mediaRecord.MediaType === 'VirtualTour' ? mediaRecord.MediaURL : null);
  }
}