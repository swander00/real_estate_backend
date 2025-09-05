/**
 * Unit Tests for RESO Metadata
 * Tests the RESO metadata generation and field validation
 */

import { describe, test, expect } from '@jest/globals';
import { 
  generateRESOMetadata, 
  getAllowedFields, 
  getAllowedExpandFields, 
  createServiceDocument 
} from '../../utils/resoMetadata.js';

describe('RESO Metadata', () => {
  describe('generateRESOMetadata', () => {
    test('should generate complete metadata structure', () => {
      const metadata = generateRESOMetadata();
      
      expect(metadata).toBeDefined();
      expect(metadata.$metadata).toBeDefined();
      expect(metadata.$metadata.version).toBe('4.0');
      expect(metadata.$metadata.dataServices).toHaveLength(1);
      
      const dataService = metadata.$metadata.dataServices[0];
      expect(dataService.dataServiceVersion).toBe('2.0');
      expect(dataService.schema).toHaveLength(1);
      
      const schema = dataService.schema[0];
      expect(schema.namespace).toBe('RESO.RealEstate');
      expect(schema.entityType).toHaveLength(8); // All entity types
      expect(schema.entityContainer).toHaveLength(1);
    });

    test('should include all required entity types', () => {
      const metadata = generateRESOMetadata();
      const entityTypes = metadata.$metadata.dataServices[0].schema[0].entityType;
      
      const entityNames = entityTypes.map(et => et.name);
      expect(entityNames).toContain('Property');
      expect(entityNames).toContain('Media');
      expect(entityNames).toContain('OpenHouse');
      expect(entityNames).toContain('Room');
      expect(entityNames).toContain('Member');
      expect(entityNames).toContain('Office');
      expect(entityNames).toContain('PropertyHistory');
      expect(entityNames).toContain('PropertyFeatures');
    });

    test('should include all entity sets in container', () => {
      const metadata = generateRESOMetadata();
      const entitySets = metadata.$metadata.dataServices[0].schema[0].entityContainer[0].entitySet;
      
      expect(entitySets).toHaveLength(8);
      
      const setNames = entitySets.map(es => es.name);
      expect(setNames).toContain('Property');
      expect(setNames).toContain('Media');
      expect(setNames).toContain('OpenHouse');
      expect(setNames).toContain('Room');
      expect(setNames).toContain('Member');
      expect(setNames).toContain('Office');
      expect(setNames).toContain('PropertyHistory');
      expect(setNames).toContain('PropertyFeatures');
    });

    test('should have proper Property entity structure', () => {
      const metadata = generateRESOMetadata();
      const entityTypes = metadata.$metadata.dataServices[0].schema[0].entityType;
      const propertyEntity = entityTypes.find(et => et.name === 'Property');
      
      expect(propertyEntity).toBeDefined();
      expect(propertyEntity.key).toHaveLength(1);
      expect(propertyEntity.key[0].name).toBe('ListingKey');
      expect(propertyEntity.property).toBeDefined();
      expect(propertyEntity.navigationProperty).toBeDefined();
      
      // Check for key properties
      const propertyNames = propertyEntity.property.map(p => p.name);
      expect(propertyNames).toContain('ListingKey');
      expect(propertyNames).toContain('ListPrice');
      expect(propertyNames).toContain('StandardStatus');
      expect(propertyNames).toContain('PropertyType');
      expect(propertyNames).toContain('City');
      expect(propertyNames).toContain('BedroomsTotal');
      expect(propertyNames).toContain('BathroomsTotal');
      
      // Check navigation properties
      const navNames = propertyEntity.navigationProperty.map(np => np.name);
      expect(navNames).toContain('Media');
      expect(navNames).toContain('OpenHouse');
      expect(navNames).toContain('Room');
      expect(navNames).toContain('Member');
    });

    test('should have proper Media entity structure', () => {
      const metadata = generateRESOMetadata();
      const entityTypes = metadata.$metadata.dataServices[0].schema[0].entityType;
      const mediaEntity = entityTypes.find(et => et.name === 'Media');
      
      expect(mediaEntity).toBeDefined();
      expect(mediaEntity.key).toHaveLength(1);
      expect(mediaEntity.key[0].name).toBe('MediaKey');
      
      const propertyNames = mediaEntity.property.map(p => p.name);
      expect(propertyNames).toContain('MediaKey');
      expect(propertyNames).toContain('ResourceRecordKey');
      expect(propertyNames).toContain('MediaURL');
      expect(propertyNames).toContain('MediaType');
      expect(propertyNames).toContain('Order');
    });

    test('should have proper Member entity structure', () => {
      const metadata = generateRESOMetadata();
      const entityTypes = metadata.$metadata.dataServices[0].schema[0].entityType;
      const memberEntity = entityTypes.find(et => et.name === 'Member');
      
      expect(memberEntity).toBeDefined();
      expect(memberEntity.key).toHaveLength(1);
      expect(memberEntity.key[0].name).toBe('MemberKey');
      
      const propertyNames = memberEntity.property.map(p => p.name);
      expect(propertyNames).toContain('MemberKey');
      expect(propertyNames).toContain('MemberFirstName');
      expect(propertyNames).toContain('MemberLastName');
      expect(propertyNames).toContain('MemberEmail');
      expect(propertyNames).toContain('MemberType');
      expect(propertyNames).toContain('LicenseNumber');
    });
  });

  describe('getAllowedFields', () => {
    test('should return Property fields', () => {
      const fields = getAllowedFields('Property');
      
      expect(fields).toBeDefined();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
      expect(fields).toContain('ListingKey');
      expect(fields).toContain('ListPrice');
      expect(fields).toContain('StandardStatus');
      expect(fields).toContain('PropertyType');
      expect(fields).toContain('City');
      expect(fields).toContain('BedroomsTotal');
      expect(fields).toContain('BathroomsTotal');
    });

    test('should return Media fields', () => {
      const fields = getAllowedFields('Media');
      
      expect(fields).toBeDefined();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields).toContain('MediaKey');
      expect(fields).toContain('ResourceRecordKey');
      expect(fields).toContain('MediaURL');
      expect(fields).toContain('MediaType');
      expect(fields).toContain('Order');
    });

    test('should return OpenHouse fields', () => {
      const fields = getAllowedFields('OpenHouse');
      
      expect(fields).toBeDefined();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields).toContain('OpenHouseKey');
      expect(fields).toContain('ListingKey');
      expect(fields).toContain('OpenHouseDate');
      expect(fields).toContain('OpenHouseStartTime');
      expect(fields).toContain('OpenHouseEndTime');
    });

    test('should return Room fields', () => {
      const fields = getAllowedFields('Room');
      
      expect(fields).toBeDefined();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields).toContain('RoomKey');
      expect(fields).toContain('ListingKey');
      expect(fields).toContain('RoomType');
      expect(fields).toContain('RoomLevel');
    });

    test('should return Member fields', () => {
      const fields = getAllowedFields('Member');
      
      expect(fields).toBeDefined();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields).toContain('MemberKey');
      expect(fields).toContain('MemberFirstName');
      expect(fields).toContain('MemberLastName');
      expect(fields).toContain('MemberEmail');
      expect(fields).toContain('MemberType');
    });

    test('should return Office fields', () => {
      const fields = getAllowedFields('Office');
      
      expect(fields).toBeDefined();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields).toContain('OfficeKey');
      expect(fields).toContain('OfficeName');
      expect(fields).toContain('OfficeCity');
      expect(fields).toContain('OfficeType');
    });

    test('should return PropertyHistory fields', () => {
      const fields = getAllowedFields('PropertyHistory');
      
      expect(fields).toBeDefined();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields).toContain('HistoryKey');
      expect(fields).toContain('ListingKey');
      expect(fields).toContain('ChangeType');
      expect(fields).toContain('ChangeDate');
    });

    test('should return PropertyFeatures fields', () => {
      const fields = getAllowedFields('PropertyFeatures');
      
      expect(fields).toBeDefined();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields).toContain('FeatureKey');
      expect(fields).toContain('ListingKey');
      expect(fields).toContain('FeatureName');
      expect(fields).toContain('FeatureValue');
    });

    test('should return empty array for unknown resource', () => {
      const fields = getAllowedFields('UnknownResource');
      expect(fields).toEqual([]);
    });
  });

  describe('getAllowedExpandFields', () => {
    test('should return Property expand fields', () => {
      const expandFields = getAllowedExpandFields('Property');
      
      expect(expandFields).toBeDefined();
      expect(Array.isArray(expandFields)).toBe(true);
      expect(expandFields).toContain('Media');
      expect(expandFields).toContain('OpenHouse');
      expect(expandFields).toContain('Room');
      expect(expandFields).toContain('Member');
    });

    test('should return Media expand fields', () => {
      const expandFields = getAllowedExpandFields('Media');
      
      expect(expandFields).toBeDefined();
      expect(Array.isArray(expandFields)).toBe(true);
      expect(expandFields).toContain('Property');
    });

    test('should return OpenHouse expand fields', () => {
      const expandFields = getAllowedExpandFields('OpenHouse');
      
      expect(expandFields).toBeDefined();
      expect(Array.isArray(expandFields)).toBe(true);
      expect(expandFields).toContain('Property');
    });

    test('should return Room expand fields', () => {
      const expandFields = getAllowedExpandFields('Room');
      
      expect(expandFields).toBeDefined();
      expect(Array.isArray(expandFields)).toBe(true);
      expect(expandFields).toContain('Property');
    });

    test('should return Member expand fields', () => {
      const expandFields = getAllowedExpandFields('Member');
      
      expect(expandFields).toBeDefined();
      expect(Array.isArray(expandFields)).toBe(true);
      expect(expandFields).toContain('Office');
      expect(expandFields).toContain('Property');
    });

    test('should return Office expand fields', () => {
      const expandFields = getAllowedExpandFields('Office');
      
      expect(expandFields).toBeDefined();
      expect(Array.isArray(expandFields)).toBe(true);
      expect(expandFields).toContain('Member');
    });

    test('should return PropertyHistory expand fields', () => {
      const expandFields = getAllowedExpandFields('PropertyHistory');
      
      expect(expandFields).toBeDefined();
      expect(Array.isArray(expandFields)).toBe(true);
      expect(expandFields).toContain('Property');
    });

    test('should return PropertyFeatures expand fields', () => {
      const expandFields = getAllowedExpandFields('PropertyFeatures');
      
      expect(expandFields).toBeDefined();
      expect(Array.isArray(expandFields)).toBe(true);
      expect(expandFields).toContain('Property');
    });

    test('should return empty array for unknown resource', () => {
      const expandFields = getAllowedExpandFields('UnknownResource');
      expect(expandFields).toEqual([]);
    });
  });

  describe('createServiceDocument', () => {
    test('should create proper service document structure', () => {
      const serviceDoc = createServiceDocument();
      
      expect(serviceDoc).toBeDefined();
      expect(serviceDoc['@odata.context']).toBe('$metadata');
      expect(serviceDoc.value).toBeDefined();
      expect(Array.isArray(serviceDoc.value)).toBe(true);
    });

    test('should include all entity sets', () => {
      const serviceDoc = createServiceDocument();
      const entitySets = serviceDoc.value;
      
      expect(entitySets).toHaveLength(8);
      
      const setNames = entitySets.map(es => es.name);
      expect(setNames).toContain('Property');
      expect(setNames).toContain('Media');
      expect(setNames).toContain('OpenHouse');
      expect(setNames).toContain('Room');
      expect(setNames).toContain('Member');
      expect(setNames).toContain('Office');
      expect(setNames).toContain('PropertyHistory');
      expect(setNames).toContain('PropertyFeatures');
    });

    test('should have proper entity set structure', () => {
      const serviceDoc = createServiceDocument();
      const propertySet = serviceDoc.value.find(es => es.name === 'Property');
      
      expect(propertySet).toBeDefined();
      expect(propertySet.name).toBe('Property');
      expect(propertySet.kind).toBe('EntitySet');
      expect(propertySet.url).toBe('Property');
    });

    test('should have proper entity set URLs', () => {
      const serviceDoc = createServiceDocument();
      const entitySets = serviceDoc.value;
      
      entitySets.forEach(entitySet => {
        expect(entitySet.url).toBe(entitySet.name);
        expect(entitySet.kind).toBe('EntitySet');
      });
    });
  });
});
