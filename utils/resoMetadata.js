/**
 * RESO Metadata Generator for OData 4.0
 * Generates metadata document compliant with RESO Web API 2.0.0
 */

/**
 * Generate OData metadata document for RESO resources
 * @returns {Object} OData metadata document
 */
export function generateRESOMetadata() {
  return {
    $metadata: {
      version: "4.0",
      dataServices: [{
        dataServiceVersion: "2.0",
        schema: [{
          namespace: "RESO.RealEstate",
          entityType: [
            generatePropertyEntityType(),
            generateMediaEntityType(),
            generateOpenHouseEntityType(),
            generateRoomEntityType(),
            generateMemberEntityType(),
            generateOfficeEntityType()
          ],
          entityContainer: [{
            name: "RealEstateContainer",
            entitySet: [
              { name: "Property", entityType: "RESO.RealEstate.Property" },
              { name: "Media", entityType: "RESO.RealEstate.Media" },
              { name: "OpenHouse", entityType: "RESO.RealEstate.OpenHouse" },
              { name: "Room", entityType: "RESO.RealEstate.Room" },
              { name: "Member", entityType: "RESO.RealEstate.Member" },
              { name: "Office", entityType: "RESO.RealEstate.Office" }
            ]
          }]
        }]
      }]
    }
  };
}

/**
 * Generate Property entity type definition
 * @returns {Object} Property entity type
 */
function generatePropertyEntityType() {
  return {
    name: "Property",
    key: [{ name: "ListingKey" }],
    property: [
      // Primary identifiers
      { name: "ListingKey", type: "Edm.String", nullable: false },
      { name: "ListPrice", type: "Edm.Decimal", nullable: true },
      { name: "ClosePrice", type: "Edm.Decimal", nullable: true },
      
      // Status fields
      { name: "StandardStatus", type: "Edm.String", nullable: true },
      { name: "ContractStatus", type: "Edm.String", nullable: true },
      { name: "TransactionType", type: "Edm.String", nullable: true },
      
      // Property type and style
      { name: "PropertyType", type: "Edm.String", nullable: true },
      { name: "PropertySubType", type: "Edm.String", nullable: true },
      { name: "ArchitecturalStyle", type: "Edm.String", nullable: true },
      
      // Address fields
      { name: "UnparsedAddress", type: "Edm.String", nullable: true },
      { name: "StreetNumber", type: "Edm.String", nullable: true },
      { name: "StreetName", type: "Edm.String", nullable: true },
      { name: "StreetSuffix", type: "Edm.String", nullable: true },
      { name: "City", type: "Edm.String", nullable: true },
      { name: "StateOrProvince", type: "Edm.String", nullable: true },
      { name: "PostalCode", type: "Edm.String", nullable: true },
      { name: "CountyOrParish", type: "Edm.String", nullable: true },
      
      // Room counts
      { name: "BedroomsTotal", type: "Edm.Int32", nullable: true },
      { name: "BathroomsTotal", type: "Edm.Decimal", nullable: true },
      { name: "KitchensTotal", type: "Edm.Int32", nullable: true },
      
      // Descriptions
      { name: "PublicRemarks", type: "Edm.String", nullable: true },
      { name: "PossessionDetails", type: "Edm.String", nullable: true },
      
      // Timestamps
      { name: "ModificationTimestamp", type: "Edm.DateTimeOffset", nullable: true },
      { name: "OriginalEntryTimestamp", type: "Edm.DateTimeOffset", nullable: true },
      { name: "CloseDate", type: "Edm.Date", nullable: true },
      
      // Property features
      { name: "Cooling", type: "Edm.String", nullable: true },
      { name: "Heating", type: "Edm.String", nullable: true },
      { name: "Sewer", type: "Edm.String", nullable: true },
      { name: "Water", type: "Edm.String", nullable: true },
      { name: "FireplaceYN", type: "Edm.Boolean", nullable: true },
      { name: "PoolFeatures", type: "Edm.String", nullable: true },
      { name: "WaterfrontYN", type: "Edm.Boolean", nullable: true },
      
      // Parking
      { name: "ParkingSpaces", type: "Edm.Int32", nullable: true },
      { name: "GarageSpaces", type: "Edm.Int32", nullable: true },
      
      // Data source tracking
      { name: "DataSource", type: "Edm.String", nullable: true }
    ],
    navigationProperty: [
      { name: "Media", type: "RESO.RealEstate.Media", collection: true },
      { name: "OpenHouse", type: "RESO.RealEstate.OpenHouse", collection: true },
      { name: "Room", type: "RESO.RealEstate.Room", collection: true },
      { name: "Member", type: "RESO.RealEstate.Member" }
    ]
  };
}

/**
 * Generate Media entity type definition
 * @returns {Object} Media entity type
 */
function generateMediaEntityType() {
  return {
    name: "Media",
    key: [{ name: "MediaKey" }],
    property: [
      { name: "MediaKey", type: "Edm.String", nullable: false },
      { name: "ResourceRecordKey", type: "Edm.String", nullable: true },
      { name: "ResourceName", type: "Edm.String", nullable: true },
      { name: "MediaURL", type: "Edm.String", nullable: true },
      { name: "MediaType", type: "Edm.String", nullable: true },
      { name: "MediaCategory", type: "Edm.String", nullable: true },
      { name: "Order", type: "Edm.Int32", nullable: true },
      { name: "Caption", type: "Edm.String", nullable: true },
      { name: "Description", type: "Edm.String", nullable: true },
      { name: "Width", type: "Edm.Int32", nullable: true },
      { name: "Height", type: "Edm.Int32", nullable: true },
      { name: "FileSize", type: "Edm.Int64", nullable: true },
      { name: "ModificationTimestamp", type: "Edm.DateTimeOffset", nullable: true }
    ],
    navigationProperty: [
      { name: "Property", type: "RESO.RealEstate.Property" }
    ]
  };
}

/**
 * Generate OpenHouse entity type definition
 * @returns {Object} OpenHouse entity type
 */
function generateOpenHouseEntityType() {
  return {
    name: "OpenHouse",
    key: [{ name: "OpenHouseKey" }],
    property: [
      { name: "OpenHouseKey", type: "Edm.String", nullable: false },
      { name: "ListingKey", type: "Edm.String", nullable: true },
      { name: "OpenHouseDate", type: "Edm.Date", nullable: true },
      { name: "OpenHouseStartTime", type: "Edm.TimeOfDay", nullable: true },
      { name: "OpenHouseEndTime", type: "Edm.TimeOfDay", nullable: true },
      { name: "OpenHouseDescription", type: "Edm.String", nullable: true },
      { name: "OpenHouseType", type: "Edm.String", nullable: true },
      { name: "RefreshmentsYN", type: "Edm.Boolean", nullable: true },
      { name: "ShowingAgentName", type: "Edm.String", nullable: true },
      { name: "ShowingAgentPhone", type: "Edm.String", nullable: true },
      { name: "ModificationTimestamp", type: "Edm.DateTimeOffset", nullable: true }
    ],
    navigationProperty: [
      { name: "Property", type: "RESO.RealEstate.Property" }
    ]
  };
}

/**
 * Generate Room entity type definition
 * @returns {Object} Room entity type
 */
function generateRoomEntityType() {
  return {
    name: "Room",
    key: [{ name: "RoomKey" }],
    property: [
      { name: "RoomKey", type: "Edm.String", nullable: false },
      { name: "ListingKey", type: "Edm.String", nullable: true },
      { name: "RoomType", type: "Edm.String", nullable: true },
      { name: "RoomLevel", type: "Edm.String", nullable: true },
      { name: "RoomDimensions", type: "Edm.String", nullable: true },
      { name: "RoomFeatures", type: "Edm.String", nullable: true },
      { name: "RoomDescription", type: "Edm.String", nullable: true },
      { name: "ModificationTimestamp", type: "Edm.DateTimeOffset", nullable: true }
    ],
    navigationProperty: [
      { name: "Property", type: "RESO.RealEstate.Property" }
    ]
  };
}

/**
 * Generate Member entity type definition
 * @returns {Object} Member entity type
 */
function generateMemberEntityType() {
  return {
    name: "Member",
    key: [{ name: "MemberKey" }],
    property: [
      { name: "MemberKey", type: "Edm.String", nullable: false },
      { name: "MemberFirstName", type: "Edm.String", nullable: true },
      { name: "MemberLastName", type: "Edm.String", nullable: true },
      { name: "MemberFullName", type: "Edm.String", nullable: true },
      { name: "MemberEmail", type: "Edm.String", nullable: true },
      { name: "MemberPhone", type: "Edm.String", nullable: true },
      { name: "MemberType", type: "Edm.String", nullable: true },
      { name: "LicenseNumber", type: "Edm.String", nullable: true },
      { name: "MemberStatus", type: "Edm.String", nullable: true },
      { name: "OfficeKey", type: "Edm.String", nullable: true },
      { name: "ModificationTimestamp", type: "Edm.DateTimeOffset", nullable: true }
    ],
    navigationProperty: [
      { name: "Office", type: "RESO.RealEstate.Office" },
      { name: "Property", type: "RESO.RealEstate.Property", collection: true }
    ]
  };
}

/**
 * Generate Office entity type definition
 * @returns {Object} Office entity type
 */
function generateOfficeEntityType() {
  return {
    name: "Office",
    key: [{ name: "OfficeKey" }],
    property: [
      { name: "OfficeKey", type: "Edm.String", nullable: false },
      { name: "OfficeName", type: "Edm.String", nullable: true },
      { name: "OfficeAddress1", type: "Edm.String", nullable: true },
      { name: "OfficeAddress2", type: "Edm.String", nullable: true },
      { name: "OfficeCity", type: "Edm.String", nullable: true },
      { name: "OfficeState", type: "Edm.String", nullable: true },
      { name: "OfficePostalCode", type: "Edm.String", nullable: true },
      { name: "OfficePhone", type: "Edm.String", nullable: true },
      { name: "OfficeEmail", type: "Edm.String", nullable: true },
      { name: "OfficeWebsite", type: "Edm.String", nullable: true },
      { name: "OfficeLicenseNumber", type: "Edm.String", nullable: true },
      { name: "OfficeType", type: "Edm.String", nullable: true },
      { name: "ModificationTimestamp", type: "Edm.DateTimeOffset", nullable: true }
    ],
    navigationProperty: [
      { name: "Member", type: "RESO.RealEstate.Member", collection: true }
    ]
  };
}

/**
 * Get allowed fields for a specific resource
 * @param {string} resourceName - Name of the resource
 * @returns {Array} Array of allowed field names
 */
export function getAllowedFields(resourceName) {
  const fieldMaps = {
    Property: [
      'ListingKey', 'ListPrice', 'ClosePrice', 'StandardStatus', 'ContractStatus',
      'TransactionType', 'PropertyType', 'PropertySubType', 'ArchitecturalStyle',
      'UnparsedAddress', 'StreetNumber', 'StreetName', 'StreetSuffix',
      'City', 'StateOrProvince', 'PostalCode', 'CountyOrParish',
      'BedroomsTotal', 'BathroomsTotal', 'KitchensTotal',
      'PublicRemarks', 'PossessionDetails', 'ModificationTimestamp',
      'OriginalEntryTimestamp', 'CloseDate', 'Cooling', 'Heating',
      'Sewer', 'Water', 'FireplaceYN', 'PoolFeatures', 'WaterfrontYN',
      'ParkingSpaces', 'GarageSpaces', 'DataSource'
    ],
    Media: [
      'MediaKey', 'ResourceRecordKey', 'ResourceName', 'MediaURL', 'MediaType',
      'MediaCategory', 'Order', 'Caption', 'Description', 'Width', 'Height',
      'FileSize', 'ModificationTimestamp'
    ],
    OpenHouse: [
      'OpenHouseKey', 'ListingKey', 'OpenHouseDate', 'OpenHouseStartTime',
      'OpenHouseEndTime', 'OpenHouseDescription', 'OpenHouseType',
      'RefreshmentsYN', 'ShowingAgentName', 'ShowingAgentPhone',
      'ModificationTimestamp'
    ],
    Room: [
      'RoomKey', 'ListingKey', 'RoomType', 'RoomLevel', 'RoomDimensions',
      'RoomFeatures', 'RoomDescription', 'ModificationTimestamp'
    ],
    Member: [
      'MemberKey', 'MemberFirstName', 'MemberLastName', 'MemberFullName',
      'MemberEmail', 'MemberPhone', 'MemberType', 'LicenseNumber',
      'MemberStatus', 'OfficeKey', 'ModificationTimestamp'
    ],
    Office: [
      'OfficeKey', 'OfficeName', 'OfficeAddress1', 'OfficeAddress2',
      'OfficeCity', 'OfficeState', 'OfficePostalCode', 'OfficePhone',
      'OfficeEmail', 'OfficeWebsite', 'OfficeLicenseNumber', 'OfficeType',
      'ModificationTimestamp'
    ]
  };

  return fieldMaps[resourceName] || [];
}

/**
 * Get allowed expand fields for a specific resource
 * @param {string} resourceName - Name of the resource
 * @returns {Array} Array of allowed expand field names
 */
export function getAllowedExpandFields(resourceName) {
  const expandMaps = {
    Property: ['Media', 'OpenHouse', 'Room', 'Member'],
    Media: ['Property'],
    OpenHouse: ['Property'],
    Room: ['Property'],
    Member: ['Office', 'Property'],
    Office: ['Member']
  };

  return expandMaps[resourceName] || [];
}

/**
 * Create OData service document
 * @returns {Object} OData service document
 */
export function createServiceDocument() {
  return {
    "@odata.context": "$metadata",
    value: [
      {
        name: "Property",
        kind: "EntitySet",
        url: "Property"
      },
      {
        name: "Media",
        kind: "EntitySet",
        url: "Media"
      },
      {
        name: "OpenHouse",
        kind: "EntitySet",
        url: "OpenHouse"
      },
      {
        name: "Room",
        kind: "EntitySet",
        url: "Room"
      },
      {
        name: "Member",
        kind: "EntitySet",
        url: "Member"
      },
      {
        name: "Office",
        kind: "EntitySet",
        url: "Office"
      }
    ]
  };
}
