# 🧪 Test Suite Documentation

## Overview

This comprehensive test suite ensures the Real Estate Backend meets RESO Web API 2.0.0 compliance and maintains high code quality standards.

## Test Structure

```
tests/
├── setup.js                 # Test configuration and utilities
├── run-tests.js             # Test runner with CLI interface
├── global-setup.js          # Global test setup
├── global-teardown.js       # Global test cleanup
├── test-sequencer.js        # Test execution order
├── unit/                    # Unit tests
│   ├── odataParser.test.js  # OData parser tests
│   ├── resoMetadata.test.js # RESO metadata tests
│   └── resoFieldMapping.test.js # Field mapping tests
├── integration/             # Integration tests
│   └── resoRoutes.test.js   # API endpoint tests
├── e2e/                     # End-to-end tests
├── performance/             # Performance tests
└── README.md               # This file
```

## Test Categories

### 🔧 Unit Tests
- **Purpose**: Test individual functions and modules in isolation
- **Location**: `tests/unit/`
- **Coverage**: OData parser, RESO metadata, field mapping
- **Run**: `npm run test:unit`

### 🔗 Integration Tests
- **Purpose**: Test API endpoints and database interactions
- **Location**: `tests/integration/`
- **Coverage**: RESO routes, database operations, OData queries
- **Run**: `npm run test:integration`

### 🎯 End-to-End Tests
- **Purpose**: Test complete user workflows
- **Location**: `tests/e2e/`
- **Coverage**: Full API workflows, authentication, data flow
- **Run**: `npm run test:e2e`

### ⚡ Performance Tests
- **Purpose**: Test system performance and load handling
- **Location**: `tests/performance/`
- **Coverage**: Response times, throughput, memory usage
- **Run**: `npm run test:performance`

## Running Tests

### Quick Start
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific category
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance
```

### Advanced Usage
```bash
# Watch mode for development
npm run test:watch

# CI mode (no watch, with coverage)
npm run test:ci

# Run specific test file
npx jest tests/unit/odataParser.test.js

# Run tests matching pattern
npx jest --testNamePattern="OData"
```

### Custom Test Runner
```bash
# Run all tests with custom runner
node tests/run-tests.js

# Run specific category
node tests/run-tests.js unit
node tests/run-tests.js integration

# Run with coverage
node tests/run-tests.js coverage
```

## Test Configuration

### Environment Variables
```bash
# Test database configuration
SUPABASE_TEST_URL=https://your-test-project.supabase.co
SUPABASE_TEST_ANON_KEY=your-test-anon-key

# Test behavior
USE_MOCK_DATA=true          # Use mock data instead of real database
SILENT_TESTS=true           # Suppress console output in tests
NODE_ENV=test               # Set test environment
```

### Jest Configuration
- **Config File**: `jest.config.js`
- **Timeout**: 30 seconds
- **Coverage Threshold**: 80% for all metrics
- **Test Environment**: Node.js
- **ES6+ Support**: Enabled via Babel

## Test Data

### Test Fixtures
The test suite includes comprehensive test data fixtures:

```javascript
// Property test data
const testProperty = {
  ListingKey: 'TEST_LISTING_001',
  ListPrice: 750000,
  StandardStatus: 'Active',
  City: 'Toronto',
  BedroomsTotal: 3,
  BathroomsTotal: 2.5
};

// Media test data
const testMedia = {
  MediaKey: 'TEST_MEDIA_001',
  ResourceRecordKey: 'TEST_LISTING_001',
  MediaURL: 'https://example.com/photo.jpg',
  MediaType: 'Photo',
  Order: 1
};
```

### Mock Data
When `USE_MOCK_DATA=true`, tests use mock Supabase client:
- No real database connections
- Predictable test results
- Faster test execution
- No cleanup required

## Coverage Reports

### Coverage Metrics
- **Branches**: 80% minimum
- **Functions**: 80% minimum
- **Lines**: 80% minimum
- **Statements**: 80% minimum

### Coverage Reports
- **Text**: Console output
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **JSON**: `coverage/coverage-final.json`

### Viewing Coverage
```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html
```

## Writing Tests

### Unit Test Example
```javascript
import { describe, test, expect } from '@jest/globals';
import { parseODataQuery } from '../../utils/odataParser.js';

describe('OData Parser', () => {
  test('should parse simple query parameters', () => {
    const query = {
      $select: 'ListingKey,ListPrice',
      $top: '10'
    };

    const result = parseODataQuery(query, {
      allowedFields: ['ListingKey', 'ListPrice'],
      allowedExpandFields: []
    });

    expect(result.select).toEqual(['ListingKey', 'ListPrice']);
    expect(result.top).toBe(10);
  });
});
```

### Integration Test Example
```javascript
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { testUtils } from '../setup.js';

describe('RESO Routes', () => {
  beforeEach(async () => {
    // Setup test data
    await testUtils.createTestProperty();
  });

  afterEach(async () => {
    // Cleanup test data
    await testUtils.cleanup();
  });

  test('should return properties with OData format', async () => {
    const response = await request(app)
      .get('/api/reso/Property')
      .expect(200);

    expect(response.body['@odata.context']).toBe('$metadata#Property');
    expect(response.body.value).toBeDefined();
  });
});
```

## Best Practices

### Test Organization
1. **One test file per module**
2. **Group related tests in describe blocks**
3. **Use descriptive test names**
4. **Follow AAA pattern**: Arrange, Act, Assert

### Test Data
1. **Use test fixtures for consistent data**
2. **Generate unique test keys**
3. **Clean up after each test**
4. **Use mock data when possible**

### Assertions
1. **Use specific matchers**
2. **Test both positive and negative cases**
3. **Verify error conditions**
4. **Check data types and formats**

### Performance
1. **Use beforeEach/afterEach for setup/cleanup**
2. **Mock external dependencies**
3. **Use test timeouts appropriately**
4. **Run tests in parallel when possible**

## Troubleshooting

### Common Issues

#### Tests Timing Out
```bash
# Increase timeout in jest.config.js
testTimeout: 60000
```

#### Database Connection Issues
```bash
# Use mock data
export USE_MOCK_DATA=true
npm test
```

#### Import/Export Issues
```bash
# Ensure proper ES6 module configuration
# Check babel.config.js and jest.config.js
```

#### Coverage Issues
```bash
# Check coverage thresholds
# Ensure all files are included in collectCoverageFrom
```

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test with debug
DEBUG=* npx jest tests/unit/odataParser.test.js
```

## Continuous Integration

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
```

### Test Reports
- **JUnit XML**: `coverage/junit.xml`
- **SonarQube**: `coverage/sonar-report.xml`
- **Coverage**: `coverage/lcov.info`

## Contributing

### Adding New Tests
1. **Create test file in appropriate category**
2. **Follow naming convention**: `*.test.js`
3. **Include comprehensive test cases**
4. **Update documentation if needed**

### Test Requirements
- **All new code must have tests**
- **Coverage must remain above 80%**
- **Tests must pass in CI environment**
- **Performance tests for critical paths**

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [RESO Web API 2.0.0](https://www.reso.org/standards/)
- [OData 4.0 Specification](https://docs.oasis-open.org/odata/odata/v4.0/os/part1-protocol/odata-v4.0-os-part1-protocol.html)
