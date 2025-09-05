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
 * Parse $filter parameter with support for complex expressions
 * @param {string} filterParam - Raw $filter value
 * @returns {Object} Parsed filter object
 */
function parseFilter(filterParam) {
  if (!filterParam) return null;
  
  try {
    // Parse complex filter expressions with AND, OR, parentheses
    const parsed = parseComplexFilter(filterParam);
    
    return {
      type: 'complex',
      expression: filterParam,
      parsed: parsed
    };
    
  } catch (error) {
    console.warn(`Filter parsing warning: ${error.message}`);
    
    // Fallback to simple parsing for backward compatibility
    return parseSimpleFilter(filterParam);
  }
}

/**
 * Parse complex filter expressions with AND, OR, parentheses
 * @param {string} filterParam - Raw $filter value
 * @returns {Object} Parsed filter AST
 */
function parseComplexFilter(filterParam) {
  // Tokenize the filter expression
  const tokens = tokenizeFilter(filterParam);
  
  // Parse the tokens into an AST
  const ast = parseFilterAST(tokens);
  
  return ast;
}

/**
 * Tokenize filter expression into tokens
 * @param {string} expression - Filter expression
 * @returns {Array} Array of tokens
 */
function tokenizeFilter(expression) {
  const tokens = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    
    if (!inQuotes) {
      if (char === "'" || char === '"') {
        if (current.trim()) {
          tokens.push({ type: 'identifier', value: current.trim() });
          current = '';
        }
        inQuotes = true;
        quoteChar = char;
        current = char;
      } else if (char === '(') {
        if (current.trim()) {
          tokens.push({ type: 'identifier', value: current.trim() });
          current = '';
        }
        tokens.push({ type: 'lparen', value: '(' });
      } else if (char === ')') {
        if (current.trim()) {
          tokens.push({ type: 'identifier', value: current.trim() });
          current = '';
        }
        tokens.push({ type: 'rparen', value: ')' });
      } else if (char === ' ') {
        if (current.trim()) {
          tokens.push({ type: 'identifier', value: current.trim() });
          current = '';
        }
      } else {
        current += char;
      }
    } else {
      current += char;
      if (char === quoteChar && expression[i-1] !== '\\') {
        tokens.push({ type: 'string', value: current });
        current = '';
        inQuotes = false;
        quoteChar = '';
      }
    }
  }
  
  if (current.trim()) {
    tokens.push({ type: 'identifier', value: current.trim() });
  }
  
  return tokens;
}

/**
 * Parse tokens into Abstract Syntax Tree
 * @param {Array} tokens - Array of tokens
 * @returns {Object} Filter AST
 */
function parseFilterAST(tokens) {
  let index = 0;
  
  function parseExpression() {
    return parseOrExpression();
  }
  
  function parseOrExpression() {
    let left = parseAndExpression();
    
    while (index < tokens.length && tokens[index].value.toLowerCase() === 'or') {
      index++; // consume 'or'
      const right = parseAndExpression();
      left = {
        type: 'logical',
        operator: 'or',
        left: left,
        right: right
      };
    }
    
    return left;
  }
  
  function parseAndExpression() {
    let left = parseComparison();
    
    while (index < tokens.length && tokens[index].value.toLowerCase() === 'and') {
      index++; // consume 'and'
      const right = parseComparison();
      left = {
        type: 'logical',
        operator: 'and',
        left: left,
        right: right
      };
    }
    
    return left;
  }
  
  function parseComparison() {
    if (index < tokens.length && tokens[index].type === 'lparen') {
      index++; // consume '('
      const expr = parseExpression();
      if (index < tokens.length && tokens[index].type === 'rparen') {
        index++; // consume ')'
        return expr;
      } else {
        throw new Error('Expected closing parenthesis');
      }
    }
    
    return parseSimpleComparison();
  }
  
  function parseSimpleComparison() {
    if (index >= tokens.length) {
      throw new Error('Unexpected end of expression');
    }
    
    const firstToken = tokens[index++];
    if (firstToken.type !== 'identifier') {
      throw new Error('Expected field name or function');
    }
    
    // Check if this is a function call like contains(field, 'value')
    if (index < tokens.length && tokens[index].type === 'lparen') {
      return parseFunctionCall(firstToken.value);
    }
    
    // This is a field name, continue with normal comparison
    const field = firstToken;
    
    if (index >= tokens.length) {
      throw new Error('Expected operator');
    }
    
    const operator = tokens[index++];
    if (operator.type !== 'identifier') {
      throw new Error('Expected operator');
    }
    
    if (index >= tokens.length) {
      throw new Error('Expected value');
    }
    
    const value = tokens[index++];
    
    // Handle in/not in operators
    if (operator.value.toLowerCase() === 'in' && value.type === 'lparen') {
      return parseInExpression(field.value, 'in');
    }
    
    if (operator.value.toLowerCase() === 'not' && value.value.toLowerCase() === 'in' && index < tokens.length && tokens[index].type === 'lparen') {
      index++; // consume '('
      return parseInExpression(field.value, 'not in');
    }
    
    // Handle null checks
    if (operator.value.toLowerCase() === 'is' && value.value.toLowerCase() === 'null') {
      return {
        type: 'comparison',
        field: field.value,
        operator: 'is null',
        value: null
      };
    }
    
    if (operator.value.toLowerCase() === 'is' && value.value.toLowerCase() === 'not' && 
        index < tokens.length && tokens[index].value.toLowerCase() === 'null') {
      index++; // consume 'null'
      return {
        type: 'comparison',
        field: field.value,
        operator: 'is not null',
        value: null
      };
    }
    
    // Parse value based on type
    let parsedValue = value.value;
    if (value.type === 'string') {
      // Remove quotes
      parsedValue = value.value.slice(1, -1);
    } else if (value.type === 'identifier') {
      // Try to parse as number
      const numValue = parseFloat(value.value);
      if (!isNaN(numValue)) {
        parsedValue = numValue;
      }
    }
    
    return {
      type: 'comparison',
      field: field.value,
      operator: operator.value.toLowerCase(),
      value: parsedValue
    };
  }
  
  function parseFunctionCall(functionName) {
    if (index >= tokens.length || tokens[index].type !== 'lparen') {
      throw new Error('Expected opening parenthesis for function call');
    }
    index++; // consume '('
    
    const args = [];
    while (index < tokens.length && tokens[index].type !== 'rparen') {
      if (tokens[index].type === 'string') {
        args.push(tokens[index].value.slice(1, -1)); // Remove quotes
      } else if (tokens[index].type === 'identifier') {
        args.push(tokens[index].value);
      }
      index++;
      
      if (index < tokens.length && tokens[index].value === ',') {
        index++; // consume comma
      }
    }
    
    if (index >= tokens.length || tokens[index].type !== 'rparen') {
      throw new Error('Expected closing parenthesis for function call');
    }
    index++; // consume ')'
    
    return {
      type: 'function',
      function: functionName.toLowerCase(),
      field: args[0] || '', // First argument is usually the field name
      args: args
    };
  }
  
  function parseInExpression(fieldName, operator) {
    // The opening parenthesis should already be consumed by the caller
    // or we need to consume it here if it wasn't
    if (index < tokens.length && tokens[index].type === 'lparen') {
      index++; // consume '('
    }
    
    const values = [];
    while (index < tokens.length && tokens[index].type !== 'rparen') {
      if (tokens[index].type === 'string') {
        values.push(tokens[index].value.slice(1, -1)); // Remove quotes
      } else if (tokens[index].type === 'identifier') {
        values.push(tokens[index].value);
      }
      index++;
      
      if (index < tokens.length && tokens[index].value === ',') {
        index++; // consume comma
      }
    }
    
    if (index >= tokens.length || tokens[index].type !== 'rparen') {
      throw new Error('Expected closing parenthesis for in expression');
    }
    index++; // consume ')'
    
    return {
      type: 'in',
      field: fieldName,
      operator: operator.toLowerCase(),
      values: values
    };
  }
  
  return parseExpression();
}

/**
 * Parse simple filter for backward compatibility
 * @param {string} filterParam - Raw $filter value
 * @returns {Object} Parsed filter object
 */
function parseSimpleFilter(filterParam) {
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
      return filter;
    }
    
    // Simple comparison filters: field gt/lt/ge/le value
    const compMatch = filterParam.match(/(\w+)\s+(gt|lt|ge|le)\s+(\d+)/);
    if (compMatch) {
      filter.parsed = {
        type: compMatch[2],
        field: compMatch[1],
        value: parseInt(compMatch[3])
      };
      return filter;
    }
    
    // Contains filters: contains(field, 'value')
    const containsMatch = filterParam.match(/contains\((\w+),\s*['"]([^'"]+)['"]\)/);
    if (containsMatch) {
      filter.parsed = {
        type: 'contains',
        field: containsMatch[1],
        value: containsMatch[2]
      };
      return filter;
    }
    
  } catch (error) {
    console.warn(`Simple filter parsing warning: ${error.message}`);
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
  
  // Apply $filter (enhanced implementation)
  if (parsedQuery.filter && parsedQuery.filter.parsed) {
    query = applyFilterToSupabase(query, parsedQuery.filter.parsed);
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
 * Apply filter AST to Supabase query builder
 * @param {Object} query - Supabase query builder instance
 * @param {Object} filterAST - Parsed filter AST
 * @returns {Object} Modified Supabase query
 */
function applyFilterToSupabase(query, filterAST) {
  if (!filterAST) return query;
  
  switch (filterAST.type) {
    case 'comparison':
      return applyComparisonFilter(query, filterAST);
    
    case 'logical':
      return applyLogicalFilter(query, filterAST);
    
    case 'function':
      return applyFunctionFilter(query, filterAST);
    
    case 'in':
      return applyInFilter(query, filterAST);
    
    default:
      // Fallback for simple filters
      if (filterAST.type && filterAST.field && filterAST.value !== undefined) {
        return applySimpleFilter(query, filterAST);
      }
      return query;
  }
}

/**
 * Apply comparison filter to Supabase query
 * @param {Object} query - Supabase query builder instance
 * @param {Object} comparison - Comparison filter AST
 * @returns {Object} Modified Supabase query
 */
function applyComparisonFilter(query, comparison) {
  const { field, operator, value } = comparison;
  
  switch (operator) {
    case 'eq':
      return query.eq(field, value);
    case 'ne':
      return query.neq(field, value);
    case 'gt':
      return query.gt(field, value);
    case 'lt':
      return query.lt(field, value);
    case 'ge':
      return query.gte(field, value);
    case 'le':
      return query.lte(field, value);
    case 'is null':
      return query.is(field, null);
    case 'is not null':
      return query.not(field, 'is', null);
    default:
      console.warn(`Unsupported comparison operator: ${operator}`);
      return query;
  }
}

/**
 * Apply logical filter (AND/OR) to Supabase query
 * @param {Object} query - Supabase query builder instance
 * @param {Object} logical - Logical filter AST
 * @returns {Object} Modified Supabase query
 */
function applyLogicalFilter(query, logical) {
  const { operator, left, right } = logical;
  
  if (operator === 'and') {
    // For AND operations, we can chain multiple filters
    query = applyFilterToSupabase(query, left);
    query = applyFilterToSupabase(query, right);
    return query;
  } else if (operator === 'or') {
    // For OR operations, we need to use Supabase's or() method
    const leftCondition = buildSupabaseCondition(left);
    const rightCondition = buildSupabaseCondition(right);
    
    if (leftCondition && rightCondition) {
      return query.or(`${leftCondition},${rightCondition}`);
    }
  }
  
  return query;
}

/**
 * Build Supabase condition string from filter AST
 * @param {Object} filterAST - Filter AST
 * @returns {string} Supabase condition string
 */
function buildSupabaseCondition(filterAST) {
  if (!filterAST) return '';
  
  switch (filterAST.type) {
    case 'comparison':
      return buildComparisonCondition(filterAST);
    case 'function':
      return buildFunctionCondition(filterAST);
    case 'in':
      return buildInCondition(filterAST);
    default:
      return '';
  }
}

/**
 * Build comparison condition string
 * @param {Object} comparison - Comparison filter AST
 * @returns {string} Supabase condition string
 */
function buildComparisonCondition(comparison) {
  const { field, operator, value } = comparison;
  
  switch (operator) {
    case 'eq':
      return `${field}.eq.${typeof value === 'string' ? `"${value}"` : value}`;
    case 'ne':
      return `${field}.neq.${typeof value === 'string' ? `"${value}"` : value}`;
    case 'gt':
      return `${field}.gt.${value}`;
    case 'lt':
      return `${field}.lt.${value}`;
    case 'ge':
      return `${field}.gte.${value}`;
    case 'le':
      return `${field}.lte.${value}`;
    case 'is null':
      return `${field}.is.null`;
    case 'is not null':
      return `${field}.not.is.null`;
    default:
      return '';
  }
}

/**
 * Build function condition string
 * @param {Object} func - Function filter AST
 * @returns {string} Supabase condition string
 */
function buildFunctionCondition(func) {
  const { function: funcName, field, args } = func;
  
  switch (funcName) {
    case 'contains':
      if (args.length > 0) {
        return `${field}.ilike.%${args[0]}%`;
      }
      break;
    case 'startswith':
      if (args.length > 0) {
        return `${field}.ilike.${args[0]}%`;
      }
      break;
    case 'endswith':
      if (args.length > 0) {
        return `${field}.ilike.%${args[0]}`;
      }
      break;
    default:
      console.warn(`Unsupported function: ${funcName}`);
  }
  
  return '';
}

/**
 * Build IN condition string
 * @param {Object} inFilter - IN filter AST
 * @returns {string} Supabase condition string
 */
function buildInCondition(inFilter) {
  const { field, operator, values } = inFilter;
  
  if (operator === 'in') {
    const valueList = values.map(v => typeof v === 'string' ? `"${v}"` : v).join(',');
    return `${field}.in.(${valueList})`;
  } else if (operator === 'not in') {
    const valueList = values.map(v => typeof v === 'string' ? `"${v}"` : v).join(',');
    return `${field}.not.in.(${valueList})`;
  }
  
  return '';
}

/**
 * Apply function filter to Supabase query
 * @param {Object} query - Supabase query builder instance
 * @param {Object} func - Function filter AST
 * @returns {Object} Modified Supabase query
 */
function applyFunctionFilter(query, func) {
  const { function: funcName, field, args } = func;
  
  switch (funcName) {
    case 'contains':
      if (args.length > 0) {
        return query.ilike(field, `%${args[0]}%`);
      }
      break;
    case 'startswith':
      if (args.length > 0) {
        return query.ilike(field, `${args[0]}%`);
      }
      break;
    case 'endswith':
      if (args.length > 0) {
        return query.ilike(field, `%${args[0]}`);
      }
      break;
    default:
      console.warn(`Unsupported function: ${funcName}`);
  }
  
  return query;
}

/**
 * Apply IN filter to Supabase query
 * @param {Object} query - Supabase query builder instance
 * @param {Object} inFilter - IN filter AST
 * @returns {Object} Modified Supabase query
 */
function applyInFilter(query, inFilter) {
  const { field, operator, values } = inFilter;
  
  if (operator === 'in') {
    return query.in(field, values);
  } else if (operator === 'not in') {
    return query.not(field, 'in', values);
  }
  
  return query;
}

/**
 * Apply simple filter (backward compatibility)
 * @param {Object} query - Supabase query builder instance
 * @param {Object} filter - Simple filter object
 * @returns {Object} Modified Supabase query
 */
function applySimpleFilter(query, filter) {
  const { type, field, value } = filter;
  
  switch (type) {
    case 'eq':
      return query.eq(field, value);
    case 'gt':
      return query.gt(field, value);
    case 'lt':
      return query.lt(field, value);
    case 'ge':
      return query.gte(field, value);
    case 'le':
      return query.lte(field, value);
    case 'contains':
      return query.ilike(field, `%${value}%`);
    default:
      return query;
  }
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

/**
 * Parse $search parameter (OData 4.0 feature)
 * @param {string} searchParam - Raw $search value
 * @returns {Object} Parsed search object
 */
export function parseSearch(searchParam) {
  if (!searchParam) return null;
  
  return {
    type: 'search',
    value: searchParam,
    fields: [] // Will be populated based on resource type
  };
}

/**
 * Parse $format parameter
 * @param {string} formatParam - Raw $format value
 * @returns {string} Parsed format
 */
export function parseFormat(formatParam) {
  if (!formatParam) return 'json';
  
  const supportedFormats = ['json', 'xml', 'atom'];
  const format = formatParam.toLowerCase();
  
  if (supportedFormats.includes(format)) {
    return format;
  }
  
  return 'json'; // Default fallback
}

/**
 * Parse $apply parameter (OData 4.0 aggregation)
 * @param {string} applyParam - Raw $apply value
 * @returns {Object} Parsed apply object
 */
export function parseApply(applyParam) {
  if (!applyParam) return null;
  
  // Basic implementation - can be enhanced for complex aggregations
  const transformations = applyParam.split('/').map(transform => {
    const trimmed = transform.trim();
    
    // Group by transformation
    if (trimmed.startsWith('groupby(')) {
      const fields = trimmed.slice(8, -1).split(',').map(f => f.trim());
      return {
        type: 'groupby',
        fields: fields
      };
    }
    
    // Aggregate transformation
    if (trimmed.startsWith('aggregate(')) {
      const aggregates = trimmed.slice(10, -1).split(',').map(a => {
        const parts = a.trim().split(' with ');
        return {
          field: parts[0],
          function: parts[1] || 'count'
        };
      });
      return {
        type: 'aggregate',
        aggregates: aggregates
      };
    }
    
    return {
      type: 'unknown',
      value: trimmed
    };
  });
  
  return {
    type: 'apply',
    transformations: transformations
  };
}

/**
 * Validate field names against allowed fields
 * @param {Array} fields - Array of field names
 * @param {Array} allowedFields - Array of allowed field names
 * @returns {Object} Validation result
 */
export function validateFields(fields, allowedFields) {
  if (!allowedFields || allowedFields.length === 0) {
    return { valid: true, invalidFields: [] };
  }
  
  const invalidFields = fields.filter(field => !allowedFields.includes(field));
  
  return {
    valid: invalidFields.length === 0,
    invalidFields: invalidFields,
    validFields: fields.filter(field => allowedFields.includes(field))
  };
}

/**
 * Create OData response with proper formatting
 * @param {Array} data - Response data
 * @param {Object} options - Response options
 * @returns {Object} OData-formatted response
 */
export function createODataResponse(data, options = {}) {
  const {
    context = '$metadata#EntitySet',
    count = null,
    nextLink = null,
    format = 'json'
  } = options;
  
  const response = {
    '@odata.context': context,
    value: data
  };
  
  if (count !== null) {
    response['@odata.count'] = count;
  }
  
  if (nextLink) {
    response['@odata.nextLink'] = nextLink;
  }
  
  return response;
}

/**
 * Generate next link for pagination
 * @param {Object} queryParams - Original query parameters
 * @param {number} currentSkip - Current skip value
 * @param {number} top - Top value
 * @param {string} baseUrl - Base URL for the endpoint
 * @returns {string} Next link URL
 */
export function generateNextLink(queryParams, currentSkip, top, baseUrl) {
  const nextSkip = currentSkip + top;
  const newParams = { ...queryParams };
  newParams.$skip = nextSkip;
  
  const paramString = Object.entries(newParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  return `${baseUrl}?${paramString}`;
}
