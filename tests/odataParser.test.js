/**
 * OData Parser Test Suite
 * Tests the enhanced OData parser with complex query support
 */

import { 
  parseODataQuery, 
  applyODataToSupabase, 
  validateODataQuery,
  parseSearch,
  parseFormat,
  parseApply,
  validateFields,
  createODataResponse,
  generateNextLink
} from '../utils/odataParser.js';

// Mock Supabase query builder for testing
class MockSupabaseQuery {
  constructor() {
    this.operations = [];
    this.selectFields = null;
    this.rangeStart = null;
    this.rangeEnd = null;
  }

  select(fields) {
    this.selectFields = fields;
    return this;
  }

  eq(field, value) {
    this.operations.push({ type: 'eq', field, value });
    return this;
  }

  neq(field, value) {
    this.operations.push({ type: 'neq', field, value });
    return this;
  }

  gt(field, value) {
    this.operations.push({ type: 'gt', field, value });
    return this;
  }

  lt(field, value) {
    this.operations.push({ type: 'lt', field, value });
    return this;
  }

  gte(field, value) {
    this.operations.push({ type: 'gte', field, value });
    return this;
  }

  lte(field, value) {
    this.operations.push({ type: 'lte', field, value });
    return this;
  }

  ilike(field, pattern) {
    this.operations.push({ type: 'ilike', field, pattern });
    return this;
  }

  in(field, values) {
    this.operations.push({ type: 'in', field, values });
    return this;
  }

  not(field, operator, value) {
    this.operations.push({ type: 'not', field, operator, value });
    return this;
  }

  is(field, value) {
    this.operations.push({ type: 'is', field, value });
    return this;
  }

  or(condition) {
    this.operations.push({ type: 'or', condition });
    return this;
  }

  order(field, options) {
    this.operations.push({ type: 'order', field, options });
    return this;
  }

  range(start, end) {
    this.rangeStart = start;
    this.rangeEnd = end;
    return this;
  }
}

// Test helper functions
function createMockQuery() {
  return new MockSupabaseQuery();
}

function runTests() {
  console.log('🧪 Running OData Parser Tests...\n');

  let passed = 0;
  let failed = 0;

  function test(name, testFn) {
    try {
      testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  // Test 1: Simple filter parsing
  test('Simple equality filter', () => {
    const queryParams = { $filter: "City eq 'Toronto'" };
    const result = parseODataQuery(queryParams);
    
    if (!result.filter || !result.filter.parsed) {
      throw new Error('Filter not parsed');
    }
    
    const filter = result.filter.parsed;
    if (filter.type !== 'comparison' || filter.field !== 'City' || filter.operator !== 'eq' || filter.value !== 'Toronto') {
      throw new Error('Filter parsing incorrect');
    }
  });

  // Test 2: Complex AND filter
  test('Complex AND filter', () => {
    const queryParams = { $filter: "City eq 'Toronto' and ListPrice ge 500000" };
    const result = parseODataQuery(queryParams);
    
    if (!result.filter || !result.filter.parsed) {
      throw new Error('Filter not parsed');
    }
    
    const filter = result.filter.parsed;
    if (filter.type !== 'logical' || filter.operator !== 'and') {
      throw new Error('AND filter not parsed correctly');
    }
  });

  // Test 3: Complex OR filter
  test('Complex OR filter', () => {
    const queryParams = { $filter: "City eq 'Toronto' or City eq 'Vancouver'" };
    const result = parseODataQuery(queryParams);
    
    if (!result.filter || !result.filter.parsed) {
      throw new Error('Filter not parsed');
    }
    
    const filter = result.filter.parsed;
    if (filter.type !== 'logical' || filter.operator !== 'or') {
      throw new Error('OR filter not parsed correctly');
    }
  });

  // Test 4: Parentheses in filter
  test('Parentheses in filter', () => {
    const queryParams = { $filter: "(City eq 'Toronto' or City eq 'Vancouver') and ListPrice lt 1000000" };
    const result = parseODataQuery(queryParams);
    
    if (!result.filter || !result.filter.parsed) {
      throw new Error('Filter not parsed');
    }
    
    const filter = result.filter.parsed;
    if (filter.type !== 'logical' || filter.operator !== 'and') {
      throw new Error('Parentheses filter not parsed correctly');
    }
  });

  // Test 5: Contains function
  test('Contains function', () => {
    const queryParams = { $filter: "contains(PublicRemarks, 'pool')" };
    const result = parseODataQuery(queryParams);
    
    if (!result.filter || !result.filter.parsed) {
      throw new Error('Filter not parsed');
    }
    
    const filter = result.filter.parsed;
    if (filter.type !== 'function' || filter.function !== 'contains') {
      throw new Error('Contains function not parsed correctly');
    }
  });

  // Test 6: IN operator
  test('IN operator', () => {
    const queryParams = { $filter: "City in ('Toronto', 'Vancouver', 'Montreal')" };
    const result = parseODataQuery(queryParams);
    
    if (!result.filter || !result.filter.parsed) {
      throw new Error('Filter not parsed');
    }
    
    const filter = result.filter.parsed;
    if (filter.type !== 'in' || filter.operator !== 'in') {
      throw new Error('IN operator not parsed correctly');
    }
  });

  // Test 7: NULL checks
  test('NULL checks', () => {
    const queryParams = { $filter: "ClosePrice is null" };
    const result = parseODataQuery(queryParams);
    
    if (!result.filter || !result.filter.parsed) {
      throw new Error('Filter not parsed');
    }
    
    const filter = result.filter.parsed;
    if (filter.type !== 'comparison' || filter.operator !== 'is null') {
      throw new Error('NULL check not parsed correctly');
    }
  });

  // Test 8: Apply to Supabase query
  test('Apply simple filter to Supabase', () => {
    const queryParams = { $filter: "City eq 'Toronto'" };
    const parsed = parseODataQuery(queryParams);
    const mockQuery = createMockQuery();
    
    const result = applyODataToSupabase(mockQuery, parsed);
    
    if (result.operations.length !== 1 || result.operations[0].type !== 'eq') {
      throw new Error('Filter not applied to Supabase query correctly');
    }
  });

  // Test 9: Apply complex filter to Supabase
  test('Apply complex filter to Supabase', () => {
    const queryParams = { $filter: "City eq 'Toronto' and ListPrice ge 500000" };
    const parsed = parseODataQuery(queryParams);
    const mockQuery = createMockQuery();
    
    const result = applyODataToSupabase(mockQuery, parsed);
    
    if (result.operations.length !== 2) {
      throw new Error('Complex filter not applied to Supabase query correctly');
    }
  });

  // Test 10: Select fields
  test('Select fields', () => {
    const queryParams = { $select: "ListingKey,ListPrice,City" };
    const result = parseODataQuery(queryParams);
    
    if (result.select.length !== 3 || !result.select.includes('ListingKey')) {
      throw new Error('Select fields not parsed correctly');
    }
  });

  // Test 11: Order by
  test('Order by', () => {
    const queryParams = { $orderby: "ListPrice desc,City asc" };
    const result = parseODataQuery(queryParams);
    
    if (result.orderBy.length !== 2) {
      throw new Error('Order by not parsed correctly');
    }
  });

  // Test 12: Top and Skip
  test('Top and Skip', () => {
    const queryParams = { $top: "10", $skip: "20" };
    const result = parseODataQuery(queryParams);
    
    if (result.top !== 10 || result.skip !== 20) {
      throw new Error('Top and Skip not parsed correctly');
    }
  });

  // Test 13: Expand
  test('Expand', () => {
    const queryParams = { $expand: "Media,OpenHouse" };
    const result = parseODataQuery(queryParams);
    
    if (result.expand.length !== 2 || !result.expand.includes('Media')) {
      throw new Error('Expand not parsed correctly');
    }
  });

  // Test 14: Search parameter
  test('Search parameter', () => {
    const result = parseSearch('pool house');
    
    if (!result || result.type !== 'search' || result.value !== 'pool house') {
      throw new Error('Search parameter not parsed correctly');
    }
  });

  // Test 15: Format parameter
  test('Format parameter', () => {
    const result = parseFormat('json');
    
    if (result !== 'json') {
      throw new Error('Format parameter not parsed correctly');
    }
  });

  // Test 16: Field validation
  test('Field validation', () => {
    const allowedFields = ['ListingKey', 'ListPrice', 'City'];
    const result = validateFields(['ListingKey', 'InvalidField'], allowedFields);
    
    if (result.valid || result.invalidFields.length !== 1) {
      throw new Error('Field validation not working correctly');
    }
  });

  // Test 17: OData response creation
  test('OData response creation', () => {
    const data = [{ ListingKey: '123', ListPrice: 500000 }];
    const result = createODataResponse(data, { count: 1 });
    
    if (!result['@odata.context'] || !result.value || result['@odata.count'] !== 1) {
      throw new Error('OData response not created correctly');
    }
  });

  // Test 18: Next link generation
  test('Next link generation', () => {
    const queryParams = { $filter: "City eq 'Toronto'", $top: "10" };
    const result = generateNextLink(queryParams, 0, 10, '/api/reso/Property');
    
    if (!result.includes('$skip=10')) {
      throw new Error('Next link not generated correctly');
    }
  });

  // Test 19: Error handling
  test('Error handling', () => {
    const queryParams = { $top: "invalid" };
    const result = parseODataQuery(queryParams);
    
    if (result.errors.length === 0) {
      throw new Error('Error handling not working');
    }
  });

  // Test 20: Complex nested filter
  test('Complex nested filter', () => {
    const queryParams = { $filter: "(City eq 'Toronto' or City eq 'Vancouver') and (ListPrice ge 500000 and ListPrice le 2000000)" };
    const result = parseODataQuery(queryParams);
    
    if (!result.filter || !result.filter.parsed) {
      throw new Error('Complex nested filter not parsed');
    }
  });

  // Summary
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! OData parser is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the implementation.');
  }

  return { passed, failed };
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests, MockSupabaseQuery, createMockQuery };
