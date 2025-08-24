// api/reso/PropertyRooms.js - RESO Property Rooms Resource Endpoint
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Import OData utilities (shared logic)
function parseODataParams(query) {
  const params = {
    filter: query.$filter || null,
    select: query.$select ? query.$select.split(',').map(f => f.trim()) : null,
    orderby: query.$orderby || null,
    top: query.$top ? Math.min(parseInt(query.$top), 10000) : 1000,
    skip: query.$skip ? parseInt(query.$skip) : 0,
    count: query.$count === 'true',
    expand: query.$expand ? query.$expand.split(',').map(f => f.trim()) : null
  };
  
  return params;
}

function applyODataFilter(query, filterString) {
  if (!filterString) return query;
  
  // Handle ListingKey filter (common for room queries)
  const listingKeyMatch = filterString.match(/ListingKey\s+eq\s+'([^']+)'/i);
  if (listingKeyMatch) {
    return query.eq('ListingKey', listingKeyMatch[1]);
  }
  
  // Handle RoomType filter
  const roomTypeMatch = filterString.match(/RoomType\s+eq\s+'([^']+)'/i);
  if (roomTypeMatch) {
    return query.eq('RoomType', roomTypeMatch[1]);
  }
  
  // Handle RoomLevel filter
  const roomLevelMatch = filterString.match(/RoomLevel\s+eq\s+'([^']+)'/i);
  if (roomLevelMatch) {
    return query.eq('RoomLevel', roomLevelMatch[1]);
  }
  
  // Handle RoomArea range filters
  const areaMatch = filterString.match(/RoomArea\s+(gt|lt|ge|le)\s+(\d+\.?\d*)/i);
  if (areaMatch) {
    const [, operator, value] = areaMatch;
    const numValue = parseFloat(value);
    
    switch (operator.toLowerCase()) {
      case 'gt': return query.gt('RoomArea', numValue);
      case 'lt': return query.lt('RoomArea', numValue);
      case 'ge': return query.gte('RoomArea', numValue);
      case 'le': return query.lte('RoomArea', numValue);
    }
  }
  
  // Handle RoomLength range filters
  const lengthMatch = filterString.match(/RoomLength\s+(gt|lt|ge|le)\s+(\d+\.?\d*)/i);
  if (lengthMatch) {
    const [, operator, value] = lengthMatch;
    const numValue = parseFloat(value);
    
    switch (operator.toLowerCase()) {
      case 'gt': return query.gt('RoomLength', numValue);
      case 'lt': return query.lt('RoomLength', numValue);
      case 'ge': return query.gte('RoomLength', numValue);
      case 'le': return query.lte('RoomLength', numValue);
    }
  }
  
  // Handle RoomWidth range filters
  const widthMatch = filterString.match(/RoomWidth\s+(gt|lt|ge|le)\s+(\d+\.?\d*)/i);
  if (widthMatch) {
    const [, operator, value] = widthMatch;
    const numValue = parseFloat(value);
    
    switch (operator.toLowerCase()) {
      case 'gt': return query.gt('RoomWidth', numValue);
      case 'lt': return query.lt('RoomWidth', numValue);
      case 'ge': return query.gte('RoomWidth', numValue);
      case 'le': return query.lte('RoomWidth', numValue);
    }
  }
  
  // Handle RoomFeatures contains
  const featuresMatch = filterString.match(/contains\(RoomFeatures,\s*'([^']+)'\)/i);
  if (featuresMatch) {
    return query.ilike('RoomFeatures', `%${featuresMatch[1]}%`);
  }
  
  // Handle RoomDescription contains
  const descMatch = filterString.match(/contains\(RoomDescription,\s*'([^']+)'\)/i);
  if (descMatch) {
    return query.ilike('RoomDescription', `%${descMatch[1]}%`);
  }
  
  // Handle specific room types
  const kitchenMatch = filterString.match(/RoomType\s+eq\s+'Kitchen'/i);
  if (kitchenMatch) {
    return query.eq('RoomType', 'Kitchen');
  }
  
  const bedroomMatch = filterString.match(/RoomType\s+eq\s+'Bedroom'/i);
  if (bedroomMatch) {
    return query.eq('RoomType', 'Bedroom');
  }
  
  const bathroomMatch = filterString.match(/RoomType\s+eq\s+'Bathroom'/i);
  if (bathroomMatch) {
    return query.eq('RoomType', 'Bathroom');
  }
  
  console.warn(`Unsupported PropertyRooms OData filter: ${filterString}`);
  return query;
}

function applyODataOrderBy(query, orderbyString) {
  if (!orderbyString) {
    // Default ordering: ListingKey asc, Order asc, RoomType asc
    return query
      .order('ListingKey', { ascending: true })
      .order('Order', { ascending: true, nullsFirst: false })
      .order('RoomType', { ascending: true });
  }
  
  const orderParts = orderbyString.split(',').map(part => part.trim());
  
  for (const part of orderParts) {
    const [field, direction = 'asc'] = part.split(/\s+/);
    const ascending = direction.toLowerCase() === 'asc';
    query = query.order(field, { ascending });
  }
  
  return query;
}

function applyODataSelect(data, selectFields) {
  if (!selectFields || !Array.isArray(selectFields)) return data;
  
  return data.map(item => {
    const selected = {};
    selectFields.forEach(field => {
      if (item.hasOwnProperty(field)) {
        selected[field] = item[field];
      }
    });
    return selected;
  });
}

function resoError(code, message, details = null) {
  return {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json(resoError('MethodNotAllowed', 'Only GET requests are supported'));
  }

  try {
    // Set RESO-compliant headers
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.setHeader('OData-Version', '4.0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Parse OData query parameters
    const oDataParams = parseODataParams(req.query);
    
    console.log('🔍 RESO PropertyRooms Query:', {
      filter: oDataParams.filter,
      select: oDataParams.select,
      orderby: oDataParams.orderby,
      top: oDataParams.top,
      skip: oDataParams.skip,
      count: oDataParams.count
    });

    // Build Supabase query for property_rooms table
    let query = supabase.from('property_rooms').select('*');
    
    // Apply OData filters
    query = applyODataFilter(query, oDataParams.filter);
    
    // Apply ordering
    query = applyODataOrderBy(query, oDataParams.orderby);
    
    // Apply pagination
    const rangeStart = oDataParams.skip;
    const rangeEnd = oDataParams.skip + oDataParams.top - 1;
    query = query.range(rangeStart, rangeEnd);
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('❌ RESO PropertyRooms query error:', error);
      return res.status(400).json(resoError('BadRequest', 'Invalid query parameters', error.message));
    }

    // Transform data to RESO PropertyRooms format
    let responseData = (data || []).map(item => ({
      RoomKey: item.RoomKey,
      ListingKey: item.ListingKey,
      RoomType: item.RoomType,
      RoomLevel: item.RoomLevel,
      RoomDimensions: item.RoomDimensions,
      RoomDescription: item.RoomDescription,
      RoomFeatures: Array.isArray(item.RoomFeatures) ? item.RoomFeatures.join(', ') : item.RoomFeatures,
      RoomFeature1: item.RoomFeature1,
      RoomFeature2: item.RoomFeature2,
      RoomFeature3: item.RoomFeature3,
      RoomArea: item.RoomArea,
      RoomAreaSource: item.RoomAreaSource,
      RoomAreaUnits: item.RoomAreaUnits || 'SqFt',
      RoomLength: item.RoomLength,
      RoomWidth: item.RoomWidth,
      RoomLengthWidthSource: item.RoomLengthWidthSource,
      RoomLengthWidthUnits: item.RoomLengthWidthUnits || 'Feet',
      RoomStatus: item.RoomStatus,
      Order: item.Order,
      SystemModificationTimestamp: item.SystemModificationTimestamp,
      ModificationTimestamp: item.ModificationTimestamp
    }));

    // Apply field selection
    if (oDataParams.select) {
      responseData = applyODataSelect(responseData, oDataParams.select);
    }

    // Build RESO-compliant response
    const response = {
      '@odata.context': `${req.headers.host || 'localhost'}/api/reso/$metadata#PropertyRooms`,
      '@odata.count': oDataParams.count ? (count || responseData.length) : undefined,
      value: responseData
    };

    // Add pagination links if needed
    if (responseData.length === oDataParams.top) {
      const nextSkip = oDataParams.skip + oDataParams.top;
      const baseUrl = `${req.protocol || 'https'}://${req.headers.host}${req.url.split('?')[0]}`;
      
      const nextParams = new URLSearchParams(req.query);
      nextParams.set('$skip', nextSkip);
      
      response['@odata.nextLink'] = `${baseUrl}?${nextParams.toString()}`;
    }

    // Remove undefined values from response
    Object.keys(response).forEach(key => {
      if (response[key] === undefined) {
        delete response[key];
      }
    });

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ RESO PropertyRooms endpoint error:', error);
    
    res.status(500).json(resoError(
      'InternalServerError',
      'Failed to retrieve property rooms data',
      error.message
    ));
  }
}