/**
 * Unit Tests for OData Parser
 * Tests the enhanced OData parser functionality
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
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
} from '../../utils/odataParser.js';
import { mockSupabase } from '../setup.js';

describe('OData Parser', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      and: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseODataQuery', () => {
    test('should parse simple query parameters', () => {
      const query = {
        $select: 'ListingKey,ListPrice,City',
        $top: '10',
        $skip: '20',
        $orderby: 'ListPrice desc'
      };

      const result = parseODataQuery(query, {
        allowedFields: ['ListingKey', 'ListPrice', 'City', 'BedroomsTotal'],
        allowedExpandFields: ['Media', 'OpenHouse']
      });

      expect(result.select).toEqual(['ListingKey', 'ListPrice', 'City']);
      expect(result.top).toBe(10);
      expect(result.skip).toBe(20);
      expect(result.orderBy).toEqual([{ field: 'ListPrice', direction: 'desc' }]);
    });

    test('should parse complex filter with AND operator', () => {
      const query = {
        $filter: "City eq 'Toronto' and ListPrice ge 500000"
      };

      const result = parseODataQuery(query, {
        allowedFields: ['City', 'ListPrice'],
        allowedExpandFields: []
      });

      expect(result.filter).toBeDefined();
      expect(result.filter.type).toBe('complex');
      expect(result.filter.parsed.type).toBe('logical');
      expect(result.filter.parsed.operator).toBe('and');
    });

    test('should parse complex filter with OR operator', () => {
      const query = {
        $filter: "City eq 'Toronto' or City eq 'Vancouver'"
      };

      const result = parseODataQuery(query, {
        allowedFields: ['City'],
        allowedExpandFields: []
      });

      expect(result.filter).toBeDefined();
      expect(result.filter.parsed.type).toBe('logical');
      expect(result.filter.parsed.operator).toBe('or');
    });

    test('should parse filter with parentheses', () => {
      const query = {
        $filter: "(City eq 'Toronto' or City eq 'Vancouver') and ListPrice ge 500000"
      };

      const result = parseODataQuery(query, {
        allowedFields: ['City', 'ListPrice'],
        allowedExpandFields: []
      });

      expect(result.filter).toBeDefined();
      expect(result.filter.parsed.type).toBe('logical');
    });

    test('should parse IN operator', () => {
      const query = {
        $filter: "City in ('Toronto', 'Vancouver', 'Montreal')"
      };

      const result = parseODataQuery(query, {
        allowedFields: ['City'],
        allowedExpandFields: []
      });

      expect(result.filter).toBeDefined();
      expect(result.filter.parsed.type).toBe('in');
    });

    test('should parse function calls', () => {
      const query = {
        $filter: "contains(PublicRemarks, 'pool')"
      };

      const result = parseODataQuery(query, {
        allowedFields: ['PublicRemarks'],
        allowedExpandFields: []
      });

      expect(result.filter).toBeDefined();
      expect(result.filter.parsed.type).toBe('function');
      expect(result.filter.parsed.function).toBe('contains');
    });

    test('should parse expand parameters', () => {
      const query = {
        $expand: 'Media,OpenHouse,Room'
      };

      const result = parseODataQuery(query, {
        allowedFields: ['ListingKey'],
        allowedExpandFields: ['Media', 'OpenHouse', 'Room', 'Member']
      });

      expect(result.expand).toEqual(['Media', 'OpenHouse', 'Room']);
    });

    test('should handle search parameter', () => {
      const query = {
        $search: 'downtown pool'
      };

      const result = parseODataQuery(query, {
        allowedFields: ['PublicRemarks', 'City'],
        allowedExpandFields: []
      });

      expect(result.search).toBe('downtown pool');
    });

    test('should validate allowed fields', () => {
      const query = {
        $select: 'ListingKey,InvalidField,ListPrice'
      };

      const result = parseODataQuery(query, {
        allowedFields: ['ListingKey', 'ListPrice', 'City'],
        allowedExpandFields: []
      });

      // Should only include allowed fields
      expect(result.select).toEqual(['ListingKey', 'ListPrice']);
    });

    test('should handle empty query', () => {
      const result = parseODataQuery({}, {
        allowedFields: ['ListingKey'],
        allowedExpandFields: []
      });

      expect(result.select).toEqual([]);
      expect(result.filter).toBeNull();
      expect(result.expand).toEqual([]);
      expect(result.top).toBeNull();
      expect(result.skip).toBe(0);
    });
  });

  describe('applyODataToSupabase', () => {
    test('should apply select fields', () => {
      const parsedQuery = {
        select: ['ListingKey', 'ListPrice', 'City']
      };

      applyODataToSupabase(mockQuery, parsedQuery);

      expect(mockQuery.select).toHaveBeenCalledWith('ListingKey, ListPrice, City');
    });

    test('should apply simple filter', () => {
      const parsedQuery = {
        filter: {
          type: 'comparison',
          field: 'City',
          operator: 'eq',
          value: 'Toronto'
        }
      };

      applyODataToSupabase(mockQuery, parsedQuery);

      expect(mockQuery.eq).toHaveBeenCalledWith('City', 'Toronto');
    });

    test('should apply range filter', () => {
      const parsedQuery = {
        filter: {
          type: 'comparison',
          field: 'ListPrice',
          operator: 'ge',
          value: 500000
        }
      };

      applyODataToSupabase(mockQuery, parsedQuery);

      expect(mockQuery.gte).toHaveBeenCalledWith('ListPrice', 500000);
    });

    test('should apply IN filter', () => {
      const parsedQuery = {
        filter: {
          type: 'in',
          field: 'City',
          values: ['Toronto', 'Vancouver']
        }
      };

      applyODataToSupabase(mockQuery, parsedQuery);

      expect(mockQuery.in).toHaveBeenCalledWith('City', ['Toronto', 'Vancouver']);
    });

    test('should apply NULL filter', () => {
      const parsedQuery = {
        filter: {
          type: 'null',
          field: 'ClosePrice',
          operator: 'is'
        }
      };

      applyODataToSupabase(mockQuery, parsedQuery);

      expect(mockQuery.is).toHaveBeenCalledWith('ClosePrice', null);
    });

    test('should apply order by', () => {
      const parsedQuery = {
        orderBy: [
          { field: 'ListPrice', direction: 'desc' },
          { field: 'City', direction: 'asc' }
        ]
      };

      applyODataToSupabase(mockQuery, parsedQuery);

      expect(mockQuery.order).toHaveBeenCalledWith('ListPrice', { ascending: false });
    });

    test('should apply pagination', () => {
      const parsedQuery = {
        top: 10,
        skip: 20
      };

      applyODataToSupabase(mockQuery, parsedQuery);

      expect(mockQuery.range).toHaveBeenCalledWith(20, 29);
    });

    test('should apply search', () => {
      const parsedQuery = {
        search: 'downtown pool'
      };

      applyODataToSupabase(mockQuery, parsedQuery);

      expect(mockQuery.or).toHaveBeenCalled();
    });
  });

  describe('validateODataQuery', () => {
    test('should validate correct query', () => {
      const query = {
        $select: 'ListingKey,ListPrice',
        $filter: "City eq 'Toronto'",
        $top: '10'
      };

      const result = validateODataQuery(query);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should detect invalid top value', () => {
      const query = {
        $top: 'invalid'
      };

      const result = validateODataQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('$top must be a positive integer');
    });

    test('should detect invalid skip value', () => {
      const query = {
        $skip: '-5'
      };

      const result = validateODataQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('$skip must be a non-negative integer');
    });

    test('should detect invalid filter syntax', () => {
      const query = {
        $filter: "City eq 'Toronto' and"
      };

      const result = validateODataQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('utility functions', () => {
    test('parseSearch should extract search terms', () => {
      const query = { $search: 'downtown pool' };
      const result = parseSearch(query);
      expect(result).toBe('downtown pool');
    });

    test('parseFormat should extract format', () => {
      const query = { $format: 'json' };
      const result = parseFormat(query);
      expect(result).toBe('json');
    });

    test('validateFields should validate field names', () => {
      const fields = ['ListingKey', 'ListPrice', 'City'];
      const allowedFields = ['ListingKey', 'ListPrice', 'City', 'BedroomsTotal'];
      
      const result = validateFields(fields, allowedFields);
      expect(result.isValid).toBe(true);
      expect(result.invalidFields).toEqual([]);
    });

    test('validateFields should detect invalid fields', () => {
      const fields = ['ListingKey', 'InvalidField', 'ListPrice'];
      const allowedFields = ['ListingKey', 'ListPrice', 'City'];
      
      const result = validateFields(fields, allowedFields);
      expect(result.isValid).toBe(false);
      expect(result.invalidFields).toEqual(['InvalidField']);
    });

    test('createODataResponse should create proper response structure', () => {
      const data = [{ ListingKey: '123', ListPrice: 500000 }];
      const result = createODataResponse(data, '$metadata#Property');
      
      expect(result['@odata.context']).toBe('$metadata#Property');
      expect(result.value).toEqual(data);
    });

    test('generateNextLink should create proper next link', () => {
      const result = generateNextLink('/api/reso/Property', 10, 20, 10);
      expect(result).toBe('/api/reso/Property?$skip=30&$top=10');
    });
  });
});
