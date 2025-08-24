# Real Estate Backend - RESO Web API 2.0.0 Compliant

A production-ready real estate backend API with advanced MLS data synchronization, built to RESO (Real Estate Standards Organization) Web API 2.0.0 standards.

## ✨ Features

### 🏗️ **RESO Web API 2.0.0 Compliance**
- Full OData 4.0 query support (`$filter`, `$select`, `$orderby`, `$top`, `$skip`, `$count`)
- Standard RESO resources: Property, Media, OpenHouse
- RESO metadata endpoint with field definitions and lookups
- Field validation and normalization according to RESO standards
- RESO-compliant error responses and headers

### 🔄 **Advanced MLS Data Synchronization**
- **Dual-feed architecture**: IDX (active listings) + VOW (sold/historical)
- **Time-window coordinated sync** with configurable batch processing
- **Incremental sync** with state tracking for efficient updates
- **Parent-child relationship enforcement** prevents orphaned records
- **Automatic cleanup** of stale data and derived table computation
- **Retry logic** with exponential backoff for robust error handling

### 🚀 **Production-Ready API**
- **Cron-enabled endpoints** for automated data synchronization
- **Manual sync endpoints** with test modes for development
- **Health monitoring** and comprehensive logging
- **Rate limiting** and security features
- **Vercel-native architecture** for serverless deployment

## 🎯 **RESO API Endpoints**

### **Root Service Document**
```
GET /api/reso
```
Returns the OData service document with available resources.

### **Metadata Endpoint** 
```
GET /api/reso/$metadata
```
Returns RESO field definitions, lookups, and resource schemas.

### **Property Resource**
```
GET /api/reso/Property
GET /api/reso/Property?$filter=MlsStatus eq 'Active'
GET /api/reso/Property?$filter=City eq 'Toronto' and ListPrice gt 500000
GET /api/reso/Property?$select=ListingKey,ListPrice,City,BedroomsAboveGrade
GET /api/reso/Property?$orderby=ListPrice desc&$top=50&$skip=0
```

### **Media Resource**
```
GET /api/reso/Media
GET /api/reso/Media?$filter=ResourceRecordKey eq '12345'
GET /api/reso/Media?$filter=MediaType eq 'Photo' and PreferredPhotoYN eq true
GET /api/reso/Media?$orderby=Order asc&$top=10
```

### **OpenHouse Resource**
```
GET /api/reso/OpenHouse  
GET /api/reso/OpenHouse?$filter=OpenHouseStatus eq 'Active'
GET /api/reso/OpenHouse?$filter=OpenHouseDate ge datetime'2025-01-01T00:00:00Z'
GET /api/reso/OpenHouse?$orderby=OpenHouseDate asc
```

## 🔧 **Query Examples**

### **Basic Filtering**
```
# Active listings in Toronto
/api/reso/Property?$filter=City eq 'Toronto' and MlsStatus eq 'Active'

# Properties over $1M
/api/reso/Property?$filter=ListPrice gt 1000000

# 3+ bedroom homes  
/api/reso/Property?$filter=BedroomsAboveGrade ge 3
```

### **Advanced Queries**
```
# Recent listings with price range
/api/reso/Property?$filter=ModificationTimestamp ge datetime'2025-01-01T00:00:00Z' and ListPrice gt 500000 and ListPrice lt 1000000

# Photos for specific property
/api/reso/Media?$filter=ResourceRecordKey eq 'ABC123' and MediaType eq 'Photo'

# Upcoming open houses this weekend
/api/reso/OpenHouse?$filter=OpenHouseDate ge datetime'2025-08-30T00:00:00Z' and OpenHouseDate le datetime'2025-08-31T23:59:59Z'
```

### **Field Selection and Sorting**
```
# Essential property fields only
/api/reso/Property?$select=ListingKey,ListPrice,City,BedroomsAboveGrade,BathroomsTotalInteger,MlsStatus

# Most expensive listings first
/api/reso/Property?$orderby=ListPrice desc&$top=25

# Recent modifications
/api/reso/Property?$orderby=ModificationTimestamp desc&$top=100
```

## 📊 **Data Synchronization**

### **Automatic Sync (Production)**
```bash
# IDX sync every 2 hours (incremental)
POST /api/sync-idx
Authorization: Bearer {CRON_SECRET}

# VOW sync every 6 hours (full)  
POST /api/sync-vow
Authorization: Bearer {CRON_SECRET}
```

### **Manual Sync (Development)**
```bash
# Test mode sync (limited records)
GET /api/manual-sync?type=idx&mode=test

# Full sync
GET /api/manual-sync?type=idx&mode=full

# Incremental sync
GET /api/manual-sync?type=idx&mode=incremental
```

## 🚀 **Quick Start**

### **1. Environment Setup**
```bash
# Clone the repository
git clone https://github.com/swander00/real_estate_backend.git
cd real_estate_backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### **2. Configure Environment Variables**
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key

# MLS Feed URLs and Tokens
IDX_URL=your_idx_feed_url
IDX_TOKEN=your_idx_api_token
VOW_URL=your_vow_feed_url  
VOW_TOKEN=your_vow_api_token

# Additional feed URLs
FREEHOLD_URL=your_freehold_feed_url
CONDO_URL=your_condo_feed_url
LEASE_URL=your_lease_feed_url
OPENHOUSE_URL=your_openhouse_feed_url
MEDIA_URL=your_media_feed_url
ROOMS_URL=your_rooms_feed_url

# Cron Security
CRON_SECRET=your_secure_cron_secret
```

### **3. Development**
```bash
# Start development server
npm run dev

# Test sync functionality
npm run test-sync

# Check environment configuration
npm run check-env

# Validate RESO compliance  
npm run validate-reso
```

### **4. RESO Compliance Validation**
```bash
# Run comprehensive RESO compliance check
npm run validate-reso

# Check specific aspects
node scripts/validateResoCompliance.js
```

## 🏗️ **Architecture**

### **Database Schema**
- **`common_fields`** - Core property data (RESO Property resource)
- **`residential_freehold`** - Freehold-specific fields  
- **`residential_condo`** - Condominium-specific fields
- **`residential_lease`** - Rental/lease-specific fields
- **`property_media`** - Photos, videos, documents (RESO Media resource)
- **`property_openhouse`** - Scheduled showings (RESO OpenHouse resource)  
- **`property_rooms`** - Room-level details
- **`property_first_image`** - Computed preferred images
- **`sync_state`** - Synchronization tracking

### **Sync Architecture**
```
MLS Feeds → fetchFeed.js → Mappers → Supabase → RESO API
    ↓            ↓           ↓         ↓         ↓
  IDX/VOW    OData Parser  Field     Database  OData 4.0
  Feeds      & Fetcher     Mapping   Storage   Queries
```

## 📝 **RESO Compliance**

This backend implements **RESO Web API 2.0.0** standards including:

- ✅ **OData 4.0** query protocol support
- ✅ **Standard Resources**: Property, Media, OpenHouse  
- ✅ **Field Validation** against RESO specifications
- ✅ **Metadata Endpoint** with complete field definitions
- ✅ **Lookup Values** for enumerated fields
- ✅ **Error Handling** with RESO-compliant responses
- ✅ **Pagination** with `@odata.nextLink` support
- ✅ **Content Negotiation** with proper HTTP headers

### **RESO Validation**
Run the compliance validator to ensure your data meets RESO standards:

```bash
npm run validate-reso
```

The validator checks:
- Database schema compliance
- Field validation and completeness  
- API endpoint availability
- Data quality metrics
- Sync system functionality

## 🔐 **Security & Authentication**

- **Cron endpoints** secured with Bearer token authentication
- **CORS** configured for cross-origin requests
- **Rate limiting** on public endpoints
- **Input validation** and sanitization
- **SQL injection** protection via Supabase

## 📈 **Performance & Scaling**

- **Batch processing** with configurable chunk sizes
- **Retry logic** with exponential backoff
- **Connection pooling** via Supabase
- **Indexed queries** for optimal performance  
- **Serverless architecture** scales automatically
- **Derived tables** for optimized common queries

## 📚 **API Documentation**

### **Response Format**
All RESO endpoints return OData-compliant responses:

```json
{
  "@odata.context": "https://yourdomain.com/api/reso/$metadata#Property",
  "@odata.count": 1250,
  "@odata.nextLink": "https://yourdomain.com/api/reso/Property?$skip=1000",
  "value": [
    {
      "ListingKey": "ABC123",
      "ListPrice": 750000,
      "MlsStatus": "Active", 
      "City": "Toronto",
      "BedroomsAboveGrade": 3,
      "BathroomsTotalInteger": 2,
      "ModificationTimestamp": "2025-08-24T10:30:00Z"
    }
  ]
}
```

### **Error Responses**
```json
{
  "error": {
    "code": "BadRequest",
    "message": "Invalid query parameters",
    "details": "The field 'InvalidField' is not recognized",
    "timestamp": "2025-08-24T10:30:00Z"
  }
}
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Run RESO compliance validation (`npm run validate-reso`)
4. Commit your changes (`git commit -am 'Add new feature'`)
5. Push to the branch (`git push origin feature/new-feature`)
6. Create a Pull Request

## 📋 **License**

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 **Resources**

- [RESO Web API 2.0.0 Specification](https://www.reso.org/reso-web-api/)
- [OData 4.0 Protocol](https://www.odata.org/documentation/)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)

---

**Built with ❤️ for the real estate industry**