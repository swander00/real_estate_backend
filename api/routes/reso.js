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
// Member Resource Endpoint (Placeholder - needs Member table)
// =============================================================================

/**
 * GET /api/reso/Member
 * Get members with OData query support
 */
router.get('/Member', async (req, res, next) => {
  try {
    // For now, return placeholder data since Member table doesn't exist yet
    const placeholderMembers = [
      {
        MemberKey: 'PLACEHOLDER001',
        MemberFirstName: 'John',
        MemberLastName: 'Smith',
        MemberFullName: 'John Smith',
        MemberEmail: 'john.smith@example.com',
        MemberPhone: '555-0123',
        MemberType: 'Agent',
        LicenseNumber: '12345',
        MemberStatus: 'Active',
        OfficeKey: 'OFFICE001',
        ModificationTimestamp: new Date().toISOString()
      }
    ];

    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('Member'),
      allowedExpandFields: getAllowedExpandFields('Member'),
      defaultOrderBy: 'MemberLastName',
      defaultOrderDirection: 'asc'
    });

    // Format response
    const response = {
      '@odata.context': '$metadata#Member',
      value: placeholderMembers,
      '@odata.count': placeholderMembers.length
    };

    res.json(response);

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Office Resource Endpoint (Placeholder - needs Office table)
// =============================================================================

/**
 * GET /api/reso/Office
 * Get offices with OData query support
 */
router.get('/Office', async (req, res, next) => {
  try {
    // For now, return placeholder data since Office table doesn't exist yet
    const placeholderOffices = [
      {
        OfficeKey: 'OFFICE001',
        OfficeName: 'Century 21 Real Estate',
        OfficeAddress1: '123 Main Street',
        OfficeCity: 'Toronto',
        OfficeState: 'ON',
        OfficePostalCode: 'M5V 3A8',
        OfficePhone: '416-555-0123',
        OfficeEmail: 'info@century21toronto.com',
        OfficeWebsite: 'https://century21toronto.com',
        OfficeLicenseNumber: 'LIC001',
        OfficeType: 'Brokerage',
        ModificationTimestamp: new Date().toISOString()
      }
    ];

    // Parse OData query parameters
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('Office'),
      allowedExpandFields: getAllowedExpandFields('Office'),
      defaultOrderBy: 'OfficeName',
      defaultOrderDirection: 'asc'
    });

    // Format response
    const response = {
      '@odata.context': '$metadata#Office',
      value: placeholderOffices,
      '@odata.count': placeholderOffices.length
    };

    res.json(response);

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
  
  xml += '      <EntityContainer Name="RealEstateContainer">\n';
  xml += '        <EntitySet Name="Property" EntityType="RESO.RealEstate.Property" />\n';
  xml += '        <EntitySet Name="Media" EntityType="RESO.RealEstate.Media" />\n';
  xml += '        <EntitySet Name="OpenHouse" EntityType="RESO.RealEstate.OpenHouse" />\n';
  xml += '      </EntityContainer>\n';
  
  xml += '    </Schema>\n';
  xml += '  </edmx:DataServices>\n';
  xml += '</edmx:Edmx>';
  
  return xml;
}

export default router;
