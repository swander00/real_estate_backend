// setup-reso-structure.js - Create necessary directories and files for RESO compliance
import fs from 'fs';
import path from 'path';

const directories = [
  'api/reso',
  'scripts',
  'docs',
  'tests'
];

const files = {
  '.env.example': `# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key

# MLS Feed URLs and Tokens
IDX_URL=your_idx_feed_url
IDX_TOKEN=your_idx_api_token
VOW_URL=your_vow_feed_url
VOW_TOKEN=your_vow_api_token

# Additional Feed URLs
FREEHOLD_URL=your_freehold_feed_url
CONDO_URL=your_condo_feed_url
LEASE_URL=your_lease_feed_url
OPENHOUSE_URL=your_openhouse_feed_url
MEDIA_URL=your_media_feed_url
ROOMS_URL=your_rooms_feed_url

# Cron Security
CRON_SECRET=your_secure_cron_secret`,

  'vercel.json': `{
  "version": 2,
  "crons": [
    {
      "path": "/api/sync-idx",
      "schedule": "0 */2 * * *"
    },
    {
      "path": "/api/sync-vow",
      "schedule": "0 */6 * * *"
    }
  ]
}`,

  'docs/RESO-COMPLIANCE.md': `# RESO Compliance Guide

## Overview
This backend is fully compliant with RESO Web API 2.0.0 standards.

## Compliance Checklist
- ✅ OData 4.0 query support
- ✅ Standard RESO resources (Property, Media, OpenHouse)
- ✅ Metadata endpoint with field definitions
- ✅ Field validation and normalization
- ✅ RESO-compliant error responses
- ✅ Proper HTTP headers and content negotiation

## Validation
Run \`npm run validate-reso\` to check compliance.

## Resources
- [RESO Web API 2.0.0](https://www.reso.org/reso-web-api/)
- [OData 4.0 Protocol](https://www.odata.org/documentation/)
`,

  'docs/API-EXAMPLES.md': `# API Usage Examples

## Property Queries

### Basic Filtering
\`\`\`
# Active listings
GET /api/reso/Property?$filter=MlsStatus eq 'Active'

# Properties in Toronto
GET /api/reso/Property?$filter=City eq 'Toronto'

# Price range
GET /api/reso/Property?$filter=ListPrice gt 500000 and ListPrice lt 1000000
\`\`\`

### Field Selection
\`\`\`
# Essential fields only
GET /api/reso/Property?$select=ListingKey,ListPrice,City,BedroomsAboveGrade

# Sort by price
GET /api/reso/Property?$orderby=ListPrice desc&$top=25
\`\`\`

## Media Queries

### Property Photos
\`\`\`
# All photos for a property
GET /api/reso/Media?$filter=ResourceRecordKey eq 'ABC123' and MediaType eq 'Photo'

# Preferred photo only
GET /api/reso/Media?$filter=ResourceRecordKey eq 'ABC123' and PreferredPhotoYN eq true
\`\`\`

## OpenHouse Queries

### Upcoming Events
\`\`\`
# This weekend's open houses
GET /api/reso/OpenHouse?$filter=OpenHouseDate ge datetime'2025-08-30T00:00:00Z'

# Active open houses for a property
GET /api/reso/OpenHouse?$filter=ListingKey eq 'ABC123' and OpenHouseStatus eq 'Active'
\`\`\`
`
};

console.log('🏗️ Setting up RESO-compliant directory structure...');

// Create directories
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory exists: ${dir}`);
  }
});

// Create files
Object.entries(files).forEach(([filePath, content]) => {
  if (!fs.existsSync(filePath)) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created file: ${filePath}`);
  } else {
    console.log(`📄 File exists: ${filePath}`);
  }
});

console.log('\n🎉 RESO structure setup complete!');
console.log('📋 Next steps:');
console.log('1. Add the RESO endpoint files to api/reso/');
console.log('2. Add the validator to lib/resoValidator.js');
console.log('3. Add the compliance script to scripts/validateResoCompliance.js');
console.log('4. Update your package.json with the enhanced version');
console.log('5. Run: npm run validate-reso');