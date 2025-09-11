# Frontend Media Integration Guide
## TRREB RESO Media System

### Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)
5. [TRREB Compliance](#trreb-compliance)
6. [Performance Optimization](#performance-optimization)
7. [Error Handling](#error-handling)
8. [Database Views](#database-views)
9. [Examples](#examples)

---

## Overview

This guide provides complete instructions for integrating with the TRREB RESO-compliant media system. The media data is stored in the `property_media` table and follows RESO Data Dictionary 1.7 standards.

### Key Features
- ✅ RESO-compliant media structure
- ✅ TRREB access control (Public/Private permissions)
- ✅ Optimized for Largest images only (no duplicates)
- ✅ Proper foreign key relationships
- ✅ Composite primary keys for data integrity

---

## Database Schema

### property_media Table Structure

```sql
CREATE TABLE property_media (
    "ResourceRecordKey" VARCHAR(50) NOT NULL,        -- Foreign key to common_fields.ListingKey
    "MediaKey" VARCHAR(100) NOT NULL,               -- Unique media record identifier
    "MediaObjectID" VARCHAR(100) NULL,              -- Groups size variants of same image
    "MediaURL" TEXT NULL,                           -- Direct URL to media file
    "MediaCategory" VARCHAR(50) NULL,               -- e.g., 'Photo', 'Video', 'Floor Plan'
    "MediaType" VARCHAR(50) NULL,                   -- e.g., 'jpeg', 'pdf' (MIME type)
    "MediaStatus" VARCHAR(20) NULL,                 -- 'Active' or 'Inactive'
    "Order" INTEGER NULL,                           -- Display order (0 = main photo)
    "PreferredPhotoYN" BOOLEAN NULL,                -- Boolean flag for preferred photo
    "Permission" TEXT[] NULL,                       -- Array: ['Public'] or ['Private']
    "ShortDescription" TEXT NULL,                   -- Short description of media
    "ClassName" VARCHAR(50) NULL,                   -- Class name (e.g., 'ResidentialFree')
    "ImageOf" VARCHAR(100) NULL,                    -- What the image shows
    "ImageSizeDescription" VARCHAR(50) NULL,        -- Size description (e.g., 'Largest')
    "ResourceName" VARCHAR(50) NULL,                -- Resource type (e.g., 'Property')
    "OriginatingSystemID" VARCHAR(50) NULL,         -- Originating system identifier
    "MediaModificationTimestamp" TIMESTAMPTZ NULL,  -- When media content was modified
    "ModificationTimestamp" TIMESTAMPTZ NULL,       -- When record was modified
    
    PRIMARY KEY ("ResourceRecordKey", "MediaKey"),  -- Composite primary key
    FOREIGN KEY ("ResourceRecordKey") REFERENCES common_fields("ListingKey") ON DELETE CASCADE
);
```

### Key Relationships
- `ResourceRecordKey` → `common_fields.ListingKey` (One-to-Many)
- Each property can have multiple media records
- Media records are grouped by `MediaObjectID` for variants

---

## API Endpoints

### Recommended Endpoints to Implement

#### 1. Get All Media for a Property
```javascript
// GET /api/properties/{listingKey}/media
// Returns all media for a specific property
```

#### 2. Get Main Photo Only
```javascript
// GET /api/properties/{listingKey}/media/main
// Returns only the main photo (Order = 0)
```

#### 3. Get Public Media Only
```javascript
// GET /api/properties/{listingKey}/media/public
// Returns only media with Permission = ['Public']
```

#### 4. Get Media Count
```javascript
// GET /api/properties/{listingKey}/media/count
// Returns count of media records
```

---

## Frontend Implementation

### 1. Get Main Photo for Property Listings

```javascript
const getMainPhoto = async (listingKey) => {
  const { data, error } = await supabase
    .from('property_media')
    .select('MediaURL, MediaKey, Order')
    .eq('ResourceRecordKey', listingKey)
    .eq('Order', 0)
    .eq('MediaStatus', 'Active')
    .contains('Permission', ['Public'])
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching main photo:', error);
    return null;
  }
  
  return data?.MediaURL;
};
```

### 2. Get All Photos for Property Detail Page

```javascript
const getAllPhotos = async (listingKey) => {
  const { data, error } = await supabase
    .from('property_media')
    .select('MediaURL, MediaKey, Order, ShortDescription')
    .eq('ResourceRecordKey', listingKey)
    .eq('MediaCategory', 'Photo')
    .eq('MediaStatus', 'Active')
    .contains('Permission', ['Public'])
    .order('Order', { ascending: true });
  
  if (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
  
  return data || [];
};
```

### 3. Get Media Count for Property

```javascript
const getMediaCount = async (listingKey) => {
  const { count, error } = await supabase
    .from('property_media')
    .select('*', { count: 'exact', head: true })
    .eq('ResourceRecordKey', listingKey)
    .eq('MediaCategory', 'Photo')
    .eq('MediaStatus', 'Active')
    .contains('Permission', ['Public']);
  
  if (error) {
    console.error('Error fetching media count:', error);
    return 0;
  }
  
  return count || 0;
};
```

### 4. Get Photos with Pagination

```javascript
const getPhotosPaginated = async (listingKey, page = 0, pageSize = 20) => {
  const { data, error } = await supabase
    .from('property_media')
    .select('MediaURL, MediaKey, Order, ShortDescription')
    .eq('ResourceRecordKey', listingKey)
    .eq('MediaCategory', 'Photo')
    .eq('MediaStatus', 'Active')
    .contains('Permission', ['Public'])
    .order('Order', { ascending: true })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  
  if (error) {
    console.error('Error fetching paginated photos:', error);
    return [];
  }
  
  return data || [];
};
```

---

## TRREB Compliance

### Critical Compliance Rules

#### 1. Permission-Based Access Control
```javascript
// ✅ CORRECT: Always filter for public media on public sites
const { data } = await supabase
  .from('property_media')
  .select('*')
  .contains('Permission', ['Public']);

// ❌ WRONG: Don't show private media on public sites
const { data } = await supabase
  .from('property_media')
  .select('*'); // This would include private media
```

#### 2. Media Status Filtering
```javascript
// ✅ CORRECT: Only show active media
const { data } = await supabase
  .from('property_media')
  .select('*')
  .eq('MediaStatus', 'Active');

// ❌ WRONG: Don't show inactive/deleted media
const { data } = await supabase
  .from('property_media')
  .select('*'); // This would include deleted media
```

#### 3. Agent-Only Areas
```javascript
// For authenticated agent areas, you can show private media
const { data } = await supabase
  .from('property_media')
  .select('*')
  .eq('MediaStatus', 'Active')
  .or('Permission.cs.{Public},Permission.cs.{Private}');
```

---

## Performance Optimization

### 1. Use Appropriate Queries

```javascript
// ✅ Use single() for main photo queries
const { data } = await supabase
  .from('property_media')
  .select('MediaURL')
  .eq('ResourceRecordKey', listingKey)
  .eq('Order', 0)
  .single();

// ✅ Use head: true for count queries
const { count } = await supabase
  .from('property_media')
  .select('*', { count: 'exact', head: true })
  .eq('ResourceRecordKey', listingKey);
```

### 2. Implement Caching

```javascript
// Simple caching example
const photoCache = new Map();

const getCachedMainPhoto = async (listingKey) => {
  if (photoCache.has(listingKey)) {
    return photoCache.get(listingKey);
  }
  
  const photoUrl = await getMainPhoto(listingKey);
  photoCache.set(listingKey, photoUrl);
  return photoUrl;
};
```

### 3. Lazy Loading

```javascript
// React example with lazy loading
const PropertyGallery = ({ listingKey }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadPhotos = async () => {
      setLoading(true);
      const photoData = await getAllPhotos(listingKey);
      setPhotos(photoData);
      setLoading(false);
    };
    
    loadPhotos();
  }, [listingKey]);
  
  if (loading) return <div>Loading photos...</div>;
  
  return (
    <div className="photo-gallery">
      {photos.map((photo, index) => (
        <img 
          key={photo.MediaKey}
          src={photo.MediaURL}
          alt={photo.ShortDescription || `Photo ${index + 1}`}
          loading="lazy"
        />
      ))}
    </div>
  );
};
```

---

## Error Handling

### 1. Standard Error Handling

```javascript
const handleMediaQuery = async (listingKey) => {
  try {
    const { data, error } = await supabase
      .from('property_media')
      .select('*')
      .eq('ResourceRecordKey', listingKey);
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - this is normal, not an error
        return [];
      }
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Database error:', error);
    // Return empty array or show error message
    return [];
  }
};
```

### 2. Image Loading Error Handling

```javascript
const ImageWithFallback = ({ src, alt, className }) => {
  const [imageError, setImageError] = useState(false);
  
  if (imageError) {
    return (
      <div className={`no-image ${className}`}>
        <span>Image not available</span>
      </div>
    );
  }
  
  return (
    <img 
      src={src}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
    />
  );
};
```

---

## Database Views

### 1. Main Image View (Already Exists)

```sql
-- Use the existing 'main_image' view for quick main photo access
SELECT * FROM main_image WHERE "ListingKey" = 'YOUR_LISTING_KEY';
```

### 2. Public Media View

```sql
CREATE VIEW public_media AS
SELECT * FROM property_media 
WHERE 'Public' = ANY("Permission") 
AND "MediaStatus" = 'Active';
```

### 3. Property Media Summary View

```sql
CREATE VIEW property_media_summary AS
SELECT 
    "ResourceRecordKey",
    COUNT(*) as total_photos,
    COUNT(CASE WHEN "Order" = 0 THEN 1 END) as has_main_photo,
    MIN("Order") as min_order,
    MAX("Order") as max_order
FROM property_media 
WHERE "MediaStatus" = 'Active'
AND 'Public' = ANY("Permission")
GROUP BY "ResourceRecordKey";
```

---

## Examples

### 1. Property Card Component

```javascript
import React, { useState, useEffect } from 'react';

const PropertyCard = ({ listing }) => {
  const [mainPhoto, setMainPhoto] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(true);
  
  useEffect(() => {
    const fetchMainPhoto = async () => {
      try {
        const { data } = await supabase
          .from('property_media')
          .select('MediaURL')
          .eq('ResourceRecordKey', listing.ListingKey)
          .eq('Order', 0)
          .eq('MediaStatus', 'Active')
          .contains('Permission', ['Public'])
          .single();
        
        setMainPhoto(data?.MediaURL);
      } catch (error) {
        console.error('Error fetching main photo:', error);
      } finally {
        setPhotoLoading(false);
      }
    };
    
    fetchMainPhoto();
  }, [listing.ListingKey]);
  
  return (
    <div className="property-card">
      <div className="property-image">
        {photoLoading ? (
          <div className="image-placeholder">Loading...</div>
        ) : mainPhoto ? (
          <img 
            src={mainPhoto} 
            alt={listing.UnparsedAddress}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
        ) : null}
        <div className="no-photo" style={{ display: 'none' }}>
          No Photo Available
        </div>
      </div>
      
      <div className="property-details">
        <h3>{listing.UnparsedAddress}</h3>
        <p className="price">${listing.ListPrice?.toLocaleString()}</p>
        <p className="city">{listing.City}, {listing.StateOrProvince}</p>
      </div>
    </div>
  );
};

export default PropertyCard;
```

### 2. Property Gallery Component

```javascript
import React, { useState, useEffect } from 'react';

const PropertyGallery = ({ listingKey }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const { data } = await supabase
          .from('property_media')
          .select('MediaURL, MediaKey, Order, ShortDescription')
          .eq('ResourceRecordKey', listingKey)
          .eq('MediaCategory', 'Photo')
          .eq('MediaStatus', 'Active')
          .contains('Permission', ['Public'])
          .order('Order', { ascending: true });
        
        setPhotos(data || []);
      } catch (error) {
        console.error('Error fetching photos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPhotos();
  }, [listingKey]);
  
  if (loading) {
    return <div className="gallery-loading">Loading photos...</div>;
  }
  
  if (photos.length === 0) {
    return <div className="no-photos">No photos available</div>;
  }
  
  return (
    <div className="property-gallery">
      <div className="main-photo">
        <img 
          src={photos[currentIndex]?.MediaURL}
          alt={photos[currentIndex]?.ShortDescription || `Photo ${currentIndex + 1}`}
        />
      </div>
      
      {photos.length > 1 && (
        <div className="photo-thumbnails">
          {photos.map((photo, index) => (
            <img
              key={photo.MediaKey}
              src={photo.MediaURL}
              alt={photo.ShortDescription || `Thumbnail ${index + 1}`}
              className={index === currentIndex ? 'active' : ''}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
      
      <div className="photo-counter">
        {currentIndex + 1} of {photos.length}
      </div>
    </div>
  );
};

export default PropertyGallery;
```

### 3. Media Count Badge

```javascript
import React, { useState, useEffect } from 'react';

const MediaCountBadge = ({ listingKey }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { count } = await supabase
          .from('property_media')
          .select('*', { count: 'exact', head: true })
          .eq('ResourceRecordKey', listingKey)
          .eq('MediaCategory', 'Photo')
          .eq('MediaStatus', 'Active')
          .contains('Permission', ['Public']);
        
        setCount(count || 0);
      } catch (error) {
        console.error('Error fetching media count:', error);
      }
    };
    
    fetchCount();
  }, [listingKey]);
  
  if (count === 0) return null;
  
  return (
    <span className="media-count-badge">
      📸 {count} photo{count !== 1 ? 's' : ''}
    </span>
  );
};

export default MediaCountBadge;
```

### 4. Bulk Media Loading Hook

```javascript
import { useState, useEffect } from 'react';

const usePropertyMedia = (listingKeys) => {
  const [mediaData, setMediaData] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchBulkMedia = async () => {
      if (!listingKeys || listingKeys.length === 0) {
        setLoading(false);
        return;
      }
      
      try {
        const { data } = await supabase
          .from('property_media')
          .select('ResourceRecordKey, MediaURL, Order')
          .in('ResourceRecordKey', listingKeys)
          .eq('Order', 0)
          .eq('MediaStatus', 'Active')
          .contains('Permission', ['Public']);
        
        // Group by ResourceRecordKey
        const grouped = {};
        data?.forEach(media => {
          if (!grouped[media.ResourceRecordKey]) {
            grouped[media.ResourceRecordKey] = media.MediaURL;
          }
        });
        
        setMediaData(grouped);
      } catch (error) {
        console.error('Error fetching bulk media:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBulkMedia();
  }, [listingKeys]);
  
  return { mediaData, loading };
};

export default usePropertyMedia;
```

---

## Best Practices

### 1. Always Use Filters
- Filter for `Permission = ['Public']` on public sites
- Filter for `MediaStatus = 'Active'` to hide deleted media
- Filter for `MediaCategory = 'Photo'` if you only want photos

### 2. Handle Missing Data Gracefully
- Always provide fallbacks for missing images
- Use proper error handling for database queries
- Implement loading states for better UX

### 3. Optimize Performance
- Use `single()` for main photo queries
- Use `head: true` for count queries
- Implement caching for frequently accessed data
- Use lazy loading for image galleries

### 4. Follow TRREB Compliance
- Never show private media on public sites
- Always respect media status (Active/Inactive)
- Use proper attribution if required

---

## Troubleshooting

### Common Issues

#### 1. No Images Showing
- Check if `MediaStatus = 'Active'`
- Verify `Permission` contains `'Public'`
- Ensure `ResourceRecordKey` matches `ListingKey`

#### 2. Permission Denied Errors
- Verify you're filtering for public media only
- Check if the media record exists
- Ensure proper authentication for private media

#### 3. Performance Issues
- Use appropriate indexes (already created)
- Implement pagination for large galleries
- Cache frequently accessed images

#### 4. Image Loading Errors
- Implement fallback images
- Handle network errors gracefully
- Use proper error boundaries

---

## Support

For technical support or questions about this integration:

1. Check the database schema and relationships
2. Verify TRREB compliance requirements
3. Test with sample data first
4. Monitor performance and optimize as needed

---

*This guide is based on the TRREB RESO Media Integration Implementation Plan and follows RESO Data Dictionary 1.7 standards.*

