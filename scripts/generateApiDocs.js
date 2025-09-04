#!/usr/bin/env node

/**
 * API Documentation Generator
 * Generates comprehensive documentation for RESO Web API 2.0.0
 */

import fs from 'fs/promises';
import path from 'path';

// API Documentation Template
const API_DOCS_TEMPLATE = `# 🏗️ RESO Web API 2.0.0 Documentation

## 📋 Overview

This API provides real estate data in compliance with the **RESO Web API 2.0.0** specification and **OData 4.0** standards.

**Base URL:** \`/api/reso\`

**Version:** 2.0.0

**Compliance:** RESO Web API 2.0.0, OData 4.0

---

## 🔗 Endpoints

### OData Metadata
- **GET** \`/api/reso/$metadata\` - OData metadata document
- **GET** \`/api/reso/\` - OData service document

### Resources
- **GET** \`/api/reso/Property\` - Property listings
- **GET** \`/api/reso/Media\` - Property media
- **GET** \`/api/reso/OpenHouse\` - Open house events
- **GET** \`/api/reso/Room\` - Property room details
- **GET** \`/api/reso/Member\` - Agent/broker information
- **GET** \`/api/reso/Office\` - Brokerage office information

---

## 📊 OData Query Support

### Supported Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| \`$select\` | Select specific fields | \`?$select=ListingKey,ListPrice,City\` |
| \`$filter\` | Filter results | \`?$filter=City eq 'Toronto'\` |
| \`$orderby\` | Sort results | \`?$orderby=ListPrice desc\` |
| \`$top\` | Limit results | \`?$top=10\` |
| \`$skip\` | Skip results | \`?$skip=20\` |
| \`$expand\` | Include related data | \`?$expand=Media,OpenHouse\` |
| \`$count\` | Include count | \`?$count=true\` |

### Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| \`eq\` | Equal | \`City eq 'Toronto'\` |
| \`ne\` | Not equal | \`PropertyType ne 'Condo'\` |
| \`gt\` | Greater than | \`ListPrice gt 500000\` |
| \`lt\` | Less than | \`ListPrice lt 1000000\` |
| \`ge\` | Greater than or equal | \`BedroomsTotal ge 3\` |
| \`le\` | Less than or equal | \`BathroomsTotal le 2\` |
| \`contains\` | Contains text | \`contains(City, 'York')\` |

---

## 🏠 Property Resource

### Endpoint
\`GET /api/reso/Property\`

### Description
Retrieves property listings with full OData query support.

### Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| \`ListingKey\` | String | Unique property identifier | \`"ABC123"\` |
| \`ListPrice\` | Decimal | Listing price | \`500000.00\` |
| \`StandardStatus\` | String | Property status | \`"Active"\` |
| \`PropertyType\` | String | Type of property | \`"Residential"\` |
| \`City\` | String | City name | \`"Toronto"\` |
| \`BedroomsTotal\` | Integer | Number of bedrooms | \`3\` |
| \`BathroomsTotal\` | Decimal | Number of bathrooms | \`2.5\` |

### Examples

#### Basic Query
\`\`\`http
GET /api/reso/Property
\`\`\`

#### With Filtering
\`\`\`http
GET /api/reso/Property?$filter=City eq 'Toronto' and ListPrice ge 500000
\`\`\`

#### With Selection and Ordering
\`\`\`http
GET /api/reso/Property?$select=ListingKey,ListPrice,City&$orderby=ListPrice desc&$top=10
\`\`\`

#### With Expansion
\`\`\`http
GET /api/reso/Property?$expand=Media,OpenHouse&$filter=City eq 'Vancouver'
\`\`\`

---

## 🖼️ Media Resource

### Endpoint
\`GET /api/reso/Media\`

### Description
Retrieves property media (photos, videos, documents).

### Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| \`MediaKey\` | String | Unique media identifier | \`"MEDIA123"\` |
| \`ResourceRecordKey\` | String | Associated property | \`"ABC123"\` |
| \`MediaURL\` | String | Media file URL | \`"https://...\` |
| \`MediaType\` | String | Type of media | \`"Photo"\` |
| \`Order\` | Integer | Display order | \`1\` |

### Examples

#### Get All Media
\`\`\`http
GET /api/reso/Media
\`\`\`

#### Get Media for Specific Property
\`\`\`http
GET /api/reso/Media?$filter=ResourceRecordKey eq 'ABC123'
\`\`\`

---

## 🏠 OpenHouse Resource

### Endpoint
\`GET /api/reso/OpenHouse\`

### Description
Retrieves open house events and schedules.

### Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| \`OpenHouseKey\` | String | Unique open house identifier | \`"OH123"\` |
| \`ListingKey\` | String | Associated property | \`"ABC123"\` |
| \`OpenHouseDate\` | Date | Open house date | \`"2024-01-15"\` |
| \`OpenHouseStartTime\` | Time | Start time | \`"14:00:00"\` |
| \`OpenHouseEndTime\` | Time | End time | \`"16:00:00"\` |

### Examples

#### Get All Open Houses
\`\`\`http
GET /api/reso/OpenHouse
\`\`\`

#### Get Open Houses for Specific Property
\`\`\`http
GET /api/reso/OpenHouse?$filter=ListingKey eq 'ABC123'
\`\`\`

---

## 🚪 Room Resource

### Endpoint
\`GET /api/reso/Room\`

### Description
Retrieves detailed room information for properties.

### Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| \`RoomKey\` | String | Unique room identifier | \`"ROOM123"\` |
| \`ListingKey\` | String | Associated property | \`"ABC123"\` |
| \`RoomType\` | String | Type of room | \`"Master Bedroom"\` |
| \`RoomLevel\` | String | Floor level | \`"Main Floor"\` |
| \`RoomFeatures\` | String | Room features | \`"Walk-in Closet, Ensuite"\` |

---

## 👤 Member Resource

### Endpoint
\`GET /api/reso/Member\`

### Description
Retrieves agent and broker information.

### Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| \`MemberKey\` | String | Unique member identifier | \`"MEMBER123"\` |
| \`MemberFirstName\` | String | First name | \`"John"\` |
| \`MemberLastName\` | String | Last name | \`"Smith"\` |
| \`MemberEmail\` | String | Email address | \`"john@example.com"\` |
| \`LicenseNumber\` | String | Real estate license | \`"12345"\` |

---

## 🏢 Office Resource

### Endpoint
\`GET /api/reso/Office\`

### Description
Retrieves brokerage office information.

### Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| \`OfficeKey\` | String | Unique office identifier | \`"OFFICE123"\` |
| \`OfficeName\` | String | Office name | \`"Century 21 Real Estate"\` |
| \`OfficeAddress1\` | String | Street address | \`"123 Main St"\` |
| \`OfficeCity\` | String | City | \`"Toronto"\` |
| \`OfficePhone\` | String | Phone number | \`"416-555-0123"\` |

---

## 🔐 Authentication

### Current Implementation
- **Public Access:** All read operations are publicly accessible
- **Admin Access:** Write operations require admin authentication
- **JWT Tokens:** Admin operations use Supabase JWT authentication

### Future Enhancements
- API key authentication for external consumers
- Rate limiting per API key
- OAuth2 flow for third-party integrations

---

## 📝 Response Format

### Success Response
\`\`\`json
{
  "@odata.context": "$metadata#Property",
  "value": [
    {
      "ListingKey": "ABC123",
      "ListPrice": 500000.00,
      "City": "Toronto",
      "PropertyType": "Residential"
    }
  ],
  "@odata.count": 1
}
\`\`\`

### Error Response
\`\`\`json
{
  "error": {
    "code": "BadRequest",
    "message": "Invalid OData query",
    "details": ["$filter syntax error"]
  }
}
\`\`\`

---

## 🚀 Getting Started

### 1. Test the API
\`\`\`bash
# Test basic endpoint
curl http://localhost:3000/api/reso/

# Test metadata
curl http://localhost:3000/api/reso/$metadata

# Test properties
curl http://localhost:3000/api/reso/Property
\`\`\`

### 2. Run Compliance Tests
\`\`\`bash
npm run validate-reso
\`\`\`

### 3. Explore with OData Queries
\`\`\`bash
# Filter properties by city
curl "http://localhost:3000/api/reso/Property?$filter=City eq 'Toronto'"

# Select specific fields
curl "http://localhost:3000/api/reso/Property?$select=ListingKey,ListPrice,City"

# Expand related data
curl "http://localhost:3000/api/reso/Property?$expand=Media,OpenHouse"
\`\`\`

---

## 📚 Additional Resources

- **RESO Standards:** [https://www.reso.org/](https://www.reso.org/)
- **OData Specification:** [https://docs.oasis-open.org/odata/odata/v4.0/os/part1-protocol/odata-v4.0-os-part1-protocol.html](https://docs.oasis-open.org/odata/odata/v4.0/os/part1-protocol/odata-v4.0-os-part1-protocol.html)
- **Real Estate Standards:** [https://www.reso.org/standards/](https://www.reso.org/standards/)

---

## 🔄 Version History

- **v2.0.0** - Initial RESO Web API 2.0.0 implementation
- **v1.0.0** - Basic REST API implementation

---

**Generated:** {{GENERATION_DATE}}  
**API Version:** 2.0.0  
**Compliance:** RESO Web API 2.0.0, OData 4.0
`;

/**
 * Generate API documentation
 * @param {string} outputPath - Output file path
 */
async function generateApiDocs(outputPath = './API_DOCUMENTATION.md') {
  try {
    console.log('📚 Generating API Documentation...');
    
    // Replace template variables
    const docs = API_DOCS_TEMPLATE
      .replace('{{GENERATION_DATE}}', new Date().toISOString())
      .replace('{{API_VERSION}}', '2.0.0');
    
    // Write documentation file
    await fs.writeFile(outputPath, docs, 'utf8');
    
    console.log(`✅ Documentation generated successfully!`);
    console.log(`📁 Output file: ${path.resolve(outputPath)}`);
    
    // Generate additional formats if needed
    await generateOpenAPISpec();
    
  } catch (error) {
    console.error('❌ Failed to generate documentation:', error);
    throw error;
  }
}

/**
 * Generate OpenAPI specification
 */
async function generateOpenAPISpec() {
  try {
    const openAPISpec = {
      openapi: '3.0.0',
      info: {
        title: 'RESO Web API 2.0.0',
        description: 'Real Estate API compliant with RESO Web API 2.0.0 and OData 4.0',
        version: '2.0.0',
        contact: {
          name: 'API Support',
          url: 'https://www.reso.org/'
        }
      },
      servers: [
        {
          url: 'http://localhost:3000/api/reso',
          description: 'Development server'
        }
      ],
      paths: {
        '/': {
          get: {
            summary: 'OData Service Document',
            description: 'Returns the OData service document',
            responses: {
              '200': {
                description: 'Service document',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        '@odata.context': { type: 'string' },
                        value: { type: 'array' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/$metadata': {
          get: {
            summary: 'OData Metadata',
            description: 'Returns the OData metadata document',
            responses: {
              '200': {
                description: 'Metadata document',
                content: {
                  'application/xml': {
                    schema: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        '/Property': {
          get: {
            summary: 'Get Properties',
            description: 'Retrieves property listings with OData query support',
            parameters: [
              {
                name: '$select',
                in: 'query',
                description: 'Select specific fields',
                schema: { type: 'string' }
              },
              {
                name: '$filter',
                in: 'query',
                description: 'Filter results',
                schema: { type: 'string' }
              },
              {
                name: '$orderby',
                in: 'query',
                description: 'Sort results',
                schema: { type: 'string' }
              },
              {
                name: '$top',
                in: 'query',
                description: 'Limit results',
                schema: { type: 'integer' }
              },
              {
                name: '$skip',
                in: 'query',
                description: 'Skip results',
                schema: { type: 'integer' }
              },
              {
                name: '$expand',
                in: 'query',
                description: 'Include related data',
                schema: { type: 'string' }
              }
            ],
            responses: {
              '200': {
                description: 'Properties retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        '@odata.context': { type: 'string' },
                        value: { type: 'array' },
                        '@odata.count': { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    const openAPIPath = './openapi-spec.json';
    await fs.writeFile(openAPIPath, JSON.stringify(openAPISpec, null, 2));
    console.log(`📋 OpenAPI specification generated: ${path.resolve(openAPIPath)}`);
    
  } catch (error) {
    console.error('⚠️ Failed to generate OpenAPI spec:', error);
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const outputPath = process.argv[2] || './API_DOCUMENTATION.md';
  generateApiDocs(outputPath).catch(error => {
    console.error('❌ Documentation generation failed:', error);
    process.exit(1);
  });
}

export { generateApiDocs, generateOpenAPISpec };
