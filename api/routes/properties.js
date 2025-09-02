// api/routes/properties.js - Property listing routes
import express from 'express';
import { supabase } from '../../server.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/properties
 * Get all properties with filtering, pagination, and sorting
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'ModificationTimestamp',
      sortOrder = 'desc',
      propertyType,
      city,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      status
    } = req.query;

    // Validate parameters
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;

    if (pageNum < 1 || limitNum < 1) {
      throw new ValidationError('Invalid pagination parameters');
    }

    // Build query
    let query = supabase
      .from('common_fields')
      .select('*')
      .range(offset, offset + limitNum - 1);

    // Apply filters
    if (propertyType) {
      query = query.eq('PropertyType', propertyType);
    }
    if (city) {
      query = query.ilike('City', `%${city}%`);
    }
    if (minPrice) {
      query = query.gte('ListPrice', parseFloat(minPrice));
    }
    if (maxPrice) {
      query = query.lte('ListPrice', parseFloat(maxPrice));
    }
    if (bedrooms) {
      query = query.gte('BedroomsAboveGrade', parseInt(bedrooms));
    }
    if (bathrooms) {
      query = query.gte('BathroomsTotalInteger', parseInt(bathrooms));
    }
    if (status) {
      query = query.eq('MlsStatus', status);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Execute query
    const { data: properties, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('common_fields')
      .select('*', { count: 'exact', head: true });

    res.json({
      data: properties || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limitNum)
      },
      filters: {
        propertyType,
        city,
        minPrice,
        maxPrice,
        bedrooms,
        bathrooms,
        status
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/properties/:listingKey
 * Get a specific property by listing key
 */
router.get('/:listingKey', async (req, res, next) => {
  try {
    const { listingKey } = req.params;

    if (!listingKey) {
      throw new ValidationError('Listing key is required');
    }

    // Get common fields
    const { data: commonFields, error: commonError } = await supabase
      .from('common_fields')
      .select('*')
      .eq('ListingKey', listingKey)
      .single();

    if (commonError || !commonFields) {
      throw new NotFoundError(`Property with listing key ${listingKey} not found`);
    }

    // Get property-specific data based on type
    let propertyDetails = null;
    if (commonFields.PropertyType === 'Residential') {
      if (commonFields.PropertySubType === 'Freehold') {
        const { data: details } = await supabase
          .from('residential_freehold')
          .select('*')
          .eq('ListingKey', listingKey)
          .single();
        propertyDetails = details;
      } else if (commonFields.PropertySubType === 'Condo') {
        const { data: details } = await supabase
          .from('residential_condo')
          .select('*')
          .eq('ListingKey', listingKey)
          .single();
        propertyDetails = details;
      } else if (commonFields.PropertySubType === 'Lease') {
        const { data: details } = await supabase
          .from('residential_lease')
          .select('*')
          .eq('ListingKey', listingKey)
          .single();
        propertyDetails = details;
      }
    }

    // Get media
    const { data: media } = await supabase
      .from('property_media')
      .select('*')
      .eq('ResourceRecordKey', listingKey)
      .order('Order', { ascending: true });

    // Get open houses
    const { data: openHouses } = await supabase
      .from('property_openhouse')
      .select('*')
      .eq('ListingKey', listingKey);

    // Get rooms
    const { data: rooms } = await supabase
      .from('property_rooms')
      .select('*')
      .eq('ListingKey', listingKey)
      .order('Order', { ascending: true });

    res.json({
      data: {
        ...commonFields,
        details: propertyDetails,
        media: media || [],
        openHouses: openHouses || [],
        rooms: rooms || []
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/properties/search/suggestions
 * Get search suggestions for autocomplete
 */
router.get('/search/suggestions', async (req, res, next) => {
  try {
    const { q, type = 'city' } = req.query;

    if (!q || q.length < 2) {
      return res.json({ data: [] });
    }

    let query;
    if (type === 'city') {
      query = supabase
        .from('common_fields')
        .select('City, StateOrProvince')
        .ilike('City', `%${q}%`)
        .limit(10);
    } else if (type === 'address') {
      query = supabase
        .from('common_fields')
        .select('StreetName, City, StateOrProvince')
        .ilike('StreetName', `%${q}%`)
        .limit(10);
    }

    if (query) {
      const { data, error } = await query;
      if (error) throw error;
      
      // Remove duplicates
      const unique = [...new Set(data.map(item => 
        type === 'city' ? item.City : item.StreetName
      ))].slice(0, 10);

      res.json({ data: unique });
    } else {
      res.json({ data: [] });
    }

  } catch (error) {
    next(error);
  }
});

export default router;
