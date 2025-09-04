/**
 * OData Query Parser for RESO Web API 2.0.0
 * Handles OData 4.0 query parameters and converts them to Supabase query builder
 */

/**
 * Parse OData query parameters and convert to Supabase query
 * @param {Object} queryParams - Raw query parameters from request
 * @param {Object} options - Parser options
 * @returns {Object} Parsed OData query with Supabase query builder
 */
export function parseODataQuery(queryParams, options = {}) {
  const {
    maxTop = 1000,
    maxSkip = 10000,
    allowedFields = [],
    allowedExpandFields = [],
    defaultOrderBy = 'ModificationTimestamp',
    defaultOrderDirection = 'desc'
  } = options;

  const result = {
    select: [],
    expand: [],
    filter: null,
    orderBy: [],
    top: 20,
    skip: 0,
    count: false,
    errors: [],
    warnings: []
  };

  try {
    // Parse $select parameter
    if (queryParams.$select) {
      result.select = parseSelect(queryParams.$select, allowedFields);
    }

    // Parse $expand parameter
    if (queryParams.$expand) {
      result.expand = parseExpand(queryParams.$expand, allowedExpandFields);
    }

    // Parse $filter parameter
    if (queryParams.$filter) {
      result.filter = parseFilter(queryParams.$filter);
    }

    // Parse $orderby parameter
    if (queryParams.$orderby) {
      result.orderBy = parseOrderBy(queryParams.$orderby);
    } else {
      // Default ordering
      result.orderBy = [{ field: defaultOrderBy, direction: defaultOrderDirection }];
    }

    // Parse $top parameter
    if (queryParams.$top) {
      const top = parseInt(queryParams.$top);
      if (isNaN(top) || top < 1) {
        result.errors.push('$top must be a positive integer');
      } else if (top > maxTop) {
        result.warnings.push(`$top value ${top} exceeds maximum ${maxTop}, using ${maxTop}`);
        result.top = maxTop;
      } else {
        result.top = top;
      }
    }

    // Parse $skip parameter
    if (queryParams.$skip) {
      const skip = parseInt(queryParams.$skip);
      if (isNaN(skip) || skip < 0) {
        result.errors.push('$skip must be a non-negative integer');
      } else if (skip > maxSkip) {
        result.warnings.push(`$skip value ${skip} exceeds maximum ${maxSkip}, using ${maxSkip}`);
        result.skip = maxSkip;
      } else {
        result.skip = skip;
      }
    }

    // Parse $count parameter
    if (queryParams.$count === 'true') {
      result.count = true;
    }

  } catch (error) {
    result.errors.push(`Query parsing error: ${error.message}`);
  }

  return result;
}

/**
 * Parse $select parameter
 * @param {string} selectParam - Raw $select value
 * @param {Array} allowedFields - List of allowed fields
 * @returns {Array} Array of selected fields
 */
function parseSelect(selectParam, allowedFields = []) {
  if (!selectParam) return [];
  
  const fields = selectParam.split(',').map(field => field.trim());
  
  // Validate fields if allowedFields is provided
  if (allowedFields.length > 0) {
    const validFields = fields.filter(field => allowedFields.includes(field));
    const invalidFields = fields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      console.warn(`Invalid fields in $select: ${invalidFields.join(', ')}`);
    }
    
    return validFields;
  }
  
  return fields;
}

/**
 * Parse $expand parameter
 * @param {string} expandParam - Raw $expand value
 * @param {Array} allowedExpandFields - List of allowed expand fields
 * @returns {Array} Array of expand relationships
 */
function parseExpand(expandParam, allowedExpandFields = []) {
  if (!expandParam) return [];
  
  const expands = expandParam.split(',').map(expand => expand.trim());
  
  // Validate expand fields if allowedExpandFields is provided
  if (allowedExpandFields.length > 0) {
    const validExpands = expands.filter(expand => allowedExpandFields.includes(expand));
    const invalidExpands = expands.filter(expand => !allowedExpandFields.includes(expand));
    
    if (invalidExpands.length > 0) {
      console.warn(`Invalid fields in $expand: ${invalidExpands.join(', ')}`);
    }
    
    return validExpands;
  }
  
  return expands;
}

/**
 * Parse $filter parameter (Basic implementation - can be enhanced)
 * @param {string} filterParam - Raw $filter value
 * @returns {Object} Parsed filter object
 */
function parseFilter(filterParam) {
  if (!filterParam) return null;
  
  // Basic filter parsing - this can be enhanced for complex expressions
  const filter = {
    type: 'simple',
    expression: filterParam,
    parsed: null
  };
  
  try {
    // Simple equality filters: field eq value
    const eqMatch = filterParam.match(/(\w+)\s+eq\s+['"]([^'"]+)['"]/);
    if (eqMatch) {
      filter.parsed = {
        type: 'eq',
        field: eqMatch[1],
        value: eqMatch[2]
      };
    }
    
    // Simple comparison filters: field gt/lt/ge/le value
    const compMatch = filterParam.match(/(\w+)\s+(gt|lt|ge|le)\s+(\d+)/);
    if (compMatch) {
      filter.parsed = {
        type: compMatch[2],
        field: compMatch[1],
        value: parseInt(compMatch[3])
      };
    }
    
    // Contains filters: contains(field, 'value')
    const containsMatch = filterParam.match(/contains\((\w+),\s*['"]([^'"]+)['"]\)/);
    if (containsMatch) {
      filter.parsed = {
        type: 'contains',
        field: containsMatch[1],
        value: containsMatch[2]
      };
    }
    
  } catch (error) {
    console.warn(`Filter parsing warning: ${error.message}`);
  }
  
  return filter;
}

/**
 * Parse $orderby parameter
 * @param {string} orderByParam - Raw $orderby value
 * @returns {Array} Array of order by objects
 */
function parseOrderBy(orderByParam) {
  if (!orderByParam) return [];
  
  return orderByParam.split(',').map(order => {
    const trimmed = order.trim();
    
    // Check for direction suffix (asc/desc)
    if (trimmed.endsWith(' desc')) {
      return {
        field: trimmed.slice(0, -5).trim(),
        direction: 'desc'
      };
    } else if (trimmed.endsWith(' asc')) {
      return {
        field: trimmed.slice(0, -4).trim(),
        direction: 'asc'
      };
    } else {
      return {
        field: trimmed,
        direction: 'asc' // Default to ascending
      };
    }
  });
}

/**
 * Apply parsed OData query to Supabase query builder
 * @param {Object} supabaseQuery - Supabase query builder instance
 * @param {Object} parsedQuery - Parsed OData query from parseODataQuery
 * @returns {Object} Modified Supabase query
 */
export function applyODataToSupabase(supabaseQuery, parsedQuery) {
  let query = supabaseQuery;
  
  // Apply $select
  if (parsedQuery.select.length > 0) {
    query = query.select(parsedQuery.select.join(', '));
  }
  
  // Apply $filter (basic implementation)
  if (parsedQuery.filter && parsedQuery.filter.parsed) {
    const filter = parsedQuery.filter.parsed;
    
    switch (filter.type) {
      case 'eq':
        query = query.eq(filter.field, filter.value);
        break;
      case 'gt':
        query = query.gt(filter.field, filter.value);
        break;
      case 'lt':
        query = query.lt(filter.field, filter.value);
        break;
      case 'ge':
        query = query.gte(filter.field, filter.value);
        break;
      case 'le':
        query = query.lte(filter.field, filter.value);
        break;
      case 'contains':
        query = query.ilike(filter.field, `%${filter.value}%`);
        break;
    }
  }
  
  // Apply $orderby
  if (parsedQuery.orderBy.length > 0) {
    parsedQuery.orderBy.forEach(order => {
      query = query.order(order.field, { ascending: order.direction === 'asc' });
    });
  }
  
  // Apply $top and $skip
  if (parsedQuery.top || parsedQuery.skip) {
    const start = parsedQuery.skip;
    const end = start + (parsedQuery.top - 1);
    query = query.range(start, end);
  }
  
  return query;
}

/**
 * Validate OData query parameters
 * @param {Object} queryParams - Query parameters to validate
 * @returns {Object} Validation result with errors and warnings
 */
export function validateODataQuery(queryParams) {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  // Check for unsupported parameters
  const supportedParams = ['$Select', '$Expand', '$Filter', '$Orderby', '$Top', '$Skip', '$Count'];
  const unsupportedParams = Object.keys(queryParams).filter(param => 
    param.startsWith('$') && !supportedParams.includes(param)
  );
  
  if (unsupportedParams.length > 0) {
    result.warnings.push(`Unsupported OData parameters: ${unsupportedParams.join(', ')}`);
  }
  
  // Validate $Top value
  if (queryParams.$Top) {
    const top = parseInt(queryParams.$Top);
    if (isNaN(top) || top < 1) {
      result.errors.push('$Top must be a positive integer');
      result.isValid = false;
    }
  }
  
  // Validate $Skip value
  if (queryParams.$Skip) {
    const skip = parseInt(queryParams.$Skip);
    if (isNaN(skip) || skip < 0) {
      result.errors.push('$Skip must be a non-negative integer');
      result.isValid = false;
    }
  }
  
  return result;
}

/**
 * Create OData error response
 * @param {Array} errors - Array of error messages
 * @param {Array} warnings - Array of warning messages
 * @returns {Object} OData-compliant error response
 */
export function createODataErrorResponse(errors = [], warnings = []) {
  return {
    error: {
      code: 'BadRequest',
      message: 'Invalid OData query',
      details: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  };
}
