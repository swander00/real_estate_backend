/**
 * RESO Web API 2.0.0 Router
 * Implements OData 4.0 compliant endpoints for real estate data
 */

import express from 'express';
import { supabase } from '../../server.js';
import { parseODataQuery, applyODataToSupabase, validateODataQuery, createODataErrorResponse } from '../../utils/odataParser.js';
import { generateRESOMetadata, getAllowedFields, getAllowedExpandFields, createServiceDocument } from '../../utils/resoMetadata.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();

// =============================================================================
// OData Metadata Endpoint
// =============================================================================

/**
 * GET /api/reso/$metadata
 * OData metadata document for RESO resources
 */
router.get('/$metadata', (req, res) => {
  try {
    const metadata = generateRESOMetadata();
    res.set('Content-Type', 'application/xml');
    res.send(convertMetadataToXML(metadata));
  } catch (error) {
    console.error('Metadata generation error:', error);
    res.status(500).json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to generate metadata'
      }
    });
  }
});

/**
 * GET /api/reso/%24metadata (URL-encoded version)
 * Alternative route for $metadata with URL encoding
 */
router.get('/%24metadata', (req, res) => {
  try {
    const metadata = generateRESOMetadata();
    res.set('Content-Type', 'application/xml');
    res.send(convertMetadataToXML(metadata));
  } catch (error) {
    console.error('Metadata generation error:', error);
    res.status(500).json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to generate metadata'
      }
    });
  }
});

/**
 * GET /api/reso/
 * OData service document
 */
router.get('/', (req, res) => {
  try {
    const serviceDoc = createServiceDocument();
    res.json(serviceDoc);
  } catch (error) {
    console.error('Service document error:', error);
    res.status(500).json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to generate service document'
      }
    });
  }
});

// =============================================================================
// Property Resource Endpoint
// =============================================================================

/**
 * GET /api/reso/Property
 * Get properties with OData query support
 */
router.get('/Property', async (req, res, next) => {
  try {
    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('Property'),
      allowedExpandFields: getAllowedExpandFields('Property'),
      defaultOrderBy: 'ModificationTimestamp',
      defaultOrderDirection: 'desc'
    });

    // Validate query
    const validation = validateODataQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json(createODataErrorResponse(validation.errors, validation.warnings));
    }

    // Build base query
    let query = supabase.from('common_fields').select('*');

    // Apply OData parameters
    query = applyODataToSupabase(query, parsedQuery);

    // Execute query
    const { data: properties, error, count } = await query;

    if (error) {
      throw error;
    }

    // Handle $expand for related data
    if (parsedQuery.expand.length > 0) {
      await expandPropertyData(properties, parsedQuery.expand);
    }

    // Format response
    const response = {
      '@odata.context': '$metadata#Property',
      value: properties || [],
      '@odata.count': count || properties?.length || 0
    };

    // Add OData next link if pagination is used
    if (parsedQuery.top && properties && properties.length === parsedQuery.top) {
      response['@odata.nextLink'] = `/api/reso/Property?$skip=${parsedQuery.skip + parsedQuery.top}&$top=${parsedQuery.top}`;
    }

    res.json(response);

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reso/Property/:listingKey
 * Get specific property by listing key
 */
router.get('/Property/:listingKey', async (req, res, next) => {
  try {
    const { listingKey } = req.params;
    
    if (!listingKey) {
      throw new ValidationError('Listing key is required');
    }

    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('Property'),
      allowedExpandFields: getAllowedExpandFields('Property')
    });

    // Get property data
    let query = supabase
      .from('common_fields')
      .select('*')
      .eq('ListingKey', listingKey)
      .single();

    // Apply OData parameters
    query = applyODataToSupabase(query, parsedQuery);

    const { data: property, error } = await query;

    if (error || !property) {
      throw new NotFoundError(`Property with listing key ${listingKey} not found`);
    }

    // Handle $expand for related data
    if (parsedQuery.expand.length > 0) {
      await expandPropertyData([property], parsedQuery.expand);
    }

    res.json({
      '@odata.context': `$metadata#Property/$entity`,
      ...property
    });

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Media Resource Endpoint
// =============================================================================

/**
 * GET /api/reso/Media
 * Get media with OData query support
 */
router.get('/Media', async (req, res, next) => {
  try {
    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('Media'),
      allowedExpandFields: getAllowedExpandFields('Media'),
      defaultOrderBy: 'Order',
      defaultOrderDirection: 'asc'
    });

    // Validate query
    const validation = validateODataQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json(createODataErrorResponse(validation.errors, validation.warnings));
    }

    // Build base query
    let query = supabase.from('property_media').select('*');

    // Apply OData parameters
    query = applyODataToSupabase(query, parsedQuery);

    // Execute query
    const { data: media, error, count } = await query;

    if (error) {
      throw error;
    }

    // Handle $expand for related data
    if (parsedQuery.expand.length > 0) {
      await expandMediaData(media, parsedQuery.expand);
    }

    // Format response
    const response = {
      '@odata.context': '$metadata#Media',
      value: media || [],
      '@odata.count': count || media?.length || 0
    };

    res.json(response);

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// OpenHouse Resource Endpoint
// =============================================================================

/**
 * GET /api/reso/OpenHouse
 * Get open houses with OData query support
 */
router.get('/OpenHouse', async (req, res, next) => {
  try {
    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('OpenHouse'),
      allowedExpandFields: getAllowedExpandFields('OpenHouse'),
      defaultOrderBy: 'OpenHouseDate',
      defaultOrderDirection: 'desc'
    });

    // Validate query
    const validation = validateODataQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json(createODataErrorResponse(validation.errors, validation.warnings));
    }

    // Build base query
    let query = supabase.from('property_openhouse').select('*');

    // Apply OData parameters
    query = applyODataToSupabase(query, parsedQuery);

    // Execute query
    const { data: openHouses, error, count } = await query;

    if (error) {
      throw error;
    }

    // Handle $expand for related data
    if (parsedQuery.expand.length > 0) {
      await expandOpenHouseData(openHouses, parsedQuery.expand);
    }

    // Format response
    const response = {
      '@odata.context': '$metadata#OpenHouse',
      value: openHouses || [],
      '@odata.count': count || openHouses?.length || 0
    };

    res.json(response);

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Room Resource Endpoint
// =============================================================================

/**
 * GET /api/reso/Room
 * Get rooms with OData query support
 */
router.get('/Room', async (req, res, next) => {
  try {
    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('Room'),
      allowedExpandFields: getAllowedExpandFields('Room'),
      defaultOrderBy: 'RoomType',
      defaultOrderDirection: 'asc'
    });

    // Validate query
    const validation = validateODataQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json(createODataErrorResponse(validation.errors, validation.warnings));
    }

    // Build base query
    let query = supabase.from('property_rooms').select('*');

    // Apply OData parameters
    query = applyODataToSupabase(query, parsedQuery);

    // Execute query
    const { data: rooms, error, count } = await query;

    if (error) {
      throw error;
    }

    // Handle $expand for related data
    if (parsedQuery.expand.length > 0) {
      await expandRoomData(rooms, parsedQuery.expand);
    }

    // Format response
    const response = {
      '@odata.context': '$metadata#Room',
      value: rooms || [],
      '@odata.count': count || rooms?.length || 0
    };

    res.json(response);

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Member Resource Endpoint
// =============================================================================

/**
 * GET /api/reso/Member
 * Get members with OData query support
 */
router.get('/Member', async (req, res, next) => {
  try {
    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('Member'),
      allowedExpandFields: getAllowedExpandFields('Member'),
      defaultOrderBy: 'MemberLastName',
      defaultOrderDirection: 'asc'
    });

    // Validate query
    const validation = validateODataQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json(createODataErrorResponse(validation.errors, validation.warnings));
    }

    // Build base query - use users table with RESO Member field mapping
    let query = supabase
      .from('users')
      .select(`
        id as MemberKey,
        email as MemberEmail,
        first_name as MemberFirstName,
        last_name as MemberLastName,
        CONCAT(first_name, ' ', last_name) as MemberFullName,
        phone as MemberPhone,
        user_type as MemberType,
        license_number as LicenseNumber,
        status as MemberStatus,
        office_key as OfficeKey,
        updated_at as ModificationTimestamp
      `);

    // Apply OData parameters
    query = applyODataToSupabase(query, parsedQuery);

    // Execute query
    const { data: members, error, count } = await query;

    if (error) {
      throw error;
    }

    // Handle $expand for related data
    if (parsedQuery.expand.length > 0) {
      await expandMemberData(members, parsedQuery.expand);
    }

    // Format response
    const response = {
      '@odata.context': '$metadata#Member',
      value: members || [],
      '@odata.count': count || members?.length || 0
    };

    // Add OData next link if pagination is used
    if (parsedQuery.top && members && members.length === parsedQuery.top) {
      response['@odata.nextLink'] = `/api/reso/Member?$skip=${parsedQuery.skip + parsedQuery.top}&$top=${parsedQuery.top}`;
    }

    res.json(response);

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reso/Member/:memberKey
 * Get specific member by member key
 */
router.get('/Member/:memberKey', async (req, res, next) => {
  try {
    const { memberKey } = req.params;
    
    if (!memberKey) {
      throw new ValidationError('Member key is required');
    }

    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('Member'),
      allowedExpandFields: getAllowedExpandFields('Member')
    });

    // Get member data
    let query = supabase
      .from('users')
      .select(`
        id as MemberKey,
        email as MemberEmail,
        first_name as MemberFirstName,
        last_name as MemberLastName,
        CONCAT(first_name, ' ', last_name) as MemberFullName,
        phone as MemberPhone,
        user_type as MemberType,
        license_number as LicenseNumber,
        status as MemberStatus,
        office_key as OfficeKey,
        updated_at as ModificationTimestamp
      `)
      .eq('id', memberKey)
      .single();

    // Apply OData parameters
    query = applyODataToSupabase(query, parsedQuery);

    const { data: member, error } = await query;

    if (error || !member) {
      throw new NotFoundError(`Member with key ${memberKey} not found`);
    }

    // Handle $expand for related data
    if (parsedQuery.expand.length > 0) {
      await expandMemberData([member], parsedQuery.expand);
    }

    res.json({
      '@odata.context': `$metadata#Member/$entity`,
      ...member
    });

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Office Resource Endpoint
// =============================================================================

/**
 * GET /api/reso/Office
 * Get offices with OData query support
 */
router.get('/Office', async (req, res, next) => {
  try {
    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('Office'),
      allowedExpandFields: getAllowedExpandFields('Office'),
      defaultOrderBy: 'OfficeName',
      defaultOrderDirection: 'asc'
    });

    // Validate query
    const validation = validateODataQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json(createODataErrorResponse(validation.errors, validation.warnings));
    }

    // Build base query
    let query = supabase.from('offices').select('*');

    // Apply OData parameters
    query = applyODataToSupabase(query, parsedQuery);

    // Execute query
    const { data: offices, error, count } = await query;

    if (error) {
      throw error;
    }

    // Handle $expand for related data
    if (parsedQuery.expand.length > 0) {
      await expandOfficeData(offices, parsedQuery.expand);
    }

    // Format response
    const response = {
      '@odata.context': '$metadata#Office',
      value: offices || [],
      '@odata.count': count || offices?.length || 0
    };

    // Add OData next link if pagination is used
    if (parsedQuery.top && offices && offices.length === parsedQuery.top) {
      response['@odata.nextLink'] = `/api/reso/Office?$skip=${parsedQuery.skip + parsedQuery.top}&$top=${parsedQuery.top}`;
    }

    res.json(response);

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reso/Office/:officeKey
 * Get specific office by office key
 */
router.get('/Office/:officeKey', async (req, res, next) => {
  try {
    const { officeKey } = req.params;
    
    if (!officeKey) {
      throw new ValidationError('Office key is required');
    }

    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('Office'),
      allowedExpandFields: getAllowedExpandFields('Office')
    });

    // Get office data
    let query = supabase
      .from('offices')
      .select('*')
      .eq('OfficeKey', officeKey)
      .single();

    // Apply OData parameters
    query = applyODataToSupabase(query, parsedQuery);

    const { data: office, error } = await query;

    if (error || !office) {
      throw new NotFoundError(`Office with key ${officeKey} not found`);
    }

    // Handle $expand for related data
    if (parsedQuery.expand.length > 0) {
      await expandOfficeData([office], parsedQuery.expand);
    }

    res.json({
      '@odata.context': `$metadata#Office/$entity`,
      ...office
    });

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// PropertyHistory Resource Endpoint
// =============================================================================

/**
 * GET /api/reso/PropertyHistory
 * Get property history with OData query support
 */
router.get('/PropertyHistory', async (req, res, next) => {
  try {
    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('PropertyHistory'),
      allowedExpandFields: getAllowedExpandFields('PropertyHistory'),
      defaultOrderBy: 'ChangeDate',
      defaultOrderDirection: 'desc'
    });

    // Validate query
    const validation = validateODataQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json(createODataErrorResponse(validation.errors, validation.warnings));
    }

    // Build base query - use property_history table if it exists, otherwise return empty
    let query = supabase.from('property_history').select('*');

    // Apply OData parameters
    query = applyODataToSupabase(query, parsedQuery);

    // Execute query
    const { data: history, error, count } = await query;

    if (error) {
      // If table doesn't exist, return empty result
      if (error.code === 'PGRST116') {
        const response = {
          '@odata.context': '$metadata#PropertyHistory',
          value: [],
          '@odata.count': 0
        };
        return res.json(response);
      }
      throw error;
    }

    // Handle $expand for related data
    if (parsedQuery.expand.length > 0) {
      await expandPropertyHistoryData(history, parsedQuery.expand);
    }

    // Format response
    const response = {
      '@odata.context': '$metadata#PropertyHistory',
      value: history || [],
      '@odata.count': count || history?.length || 0
    };

    // Add OData next link if pagination is used
    if (parsedQuery.top && history && history.length === parsedQuery.top) {
      response['@odata.nextLink'] = `/api/reso/PropertyHistory?$skip=${parsedQuery.skip + parsedQuery.top}&$top=${parsedQuery.top}`;
    }

    res.json(response);

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// PropertyFeatures Resource Endpoint
// =============================================================================

/**
 * GET /api/reso/PropertyFeatures
 * Get property features with OData query support
 */
router.get('/PropertyFeatures', async (req, res, next) => {
  try {
    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('PropertyFeatures'),
      allowedExpandFields: getAllowedExpandFields('PropertyFeatures'),
      defaultOrderBy: 'FeatureName',
      defaultOrderDirection: 'asc'
    });

    // Validate query
    const validation = validateODataQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json(createODataErrorResponse(validation.errors, validation.warnings));
    }

    // Build base query - use property_features table if it exists, otherwise return empty
    let query = supabase.from('property_features').select('*');

    // Apply OData parameters
    query = applyODataToSupabase(query, parsedQuery);

    // Execute query
    const { data: features, error, count } = await query;

    if (error) {
      // If table doesn't exist, return empty result
      if (error.code === 'PGRST116') {
        const response = {
          '@odata.context': '$metadata#PropertyFeatures',
          value: [],
          '@odata.count': 0
        };
        return res.json(response);
      }
      throw error;
    }

    // Handle $expand for related data
    if (parsedQuery.expand.length > 0) {
      await expandPropertyFeaturesData(features, parsedQuery.expand);
    }

    // Format response
    const response = {
      '@odata.context': '$metadata#PropertyFeatures',
      value: features || [],
      '@odata.count': count || features?.length || 0
    };

    // Add OData next link if pagination is used
    if (parsedQuery.top && features && features.length === parsedQuery.top) {
      response['@odata.nextLink'] = `/api/reso/PropertyFeatures?$skip=${parsedQuery.skip + parsedQuery.top}&$top=${parsedQuery.top}`;
    }

    res.json(response);

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Batch Endpoint (OData Batch Processing)
// =============================================================================

/**
 * POST /api/reso/$batch
 * OData batch processing endpoint
 */
router.post('/$batch', async (req, res, next) => {
  try {
    const contentType = req.get('Content-Type') || '';
    
    if (!contentType.includes('multipart/mixed')) {
      return res.status(400).json({
        error: {
          code: 'BadRequest',
          message: 'Batch requests must use multipart/mixed content type'
        }
      });
    }

    // For now, return a simple response indicating batch processing is not fully implemented
    res.status(501).json({
      error: {
        code: 'NotImplemented',
        message: 'Batch processing is not yet fully implemented. Individual requests should be used instead.'
      }
    });

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Search Endpoint (OData Search)
// =============================================================================

/**
 * GET /api/reso/$search
 * OData search endpoint for cross-entity searching
 */
router.get('/$search', async (req, res, next) => {
  try {
    const { $search: searchTerm } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({
        error: {
          code: 'BadRequest',
          message: 'Search term is required'
        }
      });
    }

    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: ['*'], // Allow all fields for search
      allowedExpandFields: [],
      defaultOrderBy: 'ModificationTimestamp',
      defaultOrderDirection: 'desc'
    });

    // Search across multiple entities
    const searchResults = {
      '@odata.context': '$metadata#SearchResults',
      value: []
    };

    // Search in Properties
    const { data: properties } = await supabase
      .from('common_fields')
      .select('*')
      .or(`PublicRemarks.ilike.%${searchTerm}%,City.ilike.%${searchTerm}%,UnparsedAddress.ilike.%${searchTerm}%`)
      .limit(10);

    if (properties && properties.length > 0) {
      searchResults.value.push({
        '@odata.type': 'RESO.RealEstate.Property',
        results: properties
      });
    }

    // Search in Members
    const { data: members } = await supabase
      .from('users')
      .select(`
        id as MemberKey,
        email as MemberEmail,
        first_name as MemberFirstName,
        last_name as MemberLastName,
        CONCAT(first_name, ' ', last_name) as MemberFullName
      `)
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(5);

    if (members && members.length > 0) {
      searchResults.value.push({
        '@odata.type': 'RESO.RealEstate.Member',
        results: members
      });
    }

    // Search in Offices
    const { data: offices } = await supabase
      .from('offices')
      .select('*')
      .or(`OfficeName.ilike.%${searchTerm}%,OfficeCity.ilike.%${searchTerm}%`)
      .limit(5);

    if (offices && offices.length > 0) {
      searchResults.value.push({
        '@odata.type': 'RESO.RealEstate.Office',
        results: offices
      });
    }

    res.json(searchResults);

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Expand property data with related resources
 * @param {Array} properties - Array of property objects
 * @param {Array} expandFields - Fields to expand
 */
async function expandPropertyData(properties, expandFields) {
  for (const property of properties) {
    const listingKey = property.ListingKey;
    
    for (const expandField of expandFields) {
      switch (expandField) {
        case 'Media':
          const { data: media } = await supabase
            .from('property_media')
            .select('*')
            .eq('ResourceRecordKey', listingKey)
            .order('Order', { ascending: true });
          property.Media = media || [];
          break;
          
        case 'OpenHouse':
          const { data: openHouses } = await supabase
            .from('property_openhouse')
            .select('*')
            .eq('ListingKey', listingKey);
          property.OpenHouse = openHouses || [];
          break;
          
        case 'Room':
          const { data: rooms } = await supabase
            .from('property_rooms')
            .select('*')
            .eq('ListingKey', listingKey);
          property.Room = rooms || [];
          break;
          
        case 'Member':
          // For now, we'll add placeholder data since Member table doesn't exist yet
          property.Member = {
            MemberKey: 'PLACEHOLDER',
            MemberFirstName: 'Agent',
            MemberLastName: 'Name',
            MemberStatus: 'Active'
          };
          break;
      }
    }
  }
}

/**
 * Expand media data with related resources
 * @param {Array} media - Array of media objects
 * @param {Array} expandFields - Fields to expand
 */
async function expandMediaData(media, expandFields) {
  for (const mediaItem of media) {
    const resourceRecordKey = mediaItem.ResourceRecordKey;
    
    for (const expandField of expandFields) {
      if (expandField === 'Property') {
        const { data: property } = await supabase
          .from('common_fields')
          .select('*')
          .eq('ListingKey', resourceRecordKey)
          .single();
        mediaItem.Property = property || null;
      }
    }
  }
}

/**
 * Expand open house data with related resources
 * @param {Array} openHouses - Array of open house objects
 * @param {Array} expandFields - Fields to expand
 */
async function expandOpenHouseData(openHouses, expandFields) {
  for (const openHouse of openHouses) {
    const listingKey = openHouse.ListingKey;
    
    for (const expandField of expandFields) {
      if (expandField === 'Property') {
        const { data: property } = await supabase
          .from('common_fields')
          .select('*')
          .eq('ListingKey', listingKey)
          .single();
        openHouse.Property = property || null;
      }
    }
  }
}

/**
 * Expand room data with related resources
 * @param {Array} rooms - Array of room objects
 * @param {Array} expandFields - Fields to expand
 */
async function expandRoomData(rooms, expandFields) {
  for (const room of rooms) {
    const listingKey = room.ListingKey;
    
    for (const expandField of expandFields) {
      if (expandField === 'Property') {
        const { data: property } = await supabase
          .from('common_fields')
          .select('*')
          .eq('ListingKey', listingKey)
          .single();
        room.Property = property || null;
      }
    }
  }
}

/**
 * Expand member data with related resources
 * @param {Array} members - Array of member objects
 * @param {Array} expandFields - Fields to expand
 */
async function expandMemberData(members, expandFields) {
  for (const member of members) {
    const memberKey = member.MemberKey;
    const officeKey = member.OfficeKey;
    
    for (const expandField of expandFields) {
      switch (expandField) {
        case 'Office':
          if (officeKey) {
            const { data: office } = await supabase
              .from('offices')
              .select('*')
              .eq('OfficeKey', officeKey)
              .single();
            member.Office = office || null;
          }
          break;
          
        case 'Property':
          // Get properties associated with this member
          const { data: properties } = await supabase
            .from('common_fields')
            .select('*')
            .eq('ListingAgentKey', memberKey);
          member.Property = properties || [];
          break;
      }
    }
  }
}

/**
 * Expand office data with related resources
 * @param {Array} offices - Array of office objects
 * @param {Array} expandFields - Fields to expand
 */
async function expandOfficeData(offices, expandFields) {
  for (const office of offices) {
    const officeKey = office.OfficeKey;
    
    for (const expandField of expandFields) {
      if (expandField === 'Member') {
        const { data: members } = await supabase
          .from('users')
          .select(`
            id as MemberKey,
            email as MemberEmail,
            first_name as MemberFirstName,
            last_name as MemberLastName,
            CONCAT(first_name, ' ', last_name) as MemberFullName,
            phone as MemberPhone,
            user_type as MemberType,
            license_number as LicenseNumber,
            status as MemberStatus,
            office_key as OfficeKey,
            updated_at as ModificationTimestamp
          `)
          .eq('office_key', officeKey);
        office.Member = members || [];
      }
    }
  }
}

/**
 * Expand property history data with related resources
 * @param {Array} history - Array of property history objects
 * @param {Array} expandFields - Fields to expand
 */
async function expandPropertyHistoryData(history, expandFields) {
  for (const historyItem of history) {
    const listingKey = historyItem.ListingKey;
    
    for (const expandField of expandFields) {
      if (expandField === 'Property') {
        const { data: property } = await supabase
          .from('common_fields')
          .select('*')
          .eq('ListingKey', listingKey)
          .single();
        historyItem.Property = property || null;
      }
    }
  }
}

/**
 * Expand property features data with related resources
 * @param {Array} features - Array of property features objects
 * @param {Array} expandFields - Fields to expand
 */
async function expandPropertyFeaturesData(features, expandFields) {
  for (const feature of features) {
    const listingKey = feature.ListingKey;
    
    for (const expandField of expandFields) {
      if (expandField === 'Property') {
        const { data: property } = await supabase
          .from('common_fields')
          .select('*')
          .eq('ListingKey', listingKey)
          .single();
        feature.Property = property || null;
      }
    }
  }
}

/**
 * Convert metadata to XML format (basic implementation)
 * @param {Object} metadata - Metadata object
 * @returns {string} XML string
 */
function convertMetadataToXML(metadata) {
  // This is a basic XML conversion - in production you'd want a proper XML library
  let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
  xml += '<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">\n';
  xml += '  <edmx:DataServices>\n';
  xml += '    <Schema Namespace="RESO.RealEstate" xmlns="http://docs.oasis-open.org/odata/ns/edm">\n';
  
  // Add entity types
  xml += '      <EntityType Name="Property">\n';
  xml += '        <Key><PropertyRef Name="ListingKey" /></Key>\n';
  xml += '        <Property Name="ListingKey" Type="Edm.String" Nullable="false" />\n';
  xml += '        <Property Name="ListPrice" Type="Edm.Decimal" Nullable="true" />\n';
  xml += '        <Property Name="City" Type="Edm.String" Nullable="true" />\n';
  xml += '      </EntityType>\n';
  
  xml += '      <EntityType Name="Media">\n';
  xml += '        <Key><PropertyRef Name="MediaKey" /></Key>\n';
  xml += '        <Property Name="MediaKey" Type="Edm.String" Nullable="false" />\n';
  xml += '        <Property Name="MediaURL" Type="Edm.String" Nullable="true" />\n';
  xml += '      </EntityType>\n';
  
  xml += '      <EntityType Name="OpenHouse">\n';
  xml += '        <Key><PropertyRef Name="OpenHouseKey" /></Key>\n';
  xml += '        <Property Name="OpenHouseKey" Type="Edm.String" Nullable="false" />\n';
  xml += '        <Property Name="OpenHouseDate" Type="Edm.Date" Nullable="true" />\n';
  xml += '      </EntityType>\n';
  
  xml += '      <EntityType Name="Room">\n';
  xml += '        <Key><PropertyRef Name="RoomKey" /></Key>\n';
  xml += '        <Property Name="RoomKey" Type="Edm.String" Nullable="false" />\n';
  xml += '        <Property Name="RoomType" Type="Edm.String" Nullable="true" />\n';
  xml += '      </EntityType>\n';
  
  xml += '      <EntityType Name="Member">\n';
  xml += '        <Key><PropertyRef Name="MemberKey" /></Key>\n';
  xml += '        <Property Name="MemberKey" Type="Edm.String" Nullable="false" />\n';
  xml += '        <Property Name="MemberFirstName" Type="Edm.String" Nullable="true" />\n';
  xml += '        <Property Name="MemberLastName" Type="Edm.String" Nullable="true" />\n';
  xml += '      </EntityType>\n';
  
  xml += '      <EntityType Name="Office">\n';
  xml += '        <Key><PropertyRef Name="OfficeKey" /></Key>\n';
  xml += '        <Property Name="OfficeKey" Type="Edm.String" Nullable="false" />\n';
  xml += '        <Property Name="OfficeName" Type="Edm.String" Nullable="true" />\n';
  xml += '      </EntityType>\n';
  
  xml += '      <EntityType Name="PropertyHistory">\n';
  xml += '        <Key><PropertyRef Name="HistoryKey" /></Key>\n';
  xml += '        <Property Name="HistoryKey" Type="Edm.String" Nullable="false" />\n';
  xml += '        <Property Name="ChangeType" Type="Edm.String" Nullable="true" />\n';
  xml += '        <Property Name="ChangeDate" Type="Edm.DateTimeOffset" Nullable="true" />\n';
  xml += '      </EntityType>\n';
  
  xml += '      <EntityType Name="PropertyFeatures">\n';
  xml += '        <Key><PropertyRef Name="FeatureKey" /></Key>\n';
  xml += '        <Property Name="FeatureKey" Type="Edm.String" Nullable="false" />\n';
  xml += '        <Property Name="FeatureName" Type="Edm.String" Nullable="true" />\n';
  xml += '        <Property Name="FeatureValue" Type="Edm.String" Nullable="true" />\n';
  xml += '      </EntityType>\n';
  
  xml += '      <EntityContainer Name="RealEstateContainer">\n';
  xml += '        <EntitySet Name="Property" EntityType="RESO.RealEstate.Property" />\n';
  xml += '        <EntitySet Name="Media" EntityType="RESO.RealEstate.Media" />\n';
  xml += '        <EntitySet Name="OpenHouse" EntityType="RESO.RealEstate.OpenHouse" />\n';
  xml += '        <EntitySet Name="Room" EntityType="RESO.RealEstate.Room" />\n';
  xml += '        <EntitySet Name="Member" EntityType="RESO.RealEstate.Member" />\n';
  xml += '        <EntitySet Name="Office" EntityType="RESO.RealEstate.Office" />\n';
  xml += '        <EntitySet Name="PropertyHistory" EntityType="RESO.RealEstate.PropertyHistory" />\n';
  xml += '        <EntitySet Name="PropertyFeatures" EntityType="RESO.RealEstate.PropertyFeatures" />\n';
  xml += '      </EntityContainer>\n';
  
  xml += '    </Schema>\n';
  xml += '  </edmx:DataServices>\n';
  xml += '</edmx:Edmx>';
  
  return xml;
}

export default router;
