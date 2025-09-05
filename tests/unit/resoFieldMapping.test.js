/**
 * Unit Tests for RESO Field Mapping
 * Tests the RESO-compliant field mapping functions
 */

import { describe, test, expect } from '@jest/globals';
import { 
  mapResoCommonFields, 
  mapResoMediaFields, 
  mapResoOpenHouseFields, 
  mapResoRoomFields, 
  mapResoMemberFields, 
  mapResoOfficeFields 
} from '../../mappers/mapResoFields.js';

describe('RESO Field Mapping', () => {
  describe('mapResoCommonFields', () => {
    test('should map basic property fields correctly', () => {
      const idxData = {
        ListingKey: 'TEST123',
        ListPrice: '750000',
        MlsStatus: 'Active',
        City: 'Toronto',
        BedroomsAboveGrade: '3',
        BathroomsTotalInteger: '2.5'
      };

      const result = mapResoCommonFields(idxData, {});

      expect(result.ListingKey).toBe('TEST123');
      expect(result.ListPrice).toBe(750000);
      expect(result.StandardStatus).toBe('Active');
      expect(result.City).toBe('Toronto');
      expect(result.BedroomsTotal).toBe(3);
      expect(result.BathroomsTotal).toBe(2.5);
    });

    test('should prioritize VOW data over IDX data', () => {
      const idxData = {
        ListingKey: 'TEST123',
        ListPrice: '750000',
        MlsStatus: 'Active'
      };

      const vowData = {
        ListPrice: '800000',
        StandardStatus: 'Sold'
      };

      const result = mapResoCommonFields(idxData, vowData);

      expect(result.ListPrice).toBe(800000);
      expect(result.StandardStatus).toBe('Sold');
    });

    test('should convert data types correctly', () => {
      const data = {
        ListPrice: '750000',
        BedroomsAboveGrade: '3',
        BathroomsTotalInteger: '2.5',
        FireplaceYN: 'Yes',
        WaterfrontYN: 'No',
        ParkingSpaces: '2'
      };

      const result = mapResoCommonFields(data, {});

      expect(typeof result.ListPrice).toBe('number');
      expect(typeof result.BedroomsTotal).toBe('number');
      expect(typeof result.BathroomsTotal).toBe('number');
      expect(typeof result.FireplaceYN).toBe('boolean');
      expect(typeof result.WaterfrontYN).toBe('boolean');
      expect(typeof result.ParkingSpaces).toBe('number');
    });

    test('should handle null and undefined values', () => {
      const data = {
        ListingKey: 'TEST123',
        ListPrice: null,
        ClosePrice: undefined,
        City: '',
        BedroomsAboveGrade: '0'
      };

      const result = mapResoCommonFields(data, {});

      expect(result.ListingKey).toBe('TEST123');
      expect(result.ListPrice).toBeNull();
      expect(result.ClosePrice).toBeNull();
      expect(result.City).toBe('');
      expect(result.BedroomsTotal).toBeNull();
    });

    test('should map status fields correctly', () => {
      const statusTests = [
        { input: 'Active', expected: 'Active' },
        { input: 'Available', expected: 'Active' },
        { input: 'Sold', expected: 'Sold' },
        { input: 'Closed', expected: 'Sold' },
        { input: 'Pending', expected: 'Pending' },
        { input: 'Under Contract', expected: 'Pending' },
        { input: 'Withdrawn', expected: 'Withdrawn' },
        { input: 'Expired', expected: 'Expired' }
      ];

      statusTests.forEach(({ input, expected }) => {
        const data = { MlsStatus: input };
        const result = mapResoCommonFields(data, {});
        expect(result.StandardStatus).toBe(expected);
      });
    });

    test('should handle missing data gracefully', () => {
      const result = mapResoCommonFields({}, {});

      expect(result.ListingKey).toBeNull();
      expect(result.ListPrice).toBeNull();
      expect(result.StandardStatus).toBeNull();
      expect(result.City).toBeNull();
      expect(result.BedroomsTotal).toBeNull();
    });
  });

  describe('mapResoMediaFields', () => {
    test('should map media fields correctly', () => {
      const mediaData = {
        MediaKey: 'MEDIA123',
        ResourceRecordKey: 'TEST123',
        MediaURL: 'https://example.com/photo.jpg',
        MediaType: 'Photo',
        Order: '1',
        Width: '1920',
        Height: '1080'
      };

      const result = mapResoMediaFields(mediaData);

      expect(result.MediaKey).toBe('MEDIA123');
      expect(result.ResourceRecordKey).toBe('TEST123');
      expect(result.MediaURL).toBe('https://example.com/photo.jpg');
      expect(result.MediaType).toBe('Photo');
      expect(result.Order).toBe(1);
      expect(result.Width).toBe(1920);
      expect(result.Height).toBe(1080);
    });

    test('should generate MediaKey if not provided', () => {
      const mediaData = {
        ResourceRecordKey: 'TEST123',
        Order: 1
      };

      const result = mapResoMediaFields(mediaData);

      expect(result.MediaKey).toBe('TEST123_media_1');
    });

    test('should map media types correctly', () => {
      const typeTests = [
        { input: 'Photo', expected: 'Photo' },
        { input: 'Image', expected: 'Photo' },
        { input: 'Virtual Tour', expected: 'Virtual Tour' },
        { input: 'Video', expected: 'Video' },
        { input: 'Unknown', expected: 'Photo' }
      ];

      typeTests.forEach(({ input, expected }) => {
        const data = { MediaType: input };
        const result = mapResoMediaFields(data);
        expect(result.MediaType).toBe(expected);
      });
    });
  });

  describe('mapResoOpenHouseFields', () => {
    test('should map open house fields correctly', () => {
      const openHouseData = {
        OpenHouseKey: 'OH123',
        ListingKey: 'TEST123',
        OpenHouseDate: '2024-01-15',
        OpenHouseStartTime: '14:00',
        OpenHouseEndTime: '16:00',
        RefreshmentsYN: 'Yes'
      };

      const result = mapResoOpenHouseFields(openHouseData);

      expect(result.OpenHouseKey).toBe('OH123');
      expect(result.ListingKey).toBe('TEST123');
      expect(result.OpenHouseDate).toBe('2024-01-15');
      expect(result.OpenHouseStartTime).toBe('14:00:00');
      expect(result.OpenHouseEndTime).toBe('16:00:00');
      expect(result.RefreshmentsYN).toBe(true);
    });

    test('should generate OpenHouseKey if not provided', () => {
      const openHouseData = {
        ListingKey: 'TEST123',
        OpenHouseDate: '2024-01-15'
      };

      const result = mapResoOpenHouseFields(openHouseData);

      expect(result.OpenHouseKey).toBe('TEST123_openhouse_2024-01-15');
    });

    test('should parse time formats correctly', () => {
      const timeTests = [
        { input: '14:00', expected: '14:00:00' },
        { input: '2:30', expected: '02:30:00' },
        { input: 'invalid', expected: null }
      ];

      timeTests.forEach(({ input, expected }) => {
        const data = { OpenHouseStartTime: input };
        const result = mapResoOpenHouseFields(data);
        expect(result.OpenHouseStartTime).toBe(expected);
      });
    });
  });

  describe('mapResoRoomFields', () => {
    test('should map room fields correctly', () => {
      const roomData = {
        RoomKey: 'ROOM123',
        ListingKey: 'TEST123',
        RoomType: 'Living Room',
        RoomLevel: 'Main',
        RoomDimensions: '20x15'
      };

      const result = mapResoRoomFields(roomData);

      expect(result.RoomKey).toBe('ROOM123');
      expect(result.ListingKey).toBe('TEST123');
      expect(result.RoomType).toBe('Living Room');
      expect(result.RoomLevel).toBe('Main');
      expect(result.RoomDimensions).toBe('20x15');
    });

    test('should generate RoomKey if not provided', () => {
      const roomData = {
        ListingKey: 'TEST123',
        RoomType: 'Kitchen',
        RoomLevel: 'Main'
      };

      const result = mapResoRoomFields(roomData);

      expect(result.RoomKey).toBe('TEST123_Kitchen_Main');
    });
  });

  describe('mapResoMemberFields', () => {
    test('should map member fields correctly', () => {
      const memberData = {
        id: 'MEMBER123',
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        phone: '555-0123',
        user_type: 'Agent',
        license_number: '12345',
        status: 'Active',
        office_key: 'OFFICE123'
      };

      const result = mapResoMemberFields(memberData);

      expect(result.MemberKey).toBe('MEMBER123');
      expect(result.MemberFirstName).toBe('John');
      expect(result.MemberLastName).toBe('Smith');
      expect(result.MemberFullName).toBe('John Smith');
      expect(result.MemberEmail).toBe('john.smith@example.com');
      expect(result.MemberPhone).toBe('555-0123');
      expect(result.MemberType).toBe('Agent');
      expect(result.LicenseNumber).toBe('12345');
      expect(result.MemberStatus).toBe('Active');
      expect(result.OfficeKey).toBe('OFFICE123');
    });

    test('should map member types correctly', () => {
      const typeTests = [
        { input: 'Agent', expected: 'Agent' },
        { input: 'Broker', expected: 'Broker' },
        { input: 'Manager', expected: 'Manager' },
        { input: 'Unknown', expected: 'Agent' }
      ];

      typeTests.forEach(({ input, expected }) => {
        const data = { user_type: input };
        const result = mapResoMemberFields(data);
        expect(result.MemberType).toBe(expected);
      });
    });

    test('should map member status correctly', () => {
      const statusTests = [
        { input: 'Active', expected: 'Active' },
        { input: 'Inactive', expected: 'Inactive' },
        { input: 'Suspended', expected: 'Suspended' },
        { input: 'Terminated', expected: 'Terminated' },
        { input: 'Unknown', expected: 'Active' }
      ];

      statusTests.forEach(({ input, expected }) => {
        const data = { status: input };
        const result = mapResoMemberFields(data);
        expect(result.MemberStatus).toBe(expected);
      });
    });
  });

  describe('mapResoOfficeFields', () => {
    test('should map office fields correctly', () => {
      const officeData = {
        OfficeKey: 'OFFICE123',
        OfficeName: 'Century 21 Real Estate',
        OfficeAddress1: '123 Main Street',
        OfficeCity: 'Toronto',
        OfficeState: 'ON',
        OfficePostalCode: 'M5V 3A8',
        OfficePhone: '416-555-0123',
        OfficeEmail: 'info@century21toronto.com',
        OfficeType: 'Brokerage'
      };

      const result = mapResoOfficeFields(officeData);

      expect(result.OfficeKey).toBe('OFFICE123');
      expect(result.OfficeName).toBe('Century 21 Real Estate');
      expect(result.OfficeAddress1).toBe('123 Main Street');
      expect(result.OfficeCity).toBe('Toronto');
      expect(result.OfficeState).toBe('ON');
      expect(result.OfficePostalCode).toBe('M5V 3A8');
      expect(result.OfficePhone).toBe('416-555-0123');
      expect(result.OfficeEmail).toBe('info@century21toronto.com');
      expect(result.OfficeType).toBe('Brokerage');
    });
  });

  describe('Data Type Conversion', () => {
    test('should parse timestamps correctly', () => {
      const data = {
        ModificationTimestamp: '2024-01-15T10:30:00Z',
        OriginalEntryTimestamp: '2024-01-01T00:00:00Z'
      };

      const result = mapResoCommonFields(data, {});

      expect(result.ModificationTimestamp).toBe('2024-01-15T10:30:00.000Z');
      expect(result.OriginalEntryTimestamp).toBe('2024-01-01T00:00:00.000Z');
    });

    test('should parse dates correctly', () => {
      const data = {
        CloseDate: '2024-01-15'
      };

      const result = mapResoCommonFields(data, {});

      expect(result.CloseDate).toBe('2024-01-15');
    });

    test('should handle invalid timestamps gracefully', () => {
      const data = {
        ModificationTimestamp: 'invalid-date',
        CloseDate: 'invalid-date'
      };

      const result = mapResoCommonFields(data, {});

      expect(result.ModificationTimestamp).toBeNull();
      expect(result.CloseDate).toBeNull();
    });

    test('should parse boolean values correctly', () => {
      const booleanTests = [
        { input: 'Yes', expected: true },
        { input: 'No', expected: false },
        { input: 'true', expected: true },
        { input: 'false', expected: false },
        { input: '1', expected: true },
        { input: '0', expected: false },
        { input: 'invalid', expected: false }
      ];

      booleanTests.forEach(({ input, expected }) => {
        const data = { FireplaceYN: input };
        const result = mapResoCommonFields(data, {});
        expect(result.FireplaceYN).toBe(expected);
      });
    });
  });
});
