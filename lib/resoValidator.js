// lib/resoValidator.js - RESO Field Validation and Standards Compliance
import 'dotenv/config';

// RESO 2.0.0 Standard Field Definitions and Validation Rules
export const RESO_FIELD_DEFINITIONS = {
  // Core Property Fields
  ListingKey: {
    type: 'string',
    maxLength: 255,
    required: true,
    pattern: /^[A-Za-z0-9\-_]+$/,
    description: 'A unique identifier for a property listing'
  },
  
  ListPrice: {
    type: 'decimal',
    min: 0,
    max: 999999999.99,
    required: false,
    description: 'The price at which the property is offered for sale'
  },
  
  ClosePrice: {
    type: 'decimal',
    min: 0,
    max: 999999999.99,
    required: false,
    description: 'The final price at which the property sold'
  },
  
  MlsStatus: {
    type: 'string',
    maxLength: 50,
    required: true,
    enumValues: [
      'Active',
      'ActiveUnderContract', 
      'Pending',
      'Hold',
      'Sold',
      'Expired',
      'Cancelled',
      'Withdrawn',
      'Incomplete',
      'ComingSoon',
      'Delete'
    ],
    description: 'Current status of the listing in the MLS'
  },
  
  StandardStatus: {
    type: 'string',
    maxLength: 50,
    required: false,
    enumValues: [
      'Active',
      'Pending',
      'Sold',
      'OffMarket'
    ],
    description: 'Standardized status across all MLSs'
  },
  
  PropertyType: {
    type: 'string',
    maxLength: 50,
    required: true,
    enumValues: [
      'Residential',
      'Residential Income',
      'Residential Lease',
      'Commercial Sale',
      'Commercial Lease',
      'Land',
      'Business Opportunity'
    ],
    description: 'A broad categorization of the type of property'
  },
  
  PropertySubType: {
    type: 'string',
    maxLength: 50,
    required: false,
    enumValues: [
      'Single Family Residential',
      'Condominium',
      'Townhouse',
      'Multi-Family',
      'Manufactured',
      'Apartment',
      'Duplex',
      'Triplex',
      'Quadruplex'
    ],
    description: 'A more specific categorization of the PropertyType'
  },
  
  BedroomsAboveGrade: {
    type: 'integer',
    min: 0,
    max: 99,
    required: false,
    description: 'The number of bedrooms that are above grade'
  },
  
  BedroomsBelowGrade: {
    type: 'integer', 
    min: 0,
    max: 99,
    required: false,
    description: 'The number of bedrooms that are below grade'
  },
  
  BathroomsTotalInteger: {
    type: 'integer',
    min: 0,
    max: 99,
    required: false,
    description: 'The total number of bathrooms'
  },
  
  City: {
    type: 'string',
    maxLength: 50,
    required: false,
    pattern: /^[A-Za-z\s\-'\.]+$/,
    description: 'The city where the property is located'
  },
  
  StateOrProvince: {
    type: 'string',
    maxLength: 50,
    required: false,
    pattern: /^[A-Za-z\s]+$/,
    description: 'The state or province where the property is located'
  },
  
  PostalCode: {
    type: 'string',
    maxLength: 10,
    required: false,
    pattern: /^[A-Za-z0-9\s\-]+$/,
    description: 'The postal code where the property is located'
  },
  
  // Timestamp Fields
  ModificationTimestamp: {
    type: 'datetime',
    required: true,
    description: 'Date and time the listing was last modified'
  },
  
  OriginalEntryTimestamp: {
    type: 'datetime',
    required: false,
    description: 'Date and time the listing was first entered into the MLS'
  },
  
  // Media Fields
  MediaKey: {
    type: 'string',
    maxLength: 255,
    required: true,
    pattern: /^[A-Za-z0-9\-_]+$/,
    description: 'A unique identifier for this Media record'
  },
  
  ResourceRecordKey: {
    type: 'string',
    maxLength: 255,
    required: true,
    pattern: /^[A-Za-z0-9\-_]+$/,
    description: 'Foreign key relating to the resource'
  },
  
  MediaURL: {
    type: 'string',
    maxLength: 1024,
    required: true,
    pattern: /^https?:\/\/.+/,
    description: 'The URL where the media may be retrieved'
  },
  
  MediaType: {
    type: 'string',
    maxLength: 50,
    required: false,
    enumValues: [
      'Photo',
      'Video',
      'Document',
      'Audio'
    ],
    description: 'A categorization of the media being provided'
  }
};

// RESO Field Validation Functions
export class ResoValidator {
  static validateField(fieldName, value, definition) {
    const errors = [];
    
    // Check if required field is missing
    if (definition.required && (value === null || value === undefined || value === '')) {
      errors.push(`${fieldName} is required but is missing or empty`);
      return errors;
    }
    
    // Skip validation if field is optional and empty
    if (!definition.required && (value === null || value === undefined || value === '')) {
      return errors;
    }
    
    // Type validation
    switch (definition.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${fieldName} must be a string, got ${typeof value}`);
          break;
        }
        
        // Max length validation
        if (definition.maxLength && value.length > definition.maxLength) {
          errors.push(`${fieldName} exceeds maximum length of ${definition.maxLength} characters`);
        }
        
        // Pattern validation
        if (definition.pattern && !definition.pattern.test(value)) {
          errors.push(`${fieldName} does not match the required pattern`);
        }
        
        // Enum validation
        if (definition.enumValues && !definition.enumValues.includes(value)) {
          errors.push(`${fieldName} must be one of: ${definition.enumValues.join(', ')}`);
        }
        break;
        
      case 'integer':
        const intValue = parseInt(value);
        if (!Number.isInteger(intValue)) {
          errors.push(`${fieldName} must be an integer, got ${value}`);
          break;
        }
        
        if (definition.min !== undefined && intValue < definition.min) {
          errors.push(`${fieldName} must be at least ${definition.min}`);
        }
        
        if (definition.max !== undefined && intValue > definition.max) {
          errors.push(`${fieldName} must be at most ${definition.max}`);
        }
        break;
        
      case 'decimal':
        const decValue = parseFloat(value);
        if (isNaN(decValue)) {
          errors.push(`${fieldName} must be a decimal number, got ${value}`);
          break;
        }
        
        if (definition.min !== undefined && decValue < definition.min) {
          errors.push(`${fieldName} must be at least ${definition.min}`);
        }
        
        if (definition.max !== undefined && decValue > definition.max) {
          errors.push(`${fieldName} must be at most ${definition.max}`);
        }
        break;
        
      case 'datetime':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(`${fieldName} must be a valid ISO 8601 datetime, got ${value}`);
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${fieldName} must be a boolean, got ${typeof value}`);
        }
        break;
    }
    
    return errors;
  }
  
  static validateRecord(record, resourceType = 'Property') {
    const errors = [];
    const warnings = [];
    
    // Get applicable field definitions based on resource type
    let applicableFields = {};
    
    if (resourceType === 'Property') {
      // Core property fields
      Object.keys(RESO_FIELD_DEFINITIONS).forEach(field => {
        if (!['MediaKey', 'ResourceRecordKey', 'MediaURL', 'MediaType'].includes(field)) {
          applicableFields[field] = RESO_FIELD_DEFINITIONS[field];
        }
      });
    } else if (resourceType === 'Media') {
      // Media-specific fields
      ['MediaKey', 'ResourceRecordKey', 'MediaURL', 'MediaType', 'ModificationTimestamp'].forEach(field => {
        if (RESO_FIELD_DEFINITIONS[field]) {
          applicableFields[field] = RESO_FIELD_DEFINITIONS[field];
        }
      });
    }
    
    // Validate each applicable field
    Object.entries(applicableFields).forEach(([fieldName, definition]) => {
      const fieldErrors = this.validateField(fieldName, record[fieldName], definition);
      errors.push(...fieldErrors);
    });
    
    // Check for unknown fields (warnings)
    Object.keys(record).forEach(fieldName => {
      if (!applicableFields[fieldName] && !fieldName.startsWith('_')) {
        warnings.push(`${fieldName} is not a standard RESO field`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  static validateBatch(records, resourceType = 'Property') {
    const results = {
      totalRecords: records.length,
      validRecords: 0,
      invalidRecords: 0,
      errors: [],
      warnings: [],
      details: []
    };
    
    records.forEach((record, index) => {
      const validation = this.validateRecord(record, resourceType);
      
      if (validation.isValid) {
        results.validRecords++;
      } else {
        results.invalidRecords++;
      }
      
      if (validation.errors.length > 0 || validation.warnings.length > 0) {
        results.details.push({
          recordIndex: index,
          recordId: record.ListingKey || record.MediaKey || `Record ${index + 1}`,
          ...validation
        });
      }
      
      results.errors.push(...validation.errors);
      results.warnings.push(...validation.warnings);
    });
    
    return results;
  }
  
  // Clean and normalize field values according to RESO standards
  static normalizeField(fieldName, value) {
    if (value === null || value === undefined) return value;
    
    const definition = RESO_FIELD_DEFINITIONS[fieldName];
    if (!definition) return value;
    
    switch (definition.type) {
      case 'string':
        let stringValue = String(value).trim();
        
        // Capitalize certain fields
        if (['City', 'StateOrProvince'].includes(fieldName)) {
          stringValue = stringValue.replace(/\b\w+/g, word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          );
        }
        
        // Normalize postal codes
        if (fieldName === 'PostalCode') {
          stringValue = stringValue.toUpperCase().replace(/[^A-Z0-9\s\-]/g, '');
        }
        
        return stringValue;
        
      case 'integer':
        return parseInt(value) || null;
        
      case 'decimal':
        return parseFloat(value) || null;
        
      case 'datetime':
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
        
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase().trim();
          return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'y';
        }
        return Boolean(value);
        
      default:
        return value;
    }
  }
  
  static normalizeRecord(record, resourceType = 'Property') {
    const normalized = { ...record };
    
    Object.keys(normalized).forEach(fieldName => {
      if (RESO_FIELD_DEFINITIONS[fieldName]) {
        normalized[fieldName] = this.normalizeField(fieldName, normalized[fieldName]);
      }
    });
    
    return normalized;
  }
}

export default ResoValidator;