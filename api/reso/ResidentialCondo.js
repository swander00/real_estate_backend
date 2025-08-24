// api/reso/ResidentialCondo.js - RESO Residential Condo Resource Endpoint
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
  
  // Handle UnitNumber filter
  const unitNumberMatch = filterString.match(/UnitNumber\s+eq\s+'([^']+)'/i);
  if (unitNumberMatch) {
    return query.eq('UnitNumber', unitNumberMatch[1]);
  }
  
  // Handle UnitNumber contains
  const unitContainsMatch = filterString.match(/contains\(UnitNumber,\s*'([^']+)'\)/i);
  if (unitContainsMatch) {
    return query.ilike('UnitNumber', `%${unitContainsMatch[1]}%`);
  }
  
  // Handle AssociationFee filters
  const feeMatch = filterString.match(/AssociationFee\s+(gt|lt|ge|le)\s+(\d+\.?\d*)/i);
  if (feeMatch) {
    const [, operator, value] = feeMatch;
    const numValue = parseFloat(value);
    
    switch (operator.toLowerCase()) {
      case 'gt': return query.gt('AssociationFee', numValue);
      case 'lt': return query.lt('AssociationFee', numValue);
      case 'ge': return query.gte('AssociationFee', numValue);
      case 'le': return query.lte('AssociationFee', numValue);
    }
  }
  
  // Handle BalconyType filter
  const balconyMatch = filterString.match(/BalconyType\s+eq\s+'([^']+)'/i);
  if (balconyMatch) {
    return query.eq('BalconyType', balconyMatch[1]);
  }
  
  // Handle Locker filter (Yes/No)
  const lockerMatch = filterString.match(/Locker\s+eq\s+'([^']+)'/i);
  if (lockerMatch) {
    return query.eq('Locker', lockerMatch[1]);
  }
  
  // Handle PetsAllowed contains
  const petsMatch = filterString.match(/contains\(PetsAllowed,\s*'([^']+)'\)/i);
  if (petsMatch) {
    return query.ilike('PetsAllowed', `%${petsMatch[1]}%`);
  }
  
  // Handle AssociationAmenities contains
  const amenitiesMatch = filterString.match(/contains\(AssociationAmenities,\s*'([^']+)'\)/i);
  if (amenitiesMatch) {
    return query.ilike('AssociationAmenities', `%${amenitiesMatch[1]}%`);
  }
  
  // Handle AssociationFeeIncludes contains
  const feeIncludesMatch = filterString.match(/contains\(AssociationFeeIncludes,\s*'([^']+)'\)/i);
  if (feeIncludesMatch) {
    return query.ilike('AssociationFeeIncludes', `%${feeIncludesMatch[1]}%`);
  }
  
  console.warn(`Unsupported ResidentialCondo OData filter: ${filterString}`);
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
    
    console.log('🔍 RESO ResidentialCondo Query:', {
      filter: oDataParams.filter,
      select: oDataParams.select,
      orderby: oDataParams.orderby,
      top: oDataParams.top,
      skip: oDataParams.skip,
      count: oDataParams.count
    });

    // Build Supabase query for residential_condo table
    let query = supabase.from('residential_condo').select('*');
    
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
      console.error('❌ RESO ResidentialCondo query error:', error);
      return res.status(400).json(resoError('BadRequest', 'Invalid query parameters', error.message));
    }

    // Transform data to RESO ResidentialCondo format
    let responseData = (data || []).map(item => ({
      ListingKey: item.ListingKey,
      UnitNumber: item.UnitNumber,
      AssociationAmenities: item.AssociationAmenities,
      AssociationFee: item.AssociationFee,
      AssociationFeeIncludes: item.AssociationFeeIncludes,
      BalconyType: item.BalconyType,
      Locker: item.Locker,
      PetsAllowed: item.PetsAllowed,
      SystemModificationTimestamp: item.SystemModificationTimestamp
    }));

    // Apply field selection
    if (oDataParams.select) {
      responseData = applyODataSelect(responseData, oDataParams.select);
    }

    // Build RESO-compliant response
    const response = {
      '@odata.context': `${req.headers.host || 'localhost'}/api/reso/$metadata#ResidentialCondo`,
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
    console.error('❌ RESO ResidentialCondo endpoint error:', error);
    
    res.status(500).json(resoError(
      'InternalServerError',
      'Failed to retrieve residential condo data',
      error.message
    ));
  }
}