// api/reso/Media.js - RESO Web API Media Resource Endpoint
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
  
  // Handle ResourceRecordKey filter (common for media queries)
  const resourceKeyMatch = filterString.match(/ResourceRecordKey\s+eq\s+'([^']+)'/i);
  if (resourceKeyMatch) {
    return query.eq('ResourceRecordKey', resourceKeyMatch[1]);
  }
  
  // Handle MediaType filter
  const mediaTypeMatch = filterString.match(/MediaType\s+eq\s+'([^']+)'/i);
  if (mediaTypeMatch) {
    return query.eq('MediaType', mediaTypeMatch[1]);
  }
  
  // Handle PreferredPhotoYN filter
  const preferredMatch = filterString.match(/PreferredPhotoYN\s+eq\s+(true|false)/i);
  if (preferredMatch) {
    return query.eq('PreferredPhotoYN', preferredMatch[1].toLowerCase() === 'true');
  }
  
  // Handle Order comparisons
  const orderMatch = filterString.match(/Order\s+(gt|lt|ge|le)\s+(\d+)/i);
  if (orderMatch) {
    const [, operator, value] = orderMatch;
    const numValue = parseInt(value);
    
    switch (operator.toLowerCase()) {
      case 'gt': return query.gt('Order', numValue);
      case 'lt': return query.lt('Order', numValue);
      case 'ge': return query.gte('Order', numValue);
      case 'le': return query.lte('Order', numValue);
    }
  }
  
  // Handle MediaURL contains
  const urlContainsMatch = filterString.match(/contains\(MediaURL,\s*'([^']+)'\)/i);
  if (urlContainsMatch) {
    return query.ilike('MediaURL', `%${urlContainsMatch[1]}%`);
  }
  
  console.warn(`Unsupported Media OData filter: ${filterString}`);
  return query;
}

function applyODataOrderBy(query, orderbyString) {
  if (!orderbyString) {
    // Default ordering: PreferredPhotoYN desc, Order asc, MediaKey asc
    return query
      .order('PreferredPhotoYN', { ascending: false, nullsFirst: false })
      .order('Order', { ascending: true, nullsFirst: false })
      .order('MediaKey', { ascending: true });
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
    
    console.log('🔍 RESO Media Query:', {
      filter: oDataParams.filter,
      select: oDataParams.select,
      orderby: oDataParams.orderby,
      top: oDataParams.top,
      skip: oDataParams.skip,
      count: oDataParams.count
    });

    // Build Supabase query for property_media table
    let query = supabase.from('property_media').select('*');
    
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
      console.error('❌ RESO Media query error:', error);
      return res.status(400).json(resoError('BadRequest', 'Invalid query parameters', error.message));
    }

    // Transform data to RESO Media format
    let responseData = (data || []).map(item => ({
      MediaKey: item.MediaKey,
      ResourceRecordKey: item.ResourceRecordKey,
      ResourceName: item.ResourceName || 'Property',
      MediaType: item.MediaType,
      MediaURL: item.MediaURL,
      MediaObjectID: item.MediaObjectID,
      MediaStatus: item.MediaStatus || 'Active',
      MediaCategory: item.MediaCategory,
      ImageOf: item.ImageOf,
      ImageSizeDescription: item.ImageSizeDescription,
      ShortDescription: item.ShortDescription,
      Order: item.Order,
      PreferredPhotoYN: item.PreferredPhotoYN,
      MediaModificationTimestamp: item.MediaModificationTimestamp,
      ModificationTimestamp: item.ModificationTimestamp,
      SystemModificationTimestamp: item.SystemModificationTimestamp,
      OriginalEntryTimestamp: item.OriginalEntryTimestamp,
      OriginatingSystemID: item.OriginatingSystemID
    }));

    // Apply field selection
    if (oDataParams.select) {
      responseData = applyODataSelect(responseData, oDataParams.select);
    }

    // Build RESO-compliant response
    const response = {
      '@odata.context': `${req.headers.host || 'localhost'}/api/reso/$metadata#Media`,
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
    console.error('❌ RESO Media endpoint error:', error);
    
    res.status(500).json(resoError(
      'InternalServerError',
      'Failed to retrieve media data',
      error.message
    ));
  }
}