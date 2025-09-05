# 👨‍💻 Developer Guide

## Overview

This guide provides comprehensive information for developers working on the Real Estate Backend system, including setup, architecture, coding standards, and contribution guidelines.

## Getting Started

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Git**: Latest version
- **Database**: Supabase account
- **IDE**: VS Code (recommended)

### Development Setup

#### 1. Clone Repository
```bash
git clone https://github.com/your-repo/real-estate-backend.git
cd real-estate-backend
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Environment Configuration
```bash
# Copy environment template
cp env.template .env

# Edit environment variables
nano .env
```

#### 4. Database Setup
```bash
# Run database setup
node database-setup.sql

# Run RLS policies
node fix-rls-policies.sql

# Setup admin user
node setup-admin-user.sql
```

#### 5. Start Development Server
```bash
# Start with auto-reload
npm run dev

# Or start locally
npm run dev:local
```

#### 6. Run Tests
```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration

# Run with coverage
npm run test:coverage
```

## Project Structure

```
real-estate-backend/
├── api/                    # API layer
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware
│   ├── routes/            # Route definitions
│   └── services/          # Business logic
├── docs/                  # Documentation
├── lib/                   # Core libraries
├── mappers/               # Data transformation
├── scripts/               # Utility scripts
├── tests/                 # Test suite
├── utils/                 # Utility functions
├── server.js              # Application entry point
└── package.json           # Dependencies and scripts
```

## Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────┐
│           Presentation Layer        │
│         (API Routes & Controllers)  │
├─────────────────────────────────────┤
│           Business Layer            │
│         (Services & Mappers)        │
├─────────────────────────────────────┤
│           Data Layer                │
│         (Database & External APIs)  │
└─────────────────────────────────────┘
```

### Key Components

#### 1. API Layer (`api/`)
- **Routes**: Define API endpoints and middleware
- **Controllers**: Handle HTTP requests and responses
- **Middleware**: Authentication, validation, error handling
- **Services**: Business logic and data processing

#### 2. Data Layer (`lib/`, `mappers/`)
- **Sync Libraries**: External API integration
- **Mappers**: Data transformation and validation
- **Database**: Supabase integration

#### 3. Utilities (`utils/`)
- **OData Parser**: Query parsing and validation
- **RESO Metadata**: Schema generation
- **Helpers**: Common utility functions

## Coding Standards

### JavaScript/Node.js Standards

#### Code Style
```javascript
// Use ES6+ features
import express from 'express';
import { supabase } from './server.js';

// Use const/let, avoid var
const app = express();
let server;

// Use arrow functions for callbacks
app.get('/api/reso/Property', async (req, res) => {
  try {
    const properties = await getProperties(req.query);
    res.json(properties);
  } catch (error) {
    next(error);
  }
});

// Use async/await over promises
async function getProperties(query) {
  const { data, error } = await supabase
    .from('common_fields')
    .select('*');
  
  if (error) throw error;
  return data;
}
```

#### Naming Conventions
```javascript
// Variables and functions: camelCase
const listingKey = '12345';
const getPropertyData = () => {};

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 50;

// Classes: PascalCase
class PropertyService {
  constructor() {}
}

// Files: kebab-case
// property-service.js
// odata-parser.js
```

#### Error Handling
```javascript
// Use try-catch for async operations
async function processData(data) {
  try {
    const result = await transformData(data);
    return result;
  } catch (error) {
    logger.error('Data processing failed:', error);
    throw new ProcessingError('Failed to process data', error);
  }
}

// Use custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}
```

### RESO Compliance Standards

#### Field Naming
```javascript
// Use RESO standard field names
const property = {
  ListingKey: '12345',           // Not 'listing_id'
  ListPrice: 750000,             // Not 'price'
  StandardStatus: 'Active',      // Not 'status'
  PropertyType: 'Residential',   // Not 'type'
  BedroomsTotal: 3,              // Not 'bedrooms'
  BathroomsTotal: 2.5            // Not 'bathrooms'
};
```

#### Data Types
```javascript
// Use proper RESO data types
const property = {
  ListingKey: 'string',          // Edm.String
  ListPrice: 750000,             // Edm.Decimal
  BedroomsTotal: 3,              // Edm.Int32
  FireplaceYN: true,             // Edm.Boolean
  ModificationTimestamp: new Date().toISOString() // Edm.DateTimeOffset
};
```

#### OData Compliance
```javascript
// Support OData query parameters
app.get('/api/reso/Property', async (req, res) => {
  const { $select, $filter, $orderby, $top, $skip } = req.query;
  
  // Parse and validate OData parameters
  const parsedQuery = parseODataQuery(req.query, {
    allowedFields: getAllowedFields('Property'),
    allowedExpandFields: getAllowedExpandFields('Property')
  });
  
  // Apply to database query
  const query = applyODataToSupabase(supabase.from('common_fields'), parsedQuery);
  const { data, error } = await query;
  
  if (error) throw error;
  
  // Return OData-compliant response
  res.json({
    '@odata.context': '$metadata#Property',
    value: data
  });
});
```

## Development Workflow

### Git Workflow

#### Branch Naming
```bash
# Feature branches
feature/add-property-search
feature/implement-caching

# Bug fixes
bugfix/fix-odata-parser
bugfix/resolve-memory-leak

# Hotfixes
hotfix/security-patch
hotfix/critical-bug

# Releases
release/v2.1.0
```

#### Commit Messages
```bash
# Format: type(scope): description
feat(api): add property search endpoint
fix(odata): resolve filter parsing issue
docs(readme): update installation instructions
test(integration): add RESO compliance tests
refactor(mappers): simplify field mapping logic
```

#### Pull Request Process
1. **Create feature branch** from `main`
2. **Implement changes** with tests
3. **Run test suite** and ensure all pass
4. **Update documentation** if needed
5. **Create pull request** with description
6. **Request review** from team members
7. **Address feedback** and make changes
8. **Merge** after approval

### Testing Workflow

#### Unit Tests
```javascript
// Test individual functions
describe('parseODataQuery', () => {
  test('should parse simple filter', () => {
    const query = { $filter: "City eq 'Toronto'" };
    const result = parseODataQuery(query, { allowedFields: ['City'] });
    
    expect(result.filter).toBeDefined();
    expect(result.filter.parsed.field).toBe('City');
    expect(result.filter.parsed.operator).toBe('eq');
    expect(result.filter.parsed.value).toBe('Toronto');
  });
});
```

#### Integration Tests
```javascript
// Test API endpoints
describe('GET /api/reso/Property', () => {
  test('should return properties with OData format', async () => {
    const response = await request(app)
      .get('/api/reso/Property')
      .expect(200);
    
    expect(response.body['@odata.context']).toBe('$metadata#Property');
    expect(response.body.value).toBeDefined();
    expect(Array.isArray(response.body.value)).toBe(true);
  });
});
```

#### Test Coverage
```bash
# Run tests with coverage
npm run test:coverage

# Check coverage thresholds
# Branches: 80%
# Functions: 80%
# Lines: 80%
# Statements: 80%
```

### Code Review Guidelines

#### What to Review
- **Functionality**: Does the code work as intended?
- **Performance**: Are there any performance issues?
- **Security**: Are there any security vulnerabilities?
- **Maintainability**: Is the code easy to understand and maintain?
- **Testing**: Are there adequate tests?
- **Documentation**: Is the code properly documented?

#### Review Checklist
- [ ] Code follows style guidelines
- [ ] Functions are well-named and documented
- [ ] Error handling is appropriate
- [ ] Tests cover new functionality
- [ ] No security vulnerabilities
- [ ] Performance is acceptable
- [ ] RESO compliance maintained

## API Development

### Adding New Endpoints

#### 1. Define Route
```javascript
// api/routes/reso.js
router.get('/NewResource', async (req, res, next) => {
  try {
    const parsedQuery = parseODataQuery(req.query, {
      allowedFields: getAllowedFields('NewResource'),
      allowedExpandFields: getAllowedExpandFields('NewResource')
    });
    
    const query = supabase.from('new_resource_table').select('*');
    const { data, error } = await applyODataToSupabase(query, parsedQuery);
    
    if (error) throw error;
    
    res.json({
      '@odata.context': '$metadata#NewResource',
      value: data
    });
  } catch (error) {
    next(error);
  }
});
```

#### 2. Add Metadata
```javascript
// utils/resoMetadata.js
function generateNewResourceEntityType() {
  return {
    name: "NewResource",
    key: [{ name: "NewResourceKey" }],
    property: [
      { name: "NewResourceKey", type: "Edm.String", nullable: false },
      { name: "Name", type: "Edm.String", nullable: true },
      { name: "Description", type: "Edm.String", nullable: true }
    ]
  };
}
```

#### 3. Add Field Mappings
```javascript
// utils/resoMetadata.js
export function getAllowedFields(resourceName) {
  const fieldMaps = {
    // ... existing mappings
    NewResource: [
      'NewResourceKey', 'Name', 'Description', 'ModificationTimestamp'
    ]
  };
  
  return fieldMaps[resourceName] || [];
}
```

#### 4. Add Tests
```javascript
// tests/integration/newResource.test.js
describe('GET /api/reso/NewResource', () => {
  test('should return new resources with OData format', async () => {
    const response = await request(app)
      .get('/api/reso/NewResource')
      .expect(200);
    
    expect(response.body['@odata.context']).toBe('$metadata#NewResource');
    expect(response.body.value).toBeDefined();
  });
});
```

### Data Validation

#### Input Validation
```javascript
// Validate OData queries
const validation = validateODataQuery(req.query);
if (!validation.isValid) {
  return res.status(400).json(createODataErrorResponse(validation.errors));
}

// Validate field names
const allowedFields = getAllowedFields('Property');
const invalidFields = req.query.$select?.split(',').filter(field => 
  !allowedFields.includes(field)
);

if (invalidFields.length > 0) {
  return res.status(400).json({
    error: {
      code: 'BadRequest',
      message: `Invalid fields: ${invalidFields.join(', ')}`
    }
  });
}
```

#### Data Sanitization
```javascript
// Sanitize user input
function sanitizeInput(input) {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  return input;
}

// Validate data types
function validateDataType(value, expectedType) {
  switch (expectedType) {
    case 'Edm.String':
      return typeof value === 'string';
    case 'Edm.Int32':
      return Number.isInteger(value);
    case 'Edm.Decimal':
      return typeof value === 'number';
    case 'Edm.Boolean':
      return typeof value === 'boolean';
    case 'Edm.DateTimeOffset':
      return !isNaN(Date.parse(value));
    default:
      return true;
  }
}
```

## Database Development

### Schema Changes

#### Adding New Tables
```sql
-- Create new table
CREATE TABLE new_resource (
    NewResourceKey TEXT PRIMARY KEY,
    Name TEXT NOT NULL,
    Description TEXT,
    ModificationTimestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CreatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UpdatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE new_resource ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access" ON new_resource
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access" ON new_resource
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access" ON new_resource
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete access" ON new_resource
    FOR DELETE USING (true);
```

#### Adding Indexes
```sql
-- Add indexes for performance
CREATE INDEX CONCURRENTLY idx_new_resource_name ON new_resource(Name);
CREATE INDEX CONCURRENTLY idx_new_resource_timestamp ON new_resource(ModificationTimestamp);
```

### Data Migration

#### Migration Scripts
```javascript
// scripts/migrate-data.js
import { supabase } from '../server.js';

async function migrateData() {
  try {
    // Backup existing data
    const { data: backup } = await supabase
      .from('old_table')
      .select('*');
    
    // Transform data
    const transformedData = backup.map(item => ({
      NewResourceKey: item.old_key,
      Name: item.old_name,
      Description: item.old_description,
      ModificationTimestamp: item.updated_at
    }));
    
    // Insert new data
    const { error } = await supabase
      .from('new_resource')
      .insert(transformedData);
    
    if (error) throw error;
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrateData();
```

## Performance Optimization

### Database Optimization

#### Query Optimization
```javascript
// Use proper indexes
const { data } = await supabase
  .from('common_fields')
  .select('*')
  .eq('City', 'Toronto')  // Uses idx_property_city
  .gte('ListPrice', 500000)  // Uses idx_property_price
  .limit(50);

// Use select to limit fields
const { data } = await supabase
  .from('common_fields')
  .select('ListingKey, ListPrice, City')  // Only fetch needed fields
  .eq('StandardStatus', 'Active');
```

#### Connection Pooling
```javascript
// Configure connection pool
const pool = new Pool({
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
});
```

### Caching

#### Redis Caching
```javascript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache middleware
const cache = (duration) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await redis.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      res.sendResponse = res.json;
      res.json = (body) => {
        redis.setex(key, duration, JSON.stringify(body));
        res.sendResponse(body);
      };
      
      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};

// Use caching
app.get('/api/reso/Property', cache(300), getProperties);
```

## Security Best Practices

### Authentication

#### JWT Implementation
```javascript
import jwt from 'jsonwebtoken';

// Generate token
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Verify token
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

#### API Key Authentication
```javascript
// API key middleware
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // Validate API key
  if (!isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
}
```

### Input Validation

#### SQL Injection Prevention
```javascript
// Use parameterized queries
const { data } = await supabase
  .from('common_fields')
  .select('*')
  .eq('City', cityName);  // Safe - parameterized

// Avoid string concatenation
// BAD: const query = `SELECT * FROM properties WHERE city = '${cityName}'`;
```

#### XSS Prevention
```javascript
// Sanitize user input
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

function sanitizeHtml(input) {
  return purify.sanitize(input);
}
```

## Debugging and Troubleshooting

### Logging

#### Structured Logging
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Use logger
logger.info('Processing request', { userId: req.user.id, endpoint: req.path });
logger.error('Database error', { error: error.message, query: query });
```

### Debugging Tools

#### Node.js Debugger
```bash
# Start with debugger
node --inspect server.js

# Connect with Chrome DevTools
# Open chrome://inspect
```

#### Performance Profiling
```bash
# Profile CPU usage
node --prof server.js

# Analyze profile
node --prof-process isolate-*.log > profile.txt
```

## Contributing

### Contribution Guidelines

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests for new functionality**
5. **Ensure all tests pass**
6. **Update documentation**
7. **Submit a pull request**

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow the project's coding standards
- Test your changes thoroughly

### Getting Help

- **Documentation**: Check this guide and API docs
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions
- **Slack**: Join our development Slack channel
- **Email**: Contact dev-team@your-domain.com

## Resources

### Documentation
- [API Documentation](./API_DOCUMENTATION.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Operational Runbook](./OPERATIONAL_RUNBOOK.md)

### External Resources
- [RESO Web API 2.0.0](https://www.reso.org/standards/)
- [OData 4.0 Specification](https://docs.oasis-open.org/odata/odata/v4.0/os/part1-protocol/odata-v4.0-os-part1-protocol.html)
- [Supabase Documentation](https://supabase.com/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Jest Testing Framework](https://jestjs.io/)

### Tools
- [VS Code](https://code.visualstudio.com/)
- [Postman](https://www.postman.com/) - API testing
- [DBeaver](https://dbeaver.io/) - Database management
- [Redis Commander](https://github.com/joeferner/redis-commander) - Redis management
