/**
 * Integration Tests for RESO Routes
 * Tests the RESO API endpoints with real database interactions
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import resoRouter from '../../api/routes/reso.js';
import { testSupabase, testUtils, TEST_CONFIG } from '../setup.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/reso', resoRouter);

// Mock the supabase import in the routes
jest.mock('../../server.js', () => ({
  supabase: testSupabase
}));

describe('RESO Routes Integration Tests', () => {
  let testListingKey;
  let testMediaKey;
  let testOpenHouseKey;
  let testRoomKey;
  let testMemberKey;
  let testOfficeKey;

  beforeEach(async () => {
    // Generate unique test keys
    testListingKey = testUtils.generateTestKey('LISTING');
    testMediaKey = testUtils.generateTestKey('MEDIA');
    testOpenHouseKey = testUtils.generateTestKey('OPENHOUSE');
    testRoomKey = testUtils.generateTestKey('ROOM');
    testMemberKey = testUtils.generateTestKey('MEMBER');
    testOfficeKey = testUtils.generateTestKey('OFFICE');

    // Insert test data if not using mock
    if (!TEST_CONFIG.USE_MOCK_DATA) {
      // Insert test office
      await testSupabase.from('offices').insert({
        OfficeKey: testOfficeKey,
        OfficeName: 'Test Office',
        OfficeCity: 'Toronto',
        OfficeType: 'Brokerage'
      });

      // Insert test member
      await testSupabase.from('users').insert({
        id: testMemberKey,
        first_name: 'Test',
        last_name: 'Agent',
        email: 'test@example.com',
        user_type: 'Agent',
        office_key: testOfficeKey
      });

      // Insert test property
      await testSupabase.from('common_fields').insert({
        ListingKey: testListingKey,
        ListPrice: 750000,
        StandardStatus: 'Active',
        City: 'Toronto',
        BedroomsTotal: 3,
        BathroomsTotal: 2.5
      });

      // Insert test media
      await testSupabase.from('property_media').insert({
        MediaKey: testMediaKey,
        ResourceRecordKey: testListingKey,
        MediaURL: 'https://example.com/test.jpg',
        MediaType: 'Photo',
        Order: 1
      });

      // Insert test open house
      await testSupabase.from('property_openhouse').insert({
        OpenHouseKey: testOpenHouseKey,
        ListingKey: testListingKey,
        OpenHouseDate: '2024-01-15',
        OpenHouseStartTime: '14:00:00',
        OpenHouseEndTime: '16:00:00'
      });

      // Insert test room
      await testSupabase.from('property_rooms').insert({
        RoomKey: testRoomKey,
        ListingKey: testListingKey,
        RoomType: 'Living Room',
        RoomLevel: 'Main'
      });
    }
  });

  afterEach(async () => {
    // Clean up test data
    await testUtils.cleanup(testSupabase);
  });

  describe('GET /api/reso/$metadata', () => {
    test('should return OData metadata', async () => {
      const response = await request(app)
        .get('/api/reso/$metadata')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/xml');
      expect(response.text).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(response.text).toContain('<edmx:Edmx');
      expect(response.text).toContain('Property');
      expect(response.text).toContain('Media');
      expect(response.text).toContain('OpenHouse');
    });

    test('should return metadata with URL encoding', async () => {
      const response = await request(app)
        .get('/api/reso/%24metadata')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/xml');
    });
  });

  describe('GET /api/reso/', () => {
    test('should return service document', async () => {
      const response = await request(app)
        .get('/api/reso/')
        .expect(200);

      expect(response.body['@odata.context']).toBe('$metadata');
      expect(response.body.value).toBeDefined();
      expect(Array.isArray(response.body.value)).toBe(true);
      expect(response.body.value.length).toBeGreaterThan(0);

      const entityNames = response.body.value.map(entity => entity.name);
      expect(entityNames).toContain('Property');
      expect(entityNames).toContain('Media');
      expect(entityNames).toContain('OpenHouse');
    });
  });

  describe('GET /api/reso/Property', () => {
    test('should return properties with OData format', async () => {
      const response = await request(app)
        .get('/api/reso/Property')
        .expect(200);

      expect(response.body['@odata.context']).toBe('$metadata#Property');
      expect(response.body.value).toBeDefined();
      expect(Array.isArray(response.body.value)).toBe(true);
    });

    test('should support $select parameter', async () => {
      const response = await request(app)
        .get('/api/reso/Property?$select=ListingKey,ListPrice,City')
        .expect(200);

      expect(response.body.value).toBeDefined();
      if (response.body.value.length > 0) {
        const property = response.body.value[0];
        expect(property).toHaveProperty('ListingKey');
        expect(property).toHaveProperty('ListPrice');
        expect(property).toHaveProperty('City');
        // Should not have other fields
        expect(property).not.toHaveProperty('BedroomsTotal');
      }
    });

    test('should support $filter parameter', async () => {
      const response = await request(app)
        .get('/api/reso/Property?$filter=City eq \'Toronto\'')
        .expect(200);

      expect(response.body.value).toBeDefined();
      if (response.body.value.length > 0) {
        response.body.value.forEach(property => {
          expect(property.City).toBe('Toronto');
        });
      }
    });

    test('should support $orderby parameter', async () => {
      const response = await request(app)
        .get('/api/reso/Property?$orderby=ListPrice desc')
        .expect(200);

      expect(response.body.value).toBeDefined();
      if (response.body.value.length > 1) {
        const prices = response.body.value.map(p => p.ListPrice).filter(p => p !== null);
        for (let i = 0; i < prices.length - 1; i++) {
          expect(prices[i]).toBeGreaterThanOrEqual(prices[i + 1]);
        }
      }
    });

    test('should support $top and $skip parameters', async () => {
      const response = await request(app)
        .get('/api/reso/Property?$top=5&$skip=0')
        .expect(200);

      expect(response.body.value).toBeDefined();
      expect(response.body.value.length).toBeLessThanOrEqual(5);
    });

    test('should support $expand parameter', async () => {
      const response = await request(app)
        .get('/api/reso/Property?$expand=Media')
        .expect(200);

      expect(response.body.value).toBeDefined();
      if (response.body.value.length > 0) {
        const property = response.body.value[0];
        expect(property).toHaveProperty('Media');
        expect(Array.isArray(property.Media)).toBe(true);
      }
    });

    test('should return 400 for invalid filter', async () => {
      const response = await request(app)
        .get('/api/reso/Property?$filter=invalid syntax')
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('BadRequest');
    });
  });

  describe('GET /api/reso/Property/:listingKey', () => {
    test('should return specific property', async () => {
      const response = await request(app)
        .get(`/api/reso/Property/${testListingKey}`)
        .expect(200);

      expect(response.body['@odata.context']).toContain('$metadata#Property/$entity');
      expect(response.body.ListingKey).toBe(testListingKey);
    });

    test('should return 404 for non-existent property', async () => {
      const response = await request(app)
        .get('/api/reso/Property/NONEXISTENT')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/reso/Media', () => {
    test('should return media with OData format', async () => {
      const response = await request(app)
        .get('/api/reso/Media')
        .expect(200);

      expect(response.body['@odata.context']).toBe('$metadata#Media');
      expect(response.body.value).toBeDefined();
      expect(Array.isArray(response.body.value)).toBe(true);
    });

    test('should support filtering by ResourceRecordKey', async () => {
      const response = await request(app)
        .get(`/api/reso/Media?$filter=ResourceRecordKey eq '${testListingKey}'`)
        .expect(200);

      expect(response.body.value).toBeDefined();
      if (response.body.value.length > 0) {
        response.body.value.forEach(media => {
          expect(media.ResourceRecordKey).toBe(testListingKey);
        });
      }
    });
  });

  describe('GET /api/reso/OpenHouse', () => {
    test('should return open houses with OData format', async () => {
      const response = await request(app)
        .get('/api/reso/OpenHouse')
        .expect(200);

      expect(response.body['@odata.context']).toBe('$metadata#OpenHouse');
      expect(response.body.value).toBeDefined();
      expect(Array.isArray(response.body.value)).toBe(true);
    });

    test('should support filtering by ListingKey', async () => {
      const response = await request(app)
        .get(`/api/reso/OpenHouse?$filter=ListingKey eq '${testListingKey}'`)
        .expect(200);

      expect(response.body.value).toBeDefined();
      if (response.body.value.length > 0) {
        response.body.value.forEach(openHouse => {
          expect(openHouse.ListingKey).toBe(testListingKey);
        });
      }
    });
  });

  describe('GET /api/reso/Room', () => {
    test('should return rooms with OData format', async () => {
      const response = await request(app)
        .get('/api/reso/Room')
        .expect(200);

      expect(response.body['@odata.context']).toBe('$metadata#Room');
      expect(response.body.value).toBeDefined();
      expect(Array.isArray(response.body.value)).toBe(true);
    });

    test('should support filtering by RoomType', async () => {
      const response = await request(app)
        .get('/api/reso/Room?$filter=RoomType eq \'Living Room\'')
        .expect(200);

      expect(response.body.value).toBeDefined();
      if (response.body.value.length > 0) {
        response.body.value.forEach(room => {
          expect(room.RoomType).toBe('Living Room');
        });
      }
    });
  });

  describe('GET /api/reso/Member', () => {
    test('should return members with OData format', async () => {
      const response = await request(app)
        .get('/api/reso/Member')
        .expect(200);

      expect(response.body['@odata.context']).toBe('$metadata#Member');
      expect(response.body.value).toBeDefined();
      expect(Array.isArray(response.body.value)).toBe(true);
    });

    test('should support filtering by MemberType', async () => {
      const response = await request(app)
        .get('/api/reso/Member?$filter=MemberType eq \'Agent\'')
        .expect(200);

      expect(response.body.value).toBeDefined();
      if (response.body.value.length > 0) {
        response.body.value.forEach(member => {
          expect(member.MemberType).toBe('Agent');
        });
      }
    });
  });

  describe('GET /api/reso/Office', () => {
    test('should return offices with OData format', async () => {
      const response = await request(app)
        .get('/api/reso/Office')
        .expect(200);

      expect(response.body['@odata.context']).toBe('$metadata#Office');
      expect(response.body.value).toBeDefined();
      expect(Array.isArray(response.body.value)).toBe(true);
    });

    test('should support filtering by OfficeType', async () => {
      const response = await request(app)
        .get('/api/reso/Office?$filter=OfficeType eq \'Brokerage\'')
        .expect(200);

      expect(response.body.value).toBeDefined();
      if (response.body.value.length > 0) {
        response.body.value.forEach(office => {
          expect(office.OfficeType).toBe('Brokerage');
        });
      }
    });
  });

  describe('GET /api/reso/$search', () => {
    test('should return search results', async () => {
      const response = await request(app)
        .get('/api/reso/$search?$search=Toronto')
        .expect(200);

      expect(response.body['@odata.context']).toBe('$metadata#SearchResults');
      expect(response.body.value).toBeDefined();
      expect(Array.isArray(response.body.value)).toBe(true);
    });

    test('should return 400 for missing search term', async () => {
      const response = await request(app)
        .get('/api/reso/$search')
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('BadRequest');
    });
  });

  describe('POST /api/reso/$batch', () => {
    test('should return 501 for batch requests', async () => {
      const response = await request(app)
        .post('/api/reso/$batch')
        .set('Content-Type', 'multipart/mixed')
        .expect(501);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NotImplemented');
    });
  });
});
