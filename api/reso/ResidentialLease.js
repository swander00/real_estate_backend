// api/reso/ResidentialLease.js - RESO Residential Lease Resource Endpoint
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
  
  // Handle ListingKey filter (common for property type queries)
  const listingKeyMatch = filterString.match(/ListingKey\s+eq\s+'([^']+)'/i);
  if (listingKeyMatch) {
    return query.eq('ListingKey', listingKeyMatch[1]);
  }
  
  // Handle Furnished filter
  const furnishedMatch = filterString.match(/Furnished\s+eq\s+'([^']+)'/i);
  if (furnishedMatch) {
    return query.eq('Furnished', furnishedMatch[1]);
  }
  
  // Handle RentIncludes contains
  const rentIncludesMatch = filterString.match(/contains\(RentIncludes,\s*'([^']+)'\)/i);
  if (rentIncludesMatch) {
    return query.ilike('RentIncludes', `%${rentIncludesMatch[1]}%`);
  }
  
  // Handle specific rent includes filters
  const utilitiesMatch = filterString.match(/contains\(RentIncludes,\s*'(utilities|hydro|electricity|gas|water)'\)/i);
  if (utilitiesMatch) {
    return query.ilike('RentIncludes', `%${utilitiesMatch[1]}%`);
  }
  
  const parkingMatch = filterString.match(/contains\(RentIncludes,\s*'parking'\)/i);
  if (parkingMatch) {
    return query.ilike('RentIncludes', '%parking%');
  }
  
  const petMatch = filterString.match(/contains\(RentIncludes,\s*'pet'\)/i);
  if (petMatch) {
    return query.ilike('RentIncludes', '%pet%');
  }
  
  console.warn(`Unsupported ResidentialLease OData filter: ${filterString}`);
  return query;
}

function applyODataOrderBy(query, orderbyString) {
  if (!orderbyString) {
    // Default ordering: ListingKey asc
    return query.order('ListingKey', { ascending: true });
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
    
    console.log('🔍 RESO ResidentialLease Query:', {
      filter: oDataParams.filter,
      select: oDataParams.select,
      orderby: oDataParams.orderby,
      top: oDataParams.top,
      skip: oDataParams.skip,
      count: oDataParams.count
    });

    // Build Supabase query for residential_lease table
    let query = supabase.from('residential_lease').select('*');
    
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
      console.error('❌ RESO ResidentialLease query error:', error);
      return res.status(400).json(resoError('BadRequest', 'Invalid query parameters', error.message));
    }

    // Transform data to RESO ResidentialLease format
    let responseData = (data || []).map(item => ({
      ListingKey: item.ListingKey,
      Furnished: item.Furnished,
      RentIncludes: Array.isArray(item.RentIncludes) ? item.RentIncludes.join(', ') : item.RentIncludes,
      SystemModificationTimestamp: item.SystemModificationTimestamp,
      
      // Additional lease-specific fields that might be in your data
      LeaseRenewalCompensation: item.LeaseRenewalCompensation,
      LeaseTerm: item.LeaseTerm,
      LeaseType: item.LeaseType,
      PetPolicy: item.PetPolicy,
      SecurityDeposit: item.SecurityDeposit,
      UtilitiesAndAppliances: item.UtilitiesAndAppliances
    }));

    // Apply field selection
    if (oDataParams.select) {
      responseData = applyODataSelect(responseData, oDataParams.select);
    }

    // Build RESO-compliant response
    const response = {
      '@odata.context': `${req.headers.host || 'localhost'}/api/reso/$metadata#ResidentialLease`,
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
    console.error('❌ RESO ResidentialLease endpoint error:', error);
    
    res.status(500).json(resoError(
      'InternalServerError',
      'Failed to retrieve residential lease data',
      error.message
    ));
  }
}