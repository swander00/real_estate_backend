// api/reso/Property.js - RESO Web API Property Resource Endpoint
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// OData query parameter parser
function parseODataParams(query) {
  const params = {
    filter: query.$filter || null,
    select: query.$select ? query.$select.split(',').map(f => f.trim()) : null,
    orderby: query.$orderby || null,
    top: query.$top ? Math.min(parseInt(query.$top), 10000) : 1000, // Max 10k records
    skip: query.$skip ? parseInt(query.$skip) : 0,
    count: query.$count === 'true',
    expand: query.$expand ? query.$expand.split(',').map(f => f.trim()) : null
  };
  
  return params;
}

// Convert OData $filter to Supabase query conditions
function applyODataFilter(query, filterString) {
  if (!filterString) return query;
  
  // Basic OData filter parsing (simplified for common cases)
  // Real implementation would need full OData parser
  
  // Handle simple equality filters: field eq 'value'
  const eqMatch = filterString.match(/(\w+)\s+eq\s+'([^']+)'/i);
  if (eqMatch) {
    const [, field, value] = eqMatch;
    return query.eq(field, value);
  }
  
  // Handle numeric comparisons: field gt 100000
  const gtMatch = filterString.match(/(\w+)\s+gt\s+(\d+)/i);
  if (gtMatch) {
    const [, field, value] = gtMatch;
    return query.gt(field, parseInt(value));
  }
  
  const ltMatch = filterString.match(/(\w+)\s+lt\s+(\d+)/i);
  if (ltMatch) {
    const [, field, value] = ltMatch;
    return query.lt(field, parseInt(value));
  }
  
  // Handle LIKE/contains: contains(field, 'value')
  const containsMatch = filterString.match(/contains\((\w+),\s*'([^']+)'\)/i);
  if (containsMatch) {
    const [, field, value] = containsMatch;
    return query.ilike(field, `%${value}%`);
  }
  
  // Handle startswith: startswith(field, 'value')
  const startswithMatch = filterString.match(/startswith\((\w+),\s*'([^']+)'\)/i);
  if (startswithMatch) {
    const [, field, value] = startswithMatch;
    return query.ilike(field, `${value}%`);
  }
  
  // Handle date filters: field ge datetime'2024-01-01T00:00:00Z'
  const dateMatch = filterString.match(/(\w+)\s+(ge|le|gt|lt)\s+datetime'([^']+)'/i);
  if (dateMatch) {
    const [, field, operator, dateValue] = dateMatch;
    const date = new Date(dateValue).toISOString();
    
    switch (operator.toLowerCase()) {
      case 'ge': return query.gte(field, date);
      case 'le': return query.lte(field, date);
      case 'gt': return query.gt(field, date);
      case 'lt': return query.lt(field, date);
    }
  }
  
  console.warn(`Unsupported OData filter: ${filterString}`);
  return query;
}

// Apply OData $orderby
function applyODataOrderBy(query, orderbyString) {
  if (!orderbyString) return query.order('ModificationTimestamp', { ascending: false });
  
  // Parse: "field asc" or "field desc" or just "field" (defaults to asc)
  const orderParts = orderbyString.split(',').map(part => part.trim());
  
  for (const part of orderParts) {
    const [field, direction = 'asc'] = part.split(/\s+/);
    const ascending = direction.toLowerCase() === 'asc';
    query = query.order(field, { ascending });
  }
  
  return query;
}

// Apply OData $select
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

// RESO-compliant error response
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
  // Only allow GET requests for RESO compliance
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
    
    console.log('🔍 RESO Property Query:', {
      filter: oDataParams.filter,
      select: oDataParams.select,
      orderby: oDataParams.orderby,
      top: oDataParams.top,
      skip: oDataParams.skip,
      count: oDataParams.count
    });

    // Build Supabase query
    let query = supabase.from('common_fields').select('*');
    
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
      console.error('❌ RESO Property query error:', error);
      return res.status(400).json(resoError('BadRequest', 'Invalid query parameters', error.message));
    }

    // Apply field selection
    let responseData = data || [];
    if (oDataParams.select) {
      responseData = applyODataSelect(responseData, oDataParams.select);
    }

    // Build RESO-compliant response
    const response = {
      '@odata.context': `${req.headers.host || 'localhost'}/api/reso/$metadata#Property`,
      '@odata.count': oDataParams.count ? (count || responseData.length) : undefined,
      value: responseData
    };

    // Add pagination links if needed
    if (responseData.length === oDataParams.top) {
      const nextSkip = oDataParams.skip + oDataParams.top;
      const baseUrl = `${req.protocol || 'https'}://${req.headers.host}${req.url.split('?')[0]}`;
      
      // Preserve original query parameters for next link
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
    console.error('❌ RESO Property endpoint error:', error);
    
    res.status(500).json(resoError(
      'InternalServerError',
      'Failed to retrieve property data',
      error.message
    ));
  }
}