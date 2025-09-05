# 🏠 Real Estate Backend API Documentation

## Overview

The Real Estate Backend provides a RESO Web API 2.0.0 compliant REST API for accessing real estate data. This API supports OData 4.0 queries and provides comprehensive access to property listings, media, open houses, and related data.

## Base URL

```
Production: https://your-domain.com/api/reso
Development: http://localhost:3000/api/reso
```

## Authentication

### API Key Authentication
```http
GET /api/reso/Property
Authorization: Bearer YOUR_API_KEY
```

### JWT Token Authentication
```http
GET /api/reso/Property
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## OData Query Support

The API supports full OData 4.0 query capabilities:

### Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `$select` | Select specific fields | `$select=ListingKey,ListPrice,City` |
| `$filter` | Filter results | `$filter=City eq 'Toronto'` |
| `$orderby` | Sort results | `$orderby=ListPrice desc` |
| `$top` | Limit results | `$top=50` |
| `$skip` | Skip results | `$skip=100` |
| `$expand` | Include related data | `$expand=Media,OpenHouse` |
| `$search` | Full-text search | `$search=downtown pool` |
| `$format` | Response format | `$format=json` |

### Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `City eq 'Toronto'` |
| `ne` | Not equals | `StandardStatus ne 'Sold'` |
| `gt` | Greater than | `ListPrice gt 500000` |
| `ge` | Greater than or equal | `ListPrice ge 500000` |
| `lt` | Less than | `ListPrice lt 1000000` |
| `le` | Less than or equal | `ListPrice le 1000000` |
| `in` | In list | `City in ('Toronto', 'Vancouver')` |
| `contains` | Contains text | `contains(PublicRemarks, 'pool')` |
| `startswith` | Starts with | `startswith(City, 'Tor')` |
| `endswith` | Ends with | `endswith(PostalCode, 'A8')` |

### Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `and` | Logical AND | `City eq 'Toronto' and ListPrice ge 500000` |
| `or` | Logical OR | `City eq 'Toronto' or City eq 'Vancouver'` |
| `not` | Logical NOT | `not (StandardStatus eq 'Sold')` |

### Complex Filters

```http
# Multiple conditions with parentheses
GET /api/reso/Property?$filter=(City eq 'Toronto' or City eq 'Vancouver') and ListPrice ge 500000

# Function calls
GET /api/reso/Property?$filter=contains(PublicRemarks, 'pool') and BedroomsTotal ge 3

# IN operator
GET /api/reso/Property?$filter=City in ('Toronto', 'Vancouver', 'Montreal')

# NULL checks
GET /api/reso/Property?$filter=ClosePrice is null
```

## API Endpoints

### Service Document

#### GET /
Returns the OData service document listing all available resources.

```http
GET /api/reso/
```

**Response:**
```json
{
  "@odata.context": "$metadata",
  "value": [
    {
      "name": "Property",
      "kind": "EntitySet",
      "url": "Property"
    },
    {
      "name": "Media",
      "kind": "EntitySet",
      "url": "Media"
    }
  ]
}
```

### Metadata

#### GET /$metadata
Returns the OData metadata document describing the data model.

```http
GET /api/reso/$metadata
```

**Response:** XML metadata document

### Property Resource

#### GET /Property
Retrieve property listings with OData query support.

```http
GET /api/reso/Property
```

**Query Examples:**
```http
# Basic query
GET /api/reso/Property?$select=ListingKey,ListPrice,City&$top=10

# Filtered query
GET /api/reso/Property?$filter=City eq 'Toronto' and ListPrice ge 500000

# Sorted query
GET /api/reso/Property?$orderby=ListPrice desc,City asc

# Expanded query
GET /api/reso/Property?$expand=Media,OpenHouse,Room&$select=ListingKey,ListPrice
```

**Response:**
```json
{
  "@odata.context": "$metadata#Property",
  "value": [
    {
      "ListingKey": "12345",
      "ListPrice": 750000,
      "StandardStatus": "Active",
      "PropertyType": "Residential",
      "City": "Toronto",
      "BedroomsTotal": 3,
      "BathroomsTotal": 2.5,
      "Media": [
        {
          "MediaKey": "MEDIA123",
          "MediaURL": "https://example.com/photo.jpg",
          "MediaType": "Photo",
          "Order": 1
        }
      ]
    }
  ],
  "@odata.count": 1
}
```

#### GET /Property/{listingKey}
Retrieve a specific property by its listing key.

```http
GET /api/reso/Property/12345
```

**Response:**
```json
{
  "@odata.context": "$metadata#Property/$entity",
  "ListingKey": "12345",
  "ListPrice": 750000,
  "StandardStatus": "Active",
  "PropertyType": "Residential",
  "City": "Toronto",
  "BedroomsTotal": 3,
  "BathroomsTotal": 2.5
}
```

### Media Resource

#### GET /Media
Retrieve property media with OData query support.

```http
GET /api/reso/Media
```

**Query Examples:**
```http
# Media for specific property
GET /api/reso/Media?$filter=ResourceRecordKey eq '12345'

# Photos only
GET /api/reso/Media?$filter=MediaType eq 'Photo'

# Ordered by display order
GET /api/reso/Media?$orderby=Order asc
```

**Response:**
```json
{
  "@odata.context": "$metadata#Media",
  "value": [
    {
      "MediaKey": "MEDIA123",
      "ResourceRecordKey": "12345",
      "MediaURL": "https://example.com/photo.jpg",
      "MediaType": "Photo",
      "MediaCategory": "Exterior",
      "Order": 1,
      "Caption": "Front view of the property",
      "Width": 1920,
      "Height": 1080
    }
  ]
}
```

### OpenHouse Resource

#### GET /OpenHouse
Retrieve open house events with OData query support.

```http
GET /api/reso/OpenHouse
```

**Query Examples:**
```http
# Open houses for specific property
GET /api/reso/OpenHouse?$filter=ListingKey eq '12345'

# Upcoming open houses
GET /api/reso/OpenHouse?$filter=OpenHouseDate ge 2024-01-15

# Sorted by date
GET /api/reso/OpenHouse?$orderby=OpenHouseDate asc,OpenHouseStartTime asc
```

**Response:**
```json
{
  "@odata.context": "$metadata#OpenHouse",
  "value": [
    {
      "OpenHouseKey": "OH123",
      "ListingKey": "12345",
      "OpenHouseDate": "2024-01-15",
      "OpenHouseStartTime": "14:00:00",
      "OpenHouseEndTime": "16:00:00",
      "OpenHouseDescription": "Open house for interested buyers",
      "RefreshmentsYN": true
    }
  ]
}
```

### Room Resource

#### GET /Room
Retrieve property room details with OData query support.

```http
GET /api/reso/Room
```

**Query Examples:**
```http
# Rooms for specific property
GET /api/reso/Room?$filter=ListingKey eq '12345'

# Living rooms only
GET /api/reso/Room?$filter=RoomType eq 'Living Room'

# Main level rooms
GET /api/reso/Room?$filter=RoomLevel eq 'Main'
```

**Response:**
```json
{
  "@odata.context": "$metadata#Room",
  "value": [
    {
      "RoomKey": "ROOM123",
      "ListingKey": "12345",
      "RoomType": "Living Room",
      "RoomLevel": "Main",
      "RoomDimensions": "20x15",
      "RoomFeatures": "Fireplace, Hardwood Floors",
      "RoomDescription": "Spacious living room with fireplace"
    }
  ]
}
```

### Member Resource

#### GET /Member
Retrieve agent/broker information with OData query support.

```http
GET /api/reso/Member
```

**Query Examples:**
```http
# Active agents only
GET /api/reso/Member?$filter=MemberStatus eq 'Active'

# Agents by type
GET /api/reso/Member?$filter=MemberType eq 'Agent'

# Members with office information
GET /api/reso/Member?$expand=Office
```

**Response:**
```json
{
  "@odata.context": "$metadata#Member",
  "value": [
    {
      "MemberKey": "MEMBER123",
      "MemberFirstName": "John",
      "MemberLastName": "Smith",
      "MemberFullName": "John Smith",
      "MemberEmail": "john.smith@example.com",
      "MemberPhone": "555-0123",
      "MemberType": "Agent",
      "LicenseNumber": "12345",
      "MemberStatus": "Active",
      "OfficeKey": "OFFICE123"
    }
  ]
}
```

### Office Resource

#### GET /Office
Retrieve brokerage office information with OData query support.

```http
GET /api/reso/Office
```

**Query Examples:**
```http
# Offices by type
GET /api/reso/Office?$filter=OfficeType eq 'Brokerage'

# Offices in specific city
GET /api/reso/Office?$filter=OfficeCity eq 'Toronto'

# Offices with member information
GET /api/reso/Office?$expand=Member
```

**Response:**
```json
{
  "@odata.context": "$metadata#Office",
  "value": [
    {
      "OfficeKey": "OFFICE123",
      "OfficeName": "Century 21 Real Estate",
      "OfficeAddress1": "123 Main Street",
      "OfficeCity": "Toronto",
      "OfficeState": "ON",
      "OfficePostalCode": "M5V 3A8",
      "OfficePhone": "416-555-0123",
      "OfficeEmail": "info@century21toronto.com",
      "OfficeType": "Brokerage"
    }
  ]
}
```

### Search Endpoint

#### GET /$search
Perform cross-entity search across all resources.

```http
GET /api/reso/$search?$search=search term
```

**Query Examples:**
```http
# Search for properties and agents
GET /api/reso/$search?$search=Toronto

# Search with additional filters
GET /api/reso/$search?$search=pool&$top=20
```

**Response:**
```json
{
  "@odata.context": "$metadata#SearchResults",
  "value": [
    {
      "@odata.type": "RESO.RealEstate.Property",
      "results": [
        {
          "ListingKey": "12345",
          "ListPrice": 750000,
          "City": "Toronto",
          "PublicRemarks": "Beautiful home with pool in downtown Toronto"
        }
      ]
    },
    {
      "@odata.type": "RESO.RealEstate.Member",
      "results": [
        {
          "MemberKey": "MEMBER123",
          "MemberFullName": "John Smith",
          "MemberEmail": "john.smith@example.com"
        }
      ]
    }
  ]
}
```

## Response Formats

### Success Response
```json
{
  "@odata.context": "$metadata#EntitySet",
  "value": [...],
  "@odata.count": 100
}
```

### Error Response
```json
{
  "error": {
    "code": "BadRequest",
    "message": "Invalid OData query",
    "details": [
      "Invalid filter syntax"
    ]
  }
}
```

### Pagination
```json
{
  "@odata.context": "$metadata#Property",
  "value": [...],
  "@odata.count": 1000,
  "@odata.nextLink": "/api/reso/Property?$skip=50&$top=50"
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Default**: 100 requests per minute per IP
- **Authenticated**: 1000 requests per minute per API key
- **Headers**: Rate limit information included in response headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid query parameters |
| 401 | Unauthorized - Invalid or missing authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 501 | Not Implemented - Feature not available |

## SDKs and Libraries

### JavaScript/Node.js
```javascript
// Using fetch
const response = await fetch('/api/reso/Property?$filter=City eq \'Toronto\'', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
const data = await response.json();

// Using axios
const response = await axios.get('/api/reso/Property', {
  params: { $filter: "City eq 'Toronto'" },
  headers: { Authorization: 'Bearer YOUR_API_KEY' }
});
```

### Python
```python
import requests

response = requests.get(
    '/api/reso/Property',
    params={'$filter': "City eq 'Toronto'"},
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)
data = response.json()
```

### cURL
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "https://your-domain.com/api/reso/Property?$filter=City eq 'Toronto'"
```

## Best Practices

### Performance
1. **Use $select** to limit returned fields
2. **Use $top** to limit result sets
3. **Use $filter** to reduce data transfer
4. **Cache responses** when appropriate

### Error Handling
1. **Check HTTP status codes**
2. **Parse error responses**
3. **Implement retry logic** for 5xx errors
4. **Handle rate limiting** gracefully

### Security
1. **Use HTTPS** in production
2. **Store API keys securely**
3. **Implement proper authentication**
4. **Validate input parameters**

## Support

For API support and questions:
- **Documentation**: [API Documentation](./API_DOCUMENTATION.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: support@your-domain.com
