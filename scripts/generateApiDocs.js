/**
 * API Documentation Generator
 * Generates comprehensive API documentation from the codebase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ApiDocGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '..', 'docs', 'generated');
  }

  // Generate all documentation formats
  async generate() {
    console.log('📚 Generating API documentation...');

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    await this.generateMarkdown();
    await this.generateOpenAPI();

    console.log('✅ API documentation generated successfully!');
    console.log(`📁 Output directory: ${this.outputDir}`);
  }

  // Generate Markdown documentation
  async generateMarkdown() {
    console.log('📝 Generating Markdown documentation...');

    const markdown = `# Real Estate Backend API v2.0.0

RESO Web API 2.0.0 compliant real estate backend with advanced MLS data synchronization.

## Base URL
- Production: https://your-domain.com
- Development: http://localhost:3000

## Authentication

### JWT Authentication
\`\`\`http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

### API Key Authentication
\`\`\`http
GET /api/reso/Property
X-API-Key: your-api-key
\`\`\`

## RESO Web API 2.0.0 Endpoints

### Service Document
\`\`\`http
GET /api/reso/
\`\`\`

### Metadata
\`\`\`http
GET /api/reso/$metadata
\`\`\`

### Property Resource
\`\`\`http
GET /api/reso/Property?$select=ListingKey,ListPrice,City&$top=10
Authorization: Bearer your-jwt-token
\`\`\`

### Media Resource
\`\`\`http
GET /api/reso/Media?$filter=ResourceRecordKey eq '12345'
Authorization: Bearer your-jwt-token
\`\`\`

### OpenHouse Resource
\`\`\`http
GET /api/reso/OpenHouse?$filter=ListingKey eq '12345'
Authorization: Bearer your-jwt-token
\`\`\`

## OData Query Support

### Filter Examples
- \`$filter=City eq 'Toronto'\`
- \`$filter=ListPrice ge 500000\`
- \`$filter=(City eq 'Toronto' or City eq 'Vancouver') and ListPrice ge 500000\`

### Select Examples
- \`$select=ListingKey,ListPrice,City\`

### Order By Examples
- \`$orderby=ListPrice desc\`
- \`$orderby=City asc,ListPrice desc\`

### Expand Examples
- \`$expand=Media\`
- \`$expand=Media,OpenHouse\`

## Health & Monitoring

### Health Check
\`\`\`http
GET /health
\`\`\`

### Metrics
\`\`\`http
GET /health/metrics
\`\`\`

### Dashboard
\`\`\`http
GET /dashboard/
\`\`\`

## Cache Management

### Cache Statistics
\`\`\`http
GET /cache/stats
\`\`\`

### Clear Cache
\`\`\`http
POST /cache/clear
Content-Type: application/json

{
  "pattern": "property:*"
}
\`\`\`

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |
`;

    // Write to file
    const filePath = path.join(this.outputDir, 'API_DOCUMENTATION.md');
    fs.writeFileSync(filePath, markdown);
    console.log(`  ✅ Markdown: ${filePath}`);
  }

  // Generate OpenAPI specification
  async generateOpenAPI() {
    console.log('🔧 Generating OpenAPI specification...');

    const openapi = {
      openapi: '3.0.0',
      info: {
        title: 'Real Estate Backend API',
        version: '2.0.0',
        description: 'RESO Web API 2.0.0 compliant real estate backend'
      },
      servers: [
        { url: 'https://your-domain.com', description: 'Production server' },
        { url: 'http://localhost:3000', description: 'Development server' }
      ],
      paths: {
        '/api/reso/Property': {
          get: {
            summary: 'Get property listings',
            parameters: [
              { name: '$select', in: 'query', schema: { type: 'string' } },
              { name: '$filter', in: 'query', schema: { type: 'string' } },
              { name: '$orderby', in: 'query', schema: { type: 'string' } },
              { name: '$top', in: 'query', schema: { type: 'integer' } },
              { name: '$skip', in: 'query', schema: { type: 'integer' } },
              { name: '$expand', in: 'query', schema: { type: 'string' } }
            ],
            responses: {
              '200': { description: 'Property listings' },
              '401': { description: 'Unauthorized' }
            }
          }
        },
        '/auth/login': {
          post: {
            summary: 'Authenticate user',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              }
            },
            responses: {
              '200': { description: 'Login successful' },
              '401': { description: 'Invalid credentials' }
            }
          }
        }
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    };

    // Write to file
    const filePath = path.join(this.outputDir, 'openapi.json');
    fs.writeFileSync(filePath, JSON.stringify(openapi, null, 2));
    console.log(`  ✅ OpenAPI: ${filePath}`);
  }
}

// Main execution
async function main() {
  try {
    const generator = new ApiDocGenerator();
    await generator.generate();
  } catch (error) {
    console.error('❌ Documentation generation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ApiDocGenerator };
export default ApiDocGenerator;