// api/reso/metadata.js - RESO Web API Metadata Endpoint
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// RESO 2.0.0 Standard Field Definitions
const RESO_METADATA = {
  "$metadata": {
    "DataSystems": [
      {
        "SystemID": "real-estate-backend",
        "SystemDescription": "Real Estate Backend API",
        "TimeZoneOffset": "UTC",
        "Version": "2.0.0"
      }
    ],
    "Resources": [
      {
        "ResourceID": "Property",
        "StandardName": "Property",
        "ResourcePath": "/Property",
        "Description": "The Property Resource",
        "Fields": [
          {
            "SystemFieldName": "ListingKey",
            "StandardName": "ListingKey",
            "DisplayName": "Listing Key",
            "Definition": "A unique identifier for a property listing",
            "DataType": "String",
            "MaxLength": 255,
            "Required": true
          }
      },
      {
        "ResourceID": "ResidentialFreehold",
        "StandardName": "ResidentialFreehold",
        "ResourcePath": "/ResidentialFreehold",
        "Description": "The Residential Freehold Resource for freehold property details",
        "Fields": [
          {
            "SystemFieldName": "ListingKey",
            "StandardName": "ListingKey", 
            "DisplayName": "Listing Key",
            "Definition": "Foreign key relating to the Property record",
            "DataType": "String",
            "MaxLength": 255,
            "Required": true
          },
          {
            "SystemFieldName": "LotDepth",
            "StandardName": "LotDepth",
            "DisplayName": "Lot Depth",
            "Definition": "The depth of the lot in the units specified",
            "DataType": "Decimal",
            "Required": false
          },
          {
            "SystemFieldName": "LotWidth", 
            "StandardName": "LotWidth",
            "DisplayName": "Lot Width",
            "Definition": "The width of the lot in the units specified",
            "DataType": "Decimal",
            "Required": false
          },
          {
            "SystemFieldName": "TaxAnnualAmount",
            "StandardName": "TaxAnnualAmount",
            "DisplayName": "Tax Annual Amount",
            "Definition": "The annual tax amount for the property",
            "DataType": "Decimal",
            "Required": false
          }
        ]
      },
      {
        "ResourceID": "ResidentialCondo",
        "StandardName": "ResidentialCondo", 
        "ResourcePath": "/ResidentialCondo",
        "Description": "The Residential Condo Resource for condominium property details",
        "Fields": [
          {
            "SystemFieldName": "ListingKey",
            "StandardName": "ListingKey",
            "DisplayName": "Listing Key", 
            "Definition": "Foreign key relating to the Property record",
            "DataType": "String",
            "MaxLength": 255,
            "Required": true
          },
          {
            "SystemFieldName": "UnitNumber",
            "StandardName": "UnitNumber",
            "DisplayName": "Unit Number",
            "Definition": "The unit number of the condominium",
            "DataType": "String",
            "MaxLength": 25,
            "Required": false
          },
          {
            "SystemFieldName": "AssociationFee",
            "StandardName": "AssociationFee",
            "DisplayName": "Association Fee",
            "Definition": "The association or maintenance fee amount",
            "DataType": "Decimal",
            "Required": false
          }
        ]
      },
      {
        "ResourceID": "ResidentialLease",
        "StandardName": "ResidentialLease",
        "ResourcePath": "/ResidentialLease", 
        "Description": "The Residential Lease Resource for rental property details",
        "Fields": [
          {
            "SystemFieldName": "ListingKey",
            "StandardName": "ListingKey",
            "DisplayName": "Listing Key",
            "Definition": "Foreign key relating to the Property record",
            "DataType": "String", 
            "MaxLength": 255,
            "Required": true
          },
          {
            "SystemFieldName": "Furnished",
            "StandardName": "Furnished",
            "DisplayName": "Furnished",
            "Definition": "Indicates if the property is furnished",
            "DataType": "String",
            "MaxLength": 50,
            "LookupValues": ["Yes", "No", "Partial"],
            "Required": false
          }
        ]
      },
      {
        "ResourceID": "PropertyRooms",
        "StandardName": "PropertyRooms",
        "ResourcePath": "/PropertyRooms",
        "Description": "The Property Rooms Resource for room-level property details", 
        "Fields": [
          {
            "SystemFieldName": "RoomKey",
            "StandardName": "RoomKey", 
            "DisplayName": "Room Key",
            "Definition": "A unique identifier for this Room record",
            "DataType": "String",
            "MaxLength": 255,
            "Required": true
          },
          {
            "SystemFieldName": "ListingKey",
            "StandardName": "ListingKey",
            "DisplayName": "Listing Key",
            "Definition": "Foreign key relating to the Property record",
            "DataType": "String",
            "MaxLength": 255,
            "Required": true
          },
          {
            "SystemFieldName": "RoomType", 
            "StandardName": "RoomType",
            "DisplayName": "Room Type",
            "Definition": "The type of room",
            "DataType": "String",
            "MaxLength": 50,
            "LookupValues": ["Kitchen", "Bedroom", "Bathroom", "Living Room", "Dining Room", "Family Room", "Office"],
            "Required": false
          }
        ],
          {
            "SystemFieldName": "ListPrice",
            "StandardName": "ListPrice",
            "DisplayName": "List Price",
            "Definition": "The price at which the property is offered for sale",
            "DataType": "Decimal",
            "Required": false
          },
          {
            "SystemFieldName": "ClosePrice",
            "StandardName": "ClosePrice", 
            "DisplayName": "Close Price",
            "Definition": "The final price at which the property sold",
            "DataType": "Decimal",
            "Required": false
          },
          {
            "SystemFieldName": "MlsStatus",
            "StandardName": "MlsStatus",
            "DisplayName": "MLS Status",
            "Definition": "Current status of the listing in the MLS",
            "DataType": "String",
            "MaxLength": 50,
            "LookupValues": ["Active", "Pending", "Sold", "Expired", "Cancelled", "Withdrawn"],
            "Required": true
          },
          {
            "SystemFieldName": "PropertyType",
            "StandardName": "PropertyType",
            "DisplayName": "Property Type",
            "Definition": "A broad categorization of the type of property",
            "DataType": "String",
            "MaxLength": 50,
            "LookupValues": ["Residential", "Commercial", "Land", "Business Opportunity"],
            "Required": true
          },
          {
            "SystemFieldName": "PropertySubType",
            "StandardName": "PropertySubType", 
            "DisplayName": "Property Sub Type",
            "Definition": "A more specific categorization of the PropertyType",
            "DataType": "String",
            "MaxLength": 50,
            "LookupValues": ["Single Family Residential", "Condominium", "Townhouse", "Multi-Family"],
            "Required": false
          },
          {
            "SystemFieldName": "BedroomsAboveGrade",
            "StandardName": "BedroomsAboveGrade",
            "DisplayName": "Bedrooms Above Grade", 
            "Definition": "The number of bedrooms that are above grade (ground level)",
            "DataType": "Integer",
            "Required": false
          },
          {
            "SystemFieldName": "BathroomsTotalInteger",
            "StandardName": "BathroomsTotalInteger",
            "DisplayName": "Bathrooms Total",
            "Definition": "The total number of bathrooms",
            "DataType": "Integer", 
            "Required": false
          },
          {
            "SystemFieldName": "City",
            "StandardName": "City",
            "DisplayName": "City",
            "Definition": "The city where the property is located",
            "DataType": "String",
            "MaxLength": 50,
            "Required": false
          },
          {
            "SystemFieldName": "StateOrProvince", 
            "StandardName": "StateOrProvince",
            "DisplayName": "State or Province",
            "Definition": "The state or province where the property is located",
            "DataType": "String",
            "MaxLength": 50,
            "Required": false
          },
          {
            "SystemFieldName": "PostalCode",
            "StandardName": "PostalCode",
            "DisplayName": "Postal Code", 
            "Definition": "The postal code where the property is located",
            "DataType": "String",
            "MaxLength": 10,
            "Required": false
          }
        ]
      },
      {
        "ResourceID": "Media",
        "StandardName": "Media",
        "ResourcePath": "/Media", 
        "Description": "The Media Resource for property photos and documents",
        "Fields": [
          {
            "SystemFieldName": "MediaKey",
            "StandardName": "MediaKey",
            "DisplayName": "Media Key",
            "Definition": "A unique identifier for this Media record",
            "DataType": "String",
            "MaxLength": 255,
            "Required": true
          },
          {
            "SystemFieldName": "ResourceRecordKey",
            "StandardName": "ResourceRecordKey", 
            "DisplayName": "Resource Record Key",
            "Definition": "Foreign key relating to the resource for which the media is associated",
            "DataType": "String",
            "MaxLength": 255,
            "Required": true
          },
          {
            "SystemFieldName": "MediaURL",
            "StandardName": "MediaURL",
            "DisplayName": "Media URL",
            "Definition": "The URL where the media may be retrieved",
            "DataType": "String",
            "MaxLength": 1024,
            "Required": true
          },
          {
            "SystemFieldName": "MediaType",
            "StandardName": "MediaType",
            "DisplayName": "Media Type", 
            "Definition": "A categorization of the media being provided",
            "DataType": "String",
            "MaxLength": 50,
            "LookupValues": ["Photo", "Video", "Document"],
            "Required": false
          }
        ]
      },
      {
        "ResourceID": "OpenHouse",
        "StandardName": "OpenHouse", 
        "ResourcePath": "/OpenHouse",
        "Description": "The OpenHouse Resource for scheduled property viewings",
        "Fields": [
          {
            "SystemFieldName": "OpenHouseKey",
            "StandardName": "OpenHouseKey",
            "DisplayName": "Open House Key",
            "Definition": "A unique identifier for this OpenHouse record", 
            "DataType": "String",
            "MaxLength": 255,
            "Required": true
          },
          {
            "SystemFieldName": "ListingKey",
            "StandardName": "ListingKey",
            "DisplayName": "Listing Key",
            "Definition": "Foreign key relating to the Property record",
            "DataType": "String", 
            "MaxLength": 255,
            "Required": true
          },
          {
            "SystemFieldName": "OpenHouseDate",
            "StandardName": "OpenHouseDate",
            "DisplayName": "Open House Date",
            "Definition": "The date of the open house",
            "DataType": "Date",
            "Required": false
          }
        ]
      }
    ],
    "Lookups": [
      {
        "LookupName": "MlsStatus",
        "LookupValues": [
          {"LookupKey": "Active", "LookupValue": "Active", "LookupDisplayOrder": 1},
          {"LookupKey": "Pending", "LookupValue": "Pending", "LookupDisplayOrder": 2}, 
          {"LookupKey": "Sold", "LookupValue": "Sold", "LookupDisplayOrder": 3},
          {"LookupKey": "Expired", "LookupValue": "Expired", "LookupDisplayOrder": 4},
          {"LookupKey": "Cancelled", "LookupValue": "Cancelled", "LookupDisplayOrder": 5},
          {"LookupKey": "Withdrawn", "LookupValue": "Withdrawn", "LookupDisplayOrder": 6}
        ]
      },
      {
        "LookupName": "PropertyType", 
        "LookupValues": [
          {"LookupKey": "Residential", "LookupValue": "Residential", "LookupDisplayOrder": 1},
          {"LookupKey": "Commercial", "LookupValue": "Commercial", "LookupDisplayOrder": 2},
          {"LookupKey": "Land", "LookupValue": "Land", "LookupDisplayOrder": 3},
          {"LookupKey": "Business Opportunity", "LookupValue": "Business Opportunity", "LookupDisplayOrder": 4}
        ]
      },
      {
        "LookupName": "MediaType",
        "LookupValues": [
          {"LookupKey": "Photo", "LookupValue": "Photo", "LookupDisplayOrder": 1},
          {"LookupKey": "Video", "LookupValue": "Video", "LookupDisplayOrder": 2},
          {"LookupKey": "Document", "LookupValue": "Document", "LookupDisplayOrder": 3}
        ]
      }
    ]
  }
};

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: {
        code: "MethodNotAllowed",
        message: "Only GET requests are supported for metadata endpoint"
      }
    });
  }

  try {
    // Set RESO-compliant headers
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.setHeader('OData-Version', '4.0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Return RESO metadata
    res.status(200).json(RESO_METADATA);

  } catch (error) {
    console.error('❌ RESO Metadata endpoint error:', error);
    
    res.status(500).json({
      error: {
        code: "InternalServerError",
        message: "Failed to retrieve metadata",
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}