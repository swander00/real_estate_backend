/**
 * Test Setup and Configuration
 * Sets up the testing environment for the real estate backend
 */

import { createClient } from '@supabase/supabase-js';
import { jest } from '@jest/globals';

// Test configuration
export const TEST_CONFIG = {
  // Use test database or mock data
  USE_MOCK_DATA: process.env.NODE_ENV === 'test' || process.env.USE_MOCK_DATA === 'true',
  
  // Test database configuration
  SUPABASE_URL: process.env.SUPABASE_TEST_URL || 'https://test.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_TEST_ANON_KEY || 'test-key',
  
  // Test data
  TEST_LISTING_KEY: 'TEST_LISTING_001',
  TEST_MEDIA_KEY: 'TEST_MEDIA_001',
  TEST_OPENHOUSE_KEY: 'TEST_OPENHOUSE_001',
  TEST_ROOM_KEY: 'TEST_ROOM_001',
  TEST_MEMBER_KEY: 'TEST_MEMBER_001',
  TEST_OFFICE_KEY: 'TEST_OFFICE_001'
};

// Create test Supabase client
export const testSupabase = createClient(
  TEST_CONFIG.SUPABASE_URL,
  TEST_CONFIG.SUPABASE_ANON_KEY
);

// Mock Supabase client for unit tests
export const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
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
    single: jest.fn().mockReturnThis(),
    then: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 })
  }))
};

// Test data fixtures
export const TEST_DATA = {
  property: {
    ListingKey: TEST_CONFIG.TEST_LISTING_KEY,
    ListPrice: 750000,
    StandardStatus: 'Active',
    PropertyType: 'Residential',
    City: 'Toronto',
    StateOrProvince: 'ON',
    PostalCode: 'M5V 3A8',
    BedroomsTotal: 3,
    BathroomsTotal: 2.5,
    PublicRemarks: 'Beautiful family home in downtown Toronto',
    ModificationTimestamp: new Date().toISOString()
  },
  
  media: {
    MediaKey: TEST_CONFIG.TEST_MEDIA_KEY,
    ResourceRecordKey: TEST_CONFIG.TEST_LISTING_KEY,
    MediaURL: 'https://example.com/photo.jpg',
    MediaType: 'Photo',
    MediaCategory: 'Exterior',
    Order: 1,
    Caption: 'Front view of the property',
    Width: 1920,
    Height: 1080,
    ModificationTimestamp: new Date().toISOString()
  },
  
  openHouse: {
    OpenHouseKey: TEST_CONFIG.TEST_OPENHOUSE_KEY,
    ListingKey: TEST_CONFIG.TEST_LISTING_KEY,
    OpenHouseDate: '2024-01-15',
    OpenHouseStartTime: '14:00:00',
    OpenHouseEndTime: '16:00:00',
    OpenHouseDescription: 'Open house for interested buyers',
    RefreshmentsYN: true,
    ModificationTimestamp: new Date().toISOString()
  },
  
  room: {
    RoomKey: TEST_CONFIG.TEST_ROOM_KEY,
    ListingKey: TEST_CONFIG.TEST_LISTING_KEY,
    RoomType: 'Living Room',
    RoomLevel: 'Main',
    RoomDimensions: '20x15',
    RoomFeatures: 'Fireplace, Hardwood Floors',
    RoomDescription: 'Spacious living room with fireplace',
    ModificationTimestamp: new Date().toISOString()
  },
  
  member: {
    MemberKey: TEST_CONFIG.TEST_MEMBER_KEY,
    MemberFirstName: 'John',
    MemberLastName: 'Smith',
    MemberFullName: 'John Smith',
    MemberEmail: 'john.smith@example.com',
    MemberPhone: '555-0123',
    MemberType: 'Agent',
    LicenseNumber: '12345',
    MemberStatus: 'Active',
    OfficeKey: TEST_CONFIG.TEST_OFFICE_KEY,
    ModificationTimestamp: new Date().toISOString()
  },
  
  office: {
    OfficeKey: TEST_CONFIG.TEST_OFFICE_KEY,
    OfficeName: 'Century 21 Real Estate',
    OfficeAddress1: '123 Main Street',
    OfficeCity: 'Toronto',
    OfficeState: 'ON',
    OfficePostalCode: 'M5V 3A8',
    OfficePhone: '416-555-0123',
    OfficeEmail: 'info@century21toronto.com',
    OfficeType: 'Brokerage',
    ModificationTimestamp: new Date().toISOString()
  }
};

// Test utilities
export const testUtils = {
  /**
   * Create a test property with custom fields
   */
  createTestProperty: (overrides = {}) => ({
    ...TEST_DATA.property,
    ...overrides
  }),
  
  /**
   * Create a test media item with custom fields
   */
  createTestMedia: (overrides = {}) => ({
    ...TEST_DATA.media,
    ...overrides
  }),
  
  /**
   * Create a test open house with custom fields
   */
  createTestOpenHouse: (overrides = {}) => ({
    ...TEST_DATA.openHouse,
    ...overrides
  }),
  
  /**
   * Create a test room with custom fields
   */
  createTestRoom: (overrides = {}) => ({
    ...TEST_DATA.room,
    ...overrides
  }),
  
  /**
   * Create a test member with custom fields
   */
  createTestMember: (overrides = {}) => ({
    ...TEST_DATA.member,
    ...overrides
  }),
  
  /**
   * Create a test office with custom fields
   */
  createTestOffice: (overrides = {}) => ({
    ...TEST_DATA.office,
    ...overrides
  }),
  
  /**
   * Wait for a specified amount of time
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Generate a random test key
   */
  generateTestKey: (prefix = 'TEST') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  /**
   * Clean up test data
   */
  cleanup: async (supabase) => {
    if (TEST_CONFIG.USE_MOCK_DATA) return;
    
    try {
      // Clean up test data in reverse order of dependencies
      await supabase.from('property_rooms').delete().like('RoomKey', 'TEST_%');
      await supabase.from('property_openhouse').delete().like('OpenHouseKey', 'TEST_%');
      await supabase.from('property_media').delete().like('MediaKey', 'TEST_%');
      await supabase.from('common_fields').delete().like('ListingKey', 'TEST_%');
      await supabase.from('users').delete().like('id', 'TEST_%');
      await supabase.from('offices').delete().like('OfficeKey', 'TEST_%');
    } catch (error) {
      console.warn('Test cleanup failed:', error.message);
    }
  }
};

// Global test setup
export const setupTests = () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Increase timeout for integration tests
  jest.setTimeout(30000);
  
  // Mock console methods in tests to reduce noise
  if (process.env.SILENT_TESTS === 'true') {
    global.console = {
      ...console,
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  }
};

// Global test teardown
export const teardownTests = async () => {
  // Clean up any global resources
  if (global.testSupabase) {
    await testUtils.cleanup(global.testSupabase);
  }
};

export default {
  TEST_CONFIG,
  testSupabase,
  mockSupabase,
  TEST_DATA,
  testUtils,
  setupTests,
  teardownTests
};
