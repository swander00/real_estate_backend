// api/reso/ResidentialFreehold.js - RESO Residential Freehold Resource Endpoint
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
  
  // Handle lot size filters
  const lotDepthMatch = filterString.match(/LotDepth\s+(gt|lt|ge|le)\s+(\d+\.?\d*)/i);
  if (lotDepthMatch) {
    const [, operator, value] = lotDepthMatch;
    const numValue = parseFloat(value);
    
    switch (operator.toLowerCase()) {
      case 'gt': return query.gt('LotDepth', numValue);
      case 'lt': return query.lt('LotDepth', numValue);
      case 'ge': return query.gte('LotDepth', numValue);
      case 'le': return query.lte('LotDepth', numValue);
    }
  }
  
  const lotWidthMatch = filterString.match(/LotWidth\s+(gt|lt|ge|le)\s+(\d+\.?\d*)/i);
  if (lotWidthMatch) {
    const [, operator, value] = lotWidthMatch;
    const numValue = parseFloat(value);
    
    switch (operator.toLowerCase()) {
      case 'gt': return query.gt('LotWidth', numValue);
      case 'lt': return query.lt('LotWidth', numValue);
      case 'ge': return query.gte('LotWidth', numValue);
      case 'le': return query.lte('LotWidth', numValue);
    }
  }
  
  // Handle lot size range filters
  const lotSizeMatch = filterString.match(/LotSizeRangeAcres\s+(gt|lt|ge|le)\s+(\d+\.?\d*)/i);
  if (lotSizeMatch) {
    const [, operator, value] = lotSizeMatch;
    const numValue = parseFloat(value);
    
    switch (operator.toLowerCase()) {
      case 'gt': return query.gt('LotSizeRangeAcres', numValue);
      case 'lt': return query.lt('LotSizeRangeAcres', numValue);
      case 'ge': return query.gte('LotSizeRangeAcres', numValue);
      case 'le': return query.lte('LotSizeRangeAcres', numValue);
    }
  }
  
  // Handle tax amount filters
  const taxMatch = filterString.match(/TaxAnnualAmount\s+(gt|lt|ge|le)\s+(\d+\.?\d*)/i);
  if (taxMatch) {
    const [, operator, value] = taxMatch;
    const numValue = parseFloat(value);
    
    switch (operator.toLowerCase()) {
      case 'gt': return query.gt('TaxAnnualAmount', numValue);
      case 'lt': return query.lt('TaxAnnualAmount', numValue);
      case 'ge': return query.gte('TaxAnnualAmount', numValue);
      case 'le': return query.lte('TaxAnnualAmount', numValue);
    }
  }
  
  // Handle tax year filters
  const taxYearMatch = filterString.match(/TaxYear\s+(eq|gt|lt|ge|le)\s+(\d{4})/i);
  if (taxYearMatch) {
    const [, operator, value] = taxYearMatch;
    const year = parseInt(value);
    
    switch (operator.toLowerCase()) {
      case 'eq': return query.eq('TaxYear', year);
      case 'gt': return query.gt('TaxYear', year);
      case 'lt': return query.lt('TaxYear', year);
      case 'ge': return query.gte('TaxYear', year);
      case 'le': return query.lte('TaxYear', year);
    }
  }
  
  // Handle approximate age filters
  const ageMatch = filterString.match(/ApproximateAge\s+(gt|lt|ge|le)\s+(\d+)/i);
  if (ageMatch) {
    const [, operator, value] = ageMatch;
    const age = parseInt(value);
    
    switch (operator.toLowerCase()) {
      case 'gt': return query.gt('ApproximateAge', age);
      case 'lt': return query.lt('ApproximateAge', age);
      case 'ge': return query.gte('ApproximateAge', age);
      case 'le': return query.lte('ApproximateAge', age);
    }
  }
  
  console.warn(`Unsupported ResidentialFreehold OData filter: ${filterString}`);
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
    
    console.log('🔍 RESO ResidentialFreehold Query:', {
      filter: oDataParams.filter,
      select: oDataParams.select,
      orderby: oDataParams.orderby,
      top: oDataParams.top,
      skip: oDataParams.skip,
      count: oDataParams.count
    });

    // Build Supabase query for residential_freehold table
    let query = supabase.from('residential_freehold').select('*');
    
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
      console.error('❌ RESO ResidentialFreehold query error:', error);
      return res.status(400).json(resoError('BadRequest', 'Invalid query parameters', error.message));
    }

    // Transform data to RESO ResidentialFreehold format
    let responseData = (data || []).map(item => ({
      ListingKey: item.ListingKey,
      LotDepth: item.LotDepth,
      LotWidth: item.LotWidth,
      LotSizeUnits: item.LotSizeUnits || 'SqFt',
      LotSizeRangeAcres: item.LotSizeRangeAcres,
      ApproximateAge: item.ApproximateAge,
      TaxAnnualAmount: item.TaxAnnualAmount,
      TaxYear: item.TaxYear,
      AdditionalMonthlyFee: item.AdditionalMonthlyFee,
      SystemModificationTimestamp: item.SystemModificationTimestamp
    }));

    // Apply field selection
    if (oDataParams.select) {
      responseData = applyODataSelect(responseData, oDataParams.select);
    }

    // Build RESO-compliant response
    const response = {
      '@odata.context': `${req.headers.host || 'localhost'}/api/reso/$metadata#ResidentialFreehold`,
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
    console.error('❌ RESO ResidentialFreehold endpoint error:', error);
    
    res.status(500).json(resoError(
      'InternalServerError',
      'Failed to retrieve residential freehold data',
      error.message
    ));
  }
}