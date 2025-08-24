// api/reso/OpenHouse.js - RESO Web API OpenHouse Resource Endpoint
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
  
  // Handle ListingKey filter (common for open house queries)
  const listingKeyMatch = filterString.match(/ListingKey\s+eq\s+'([^']+)'/i);
  if (listingKeyMatch) {
    return query.eq('ListingKey', listingKeyMatch[1]);
  }
  
  // Handle OpenHouseStatus filter
  const statusMatch = filterString.match(/OpenHouseStatus\s+eq\s+'([^']+)'/i);
  if (statusMatch) {
    return query.eq('OpenHouseStatus', statusMatch[1]);
  }
  
  // Handle OpenHouseType filter
  const typeMatch = filterString.match(/OpenHouseType\s+eq\s+'([^']+)'/i);
  if (typeMatch) {
    return query.eq('OpenHouseType', typeMatch[1]);
  }
  
  // Handle date range filters for OpenHouseDate
  const dateMatch = filterString.match(/OpenHouseDate\s+(ge|le|gt|lt)\s+datetime'([^']+)'/i);
  if (dateMatch) {
    const [, operator, dateValue] = dateMatch;
    const date = new Date(dateValue).toISOString().split('T')[0]; // Convert to date only
    
    switch (operator.toLowerCase()) {
      case 'ge': return query.gte('OpenHouseDate', date);
      case 'le': return query.lte('OpenHouseDate', date);
      case 'gt': return query.gt('OpenHouseDate', date);
      case 'lt': return query.lt('OpenHouseDate', date);
    }
  }
  
  // Handle date equality: OpenHouseDate eq datetime'2024-12-25T00:00:00Z'
  const dateEqMatch = filterString.match(/OpenHouseDate\s+eq\s+datetime'([^']+)'/i);
  if (dateEqMatch) {
    const date = new Date(dateEqMatch[1]).toISOString().split('T')[0];
    return query.eq('OpenHouseDate', date);
  }
  
  // Handle today's open houses: OpenHouseDate eq datetime'today'
  if (filterString.includes('today')) {
    const today = new Date().toISOString().split('T')[0];
    return query.eq('OpenHouseDate', today);
  }
  
  // Handle this weekend logic (Saturday and Sunday)
  if (filterString.includes('weekend') || filterString.includes('this weekend')) {
    const today = new Date();
    const saturday = new Date(today);
    const sunday = new Date(today);
    
    // Calculate next Saturday and Sunday
    saturday.setDate(today.getDate() + (6 - today.getDay()));
    sunday.setDate(saturday.getDate() + 1);
    
    return query
      .gte('OpenHouseDate', saturday.toISOString().split('T')[0])
      .lte('OpenHouseDate', sunday.toISOString().split('T')[0]);
  }
  
  console.warn(`Unsupported OpenHouse OData filter: ${filterString}`);
  return query;
}

function applyODataOrderBy(query, orderbyString) {
  if (!orderbyString) {
    // Default ordering: OpenHouseDate asc, OpenHouseStartTime asc
    return query
      .order('OpenHouseDate', { ascending: true, nullsFirst: false })
      .order('OpenHouseStartTime', { ascending: true, nullsFirst: false })
      .order('OpenHouseKey', { ascending: true });
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
    
    console.log('🔍 RESO OpenHouse Query:', {
      filter: oDataParams.filter,
      select: oDataParams.select,
      orderby: oDataParams.orderby,
      top: oDataParams.top,
      skip: oDataParams.skip,
      count: oDataParams.count
    });

    // Build Supabase query for property_openhouse table
    let query = supabase.from('property_openhouse').select('*');
    
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
      console.error('❌ RESO OpenHouse query error:', error);
      return res.status(400).json(resoError('BadRequest', 'Invalid query parameters', error.message));
    }

    // Transform data to RESO OpenHouse format
    let responseData = (data || []).map(item => ({
      OpenHouseKey: item.OpenHouseKey,
      ListingKey: item.ListingKey,
      OpenHouseId: item.OpenHouseId,
      OpenHouseDate: item.OpenHouseDate,
      OpenHouseStartTime: item.OpenHouseStartTime,
      OpenHouseEndTime: item.OpenHouseEndTime,
      OpenHouseStatus: item.OpenHouseStatus || 'Active',
      OpenHouseType: item.OpenHouseType || 'Public',
      OpenHouseRemarks: item.OpenHouseRemarks,
      ShowingContactName: item.ShowingContactName,
      ShowingContactPhone: item.ShowingContactPhone,
      ShowingContactPhoneExt: item.ShowingContactPhoneExt,
      ShowingContactEmail: item.ShowingContactEmail,
      ModificationTimestamp: item.ModificationTimestamp,
      OriginalEntryTimestamp: item.OriginalEntryTimestamp
    }));

    // Apply field selection
    if (oDataParams.select) {
      responseData = applyODataSelect(responseData, oDataParams.select);
    }

    // Build RESO-compliant response
    const response = {
      '@odata.context': `${req.headers.host || 'localhost'}/api/reso/$metadata#OpenHouse`,
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
    console.error('❌ RESO OpenHouse endpoint error:', error);
    
    res.status(500).json(resoError(
      'InternalServerError',
      'Failed to retrieve open house data',
      error.message
    ));
  }
}