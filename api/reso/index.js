// api/reso/index.js - RESO Web API Root Endpoint
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: {
        code: "MethodNotAllowed",
        message: "Only GET requests are supported for RESO API root"
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

    // Build base URL for relative paths
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'localhost';
    const baseUrl = `${protocol}://${host}/api/reso`;

    // RESO Web API Service Document
    const serviceDocument = {
      "@odata.context": `${baseUrl}/$metadata`,
      "@odata.id": baseUrl,
      "value": [
        {
          "name": "Property",
          "kind": "EntitySet",
          "url": "Property",
          "title": "Property Resource",
          "description": "Property listings and details"
        },
        "ResidentialFreehold": {
          "endpoint": `${baseUrl}/ResidentialFreehold`,
          "description": "Query freehold property details",
          "supports": [
            "$filter", "$select", "$orderby", "$top", "$skip", "$count"
          ],
          "examples": [
            `${baseUrl}/ResidentialFreehold`,
            `${baseUrl}/ResidentialFreehold?$filter=ListingKey eq 'ABC123'`,
            `${baseUrl}/ResidentialFreehold?$filter=LotDepth gt 100`,
            `${baseUrl}/ResidentialFreehold?$filter=TaxAnnualAmount lt 5000`,
            `${baseUrl}/ResidentialFreehold?$select=ListingKey,LotDepth,LotWidth,TaxAnnualAmount`,
            `${baseUrl}/ResidentialFreehold?$orderby=TaxAnnualAmount asc&$top=50`
          ]
        },
        "ResidentialCondo": {
          "endpoint": `${baseUrl}/ResidentialCondo`,
          "description": "Query condominium property details",
          "supports": [
            "$filter", "$select", "$orderby", "$top", "$skip", "$count"
          ],
          "examples": [
            `${baseUrl}/ResidentialCondo`,
            `${baseUrl}/ResidentialCondo?$filter=ListingKey eq 'ABC123'`,
            `${baseUrl}/ResidentialCondo?$filter=AssociationFee lt 500`,
            `${baseUrl}/ResidentialCondo?$filter=contains(PetsAllowed,'Dogs')`,
            `${baseUrl}/ResidentialCondo?$select=ListingKey,UnitNumber,AssociationFee,PetsAllowed`,
            `${baseUrl}/ResidentialCondo?$orderby=AssociationFee asc&$top=25`
          ]
        },
        "ResidentialLease": {
          "endpoint": `${baseUrl}/ResidentialLease`, 
          "description": "Query rental/lease property details",
          "supports": [
            "$filter", "$select", "$orderby", "$top", "$skip", "$count"
          ],
          "examples": [
            `${baseUrl}/ResidentialLease`,
            `${baseUrl}/ResidentialLease?$filter=ListingKey eq 'ABC123'`,
            `${baseUrl}/ResidentialLease?$filter=Furnished eq 'Yes'`,
            `${baseUrl}/ResidentialLease?$filter=contains(RentIncludes,'utilities')`,
            `${baseUrl}/ResidentialLease?$select=ListingKey,Furnished,RentIncludes`,
            `${baseUrl}/ResidentialLease?$orderby=ListingKey asc&$top=100`
          ]
        },
        "PropertyRooms": {
          "endpoint": `${baseUrl}/PropertyRooms`,
          "description": "Query property room details",
          "supports": [
            "$filter", "$select", "$orderby", "$top", "$skip", "$count"
          ],
          "examples": [
            `${baseUrl}/PropertyRooms`,
            `${baseUrl}/PropertyRooms?$filter=ListingKey eq 'ABC123'`,
            `${baseUrl}/PropertyRooms?$filter=RoomType eq 'Kitchen'`,
            `${baseUrl}/PropertyRooms?$filter=RoomArea gt 200`,
            `${baseUrl}/PropertyRooms?$select=RoomKey,ListingKey,RoomType,RoomArea`,
            `${baseUrl}/PropertyRooms?$orderby=RoomType asc,Order asc&$top=50`
          ],
        {
          "name": "Media", 
          "kind": "EntitySet",
          "url": "Media",
          "title": "Media Resource",
          "description": "Property photos, videos, and documents"
        },
        {
          "name": "OpenHouse",
          "kind": "EntitySet", 
          "url": "OpenHouse",
          "title": "OpenHouse Resource",
          "description": "Scheduled property open houses and showings"
        },
        {
          "name": "ResidentialFreehold",
          "kind": "EntitySet",
          "url": "ResidentialFreehold", 
          "title": "Residential Freehold Resource",
          "description": "Freehold property specific details"
        },
        {
          "name": "ResidentialCondo",
          "kind": "EntitySet",
          "url": "ResidentialCondo",
          "title": "Residential Condo Resource", 
          "description": "Condominium property specific details"
        },
        {
          "name": "ResidentialLease",
          "kind": "EntitySet",
          "url": "ResidentialLease",
          "title": "Residential Lease Resource",
          "description": "Rental/lease property specific details"
        },
        {
          "name": "PropertyRooms",
          "kind": "EntitySet",
          "url": "PropertyRooms",
          "title": "Property Rooms Resource",
          "description": "Room-level property details"
        }
      ],
      "resources": {
        "Property": {
          "endpoint": `${baseUrl}/Property`,
          "description": "Query property listings",
          "supports": [
            "$filter", "$select", "$orderby", "$top", "$skip", "$count"
          ],
          "examples": [
            `${baseUrl}/Property`,
            `${baseUrl}/Property?$filter=MlsStatus eq 'Active'`,
            `${baseUrl}/Property?$filter=City eq 'Toronto'`,
            `${baseUrl}/Property?$filter=ListPrice gt 500000`,
            `${baseUrl}/Property?$select=ListingKey,ListPrice,City,BedroomsAboveGrade`,
            `${baseUrl}/Property?$orderby=ListPrice desc&$top=50`
          ]
        },
        "Media": {
          "endpoint": `${baseUrl}/Media`,
          "description": "Query property media (photos, videos)",
          "supports": [
            "$filter", "$select", "$orderby", "$top", "$skip", "$count"
          ],
          "examples": [
            `${baseUrl}/Media`,
            `${baseUrl}/Media?$filter=ResourceRecordKey eq '12345'`,
            `${baseUrl}/Media?$filter=MediaType eq 'Photo'`,
            `${baseUrl}/Media?$filter=PreferredPhotoYN eq true`,
            `${baseUrl}/Media?$select=MediaKey,MediaURL,MediaType`,
            `${baseUrl}/Media?$orderby=Order asc&$top=10`
          ]
        },
        "OpenHouse": {
          "endpoint": `${baseUrl}/OpenHouse`,
          "description": "Query scheduled open houses",
          "supports": [
            "$filter", "$select", "$orderby", "$top", "$skip", "$count"
          ],
          "examples": [
            `${baseUrl}/OpenHouse`,
            `${baseUrl}/OpenHouse?$filter=OpenHouseStatus eq 'Active'`,
            `${baseUrl}/OpenHouse?$filter=OpenHouseDate ge datetime'2025-01-01T00:00:00Z'`,
            `${baseUrl}/OpenHouse?$filter=ListingKey eq '12345'`,
            `${baseUrl}/OpenHouse?$select=OpenHouseKey,ListingKey,OpenHouseDate`,
            `${baseUrl}/OpenHouse?$orderby=OpenHouseDate asc&$top=25`
          ]
        }
      },
      "metadata": {
        "endpoint": `${baseUrl}/$metadata`,
        "description": "RESO metadata document with field definitions and lookups"
      },
      "version": {
        "reso": "2.0.0",
        "odata": "4.0",
        "system": "real-estate-backend",
        "lastUpdated": new Date().toISOString()
      },
      "capabilities": {
        "supports_odata_queries": true,
        "supports_pagination": true,
        "supports_filtering": true,
        "supports_sorting": true,
        "supports_field_selection": true,
        "supports_count": true,
        "max_records_per_request": 10000,
        "default_records_per_request": 1000
      },
      "contact": {
        "documentation": `${baseUrl}/$metadata`,
        "support": "API support available through standard endpoints"
      }
    };

    res.status(200).json(serviceDocument);

  } catch (error) {
    console.error('❌ RESO API root endpoint error:', error);
    
    res.status(500).json({
      error: {
        code: "InternalServerError",
        message: "Failed to retrieve service document",
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}