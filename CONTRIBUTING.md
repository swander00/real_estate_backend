# 🤝 Contributing Guidelines

Thank you for your interest in contributing to the Real Estate Backend project! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Community Guidelines](#community-guidelines)

## 📜 Code of Conduct

This project adheres to a code of conduct that ensures a welcoming and inclusive environment for all contributors. By participating, you agree to uphold these values:

### Our Pledge

- **Be respectful** and inclusive in all interactions
- **Be constructive** in feedback and discussions
- **Be collaborative** and help others learn and grow
- **Be professional** in all communications
- **Be patient** with newcomers and questions

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, trolling, or personal attacks
- Discriminatory language or behavior
- Spam or off-topic discussions
- Sharing private information without permission
- Any conduct that could be considered inappropriate

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **Git** for version control
- **Basic understanding** of JavaScript/Node.js
- **Familiarity** with RESO standards (helpful but not required)

### Development Setup

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub, then clone your fork
   git clone https://github.com/your-username/real-estate-backend.git
   cd real-estate-backend
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/original-repo/real-estate-backend.git
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Setup environment**
   ```bash
   cp env.template .env
   # Edit .env with your development configuration
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## 🔄 Development Process

### Branch Strategy

We use a **Git Flow** approach with the following branch types:

- **`main`** - Production-ready code
- **`develop`** - Integration branch for features
- **`feature/*`** - New features and enhancements
- **`bugfix/*`** - Bug fixes
- **`hotfix/*`** - Critical production fixes
- **`release/*`** - Release preparation

### Branch Naming Convention

```bash
# Features
feature/add-property-search
feature/implement-caching
feature/odata-batch-support

# Bug fixes
bugfix/fix-odata-parser
bugfix/resolve-memory-leak
bugfix/cors-configuration

# Hotfixes
hotfix/security-patch
hotfix/critical-bug-fix

# Releases
release/v2.1.0
release/v2.2.0
```

### Workflow Steps

1. **Create a feature branch** from `develop`
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following coding standards

3. **Write tests** for new functionality

4. **Run the test suite**
   ```bash
   npm test
   npm run lint
   ```

5. **Commit your changes** with descriptive messages

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a pull request** against the `develop` branch

## 📝 Coding Standards

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

### Code Organization

#### File Structure
```
api/
├── controllers/          # Request handlers
├── middleware/          # Express middleware
├── routes/             # Route definitions
└── services/           # Business logic

mappers/
├── mapCommonFields.js  # Property field mapping
├── mapPropertyMedia.js # Media field mapping
└── mapResoFields.js    # RESO field mapping

utils/
├── odataParser.js      # OData query parsing
├── resoMetadata.js     # RESO metadata generation
└── validationHelpers.js # Input validation
```

#### Import/Export Standards
```javascript
// Use named exports for utilities
export function parseODataQuery(query) { }
export function validateFields(fields) { }

// Use default exports for main modules
export default class PropertyService { }

// Group related imports
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { supabase } from './server.js';
import { parseODataQuery } from './utils/odataParser.js';
```

## 🧪 Testing Requirements

### Test Coverage

All new code must include tests with minimum coverage requirements:

- **Unit Tests**: 90% coverage for new functions
- **Integration Tests**: All new API endpoints
- **Error Cases**: Test error conditions and edge cases
- **Performance**: Test performance-critical code paths

### Test Structure

```javascript
// Unit test example
describe('parseODataQuery', () => {
  test('should parse simple filter', () => {
    const query = { $filter: "City eq 'Toronto'" };
    const result = parseODataQuery(query, { allowedFields: ['City'] });
    
    expect(result.filter).toBeDefined();
    expect(result.filter.parsed.field).toBe('City');
    expect(result.filter.parsed.operator).toBe('eq');
    expect(result.filter.parsed.value).toBe('Toronto');
  });
  
  test('should handle invalid filter syntax', () => {
    const query = { $filter: "invalid syntax" };
    
    expect(() => {
      parseODataQuery(query, { allowedFields: ['City'] });
    }).toThrow('Invalid filter syntax');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## 📚 Documentation

### Code Documentation

#### JSDoc Comments
```javascript
/**
 * Parse OData query parameters and validate against allowed fields
 * @param {Object} query - Raw query parameters from request
 * @param {Object} options - Configuration options
 * @param {Array} options.allowedFields - List of allowed field names
 * @param {Array} options.allowedExpandFields - List of allowed expand fields
 * @returns {Object} Parsed query object with validated parameters
 * @throws {ValidationError} When query contains invalid parameters
 * @example
 * const query = { $filter: "City eq 'Toronto'", $top: "10" };
 * const result = parseODataQuery(query, { allowedFields: ['City'] });
 */
export function parseODataQuery(query, options) {
  // Implementation
}
```

#### README Updates
- Update relevant README sections for new features
- Add examples for new API endpoints
- Update installation instructions if needed
- Document any breaking changes

### API Documentation

#### Endpoint Documentation
```javascript
/**
 * GET /api/reso/Property
 * Retrieve property listings with OData query support
 * 
 * @query {string} $select - Comma-separated list of fields to select
 * @query {string} $filter - OData filter expression
 * @query {string} $orderby - Field to sort by with optional direction
 * @query {number} $top - Maximum number of results to return
 * @query {number} $skip - Number of results to skip
 * @query {string} $expand - Related entities to include
 * 
 * @returns {Object} OData-compliant response with property data
 * 
 * @example
 * GET /api/reso/Property?$select=ListingKey,ListPrice,City&$filter=City eq 'Toronto'
 */
router.get('/Property', async (req, res, next) => {
  // Implementation
});
```

## 🔀 Pull Request Process

### Before Submitting

1. **Ensure tests pass**
   ```bash
   npm test
   npm run lint
   ```

2. **Update documentation** if needed

3. **Check for breaking changes** and document them

4. **Test your changes** thoroughly

5. **Rebase on latest develop**
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout feature/your-feature
   git rebase develop
   ```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] All tests pass
- [ ] Manual testing completed

## RESO Compliance
- [ ] Changes maintain RESO Web API 2.0.0 compliance
- [ ] Field names follow RESO standards
- [ ] Data types are correct
- [ ] OData queries work as expected

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented if necessary)
```

### Review Process

1. **Automated checks** must pass (tests, linting, coverage)
2. **Code review** by at least one maintainer
3. **Testing** by reviewer if significant changes
4. **Approval** from maintainer before merge
5. **Merge** to develop branch

## 🐛 Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. Ubuntu 20.04]
 - Node.js version: [e.g. 18.0.0]
 - npm version: [e.g. 8.0.0]
 - Database: [e.g. Supabase]

**Additional context**
Add any other context about the problem here.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## 👥 Community Guidelines

### Getting Help

- **Check documentation** first
- **Search existing issues** before creating new ones
- **Ask questions** in GitHub discussions
- **Join our Slack** for real-time help

### Providing Help

- **Be patient** with newcomers
- **Provide clear explanations**
- **Share examples** when possible
- **Point to relevant documentation**

### Recognition

Contributors are recognized in:
- **README acknowledgments**
- **Release notes**
- **Contributor hall of fame**
- **Social media mentions**

## 🏆 Recognition Levels

### Contributor
- First successful pull request
- Bug fixes and documentation improvements

### Core Contributor
- Multiple significant contributions
- Active in community discussions
- Help with code reviews

### Maintainer
- Long-term commitment to project
- Significant architectural contributions
- Mentoring other contributors

## 📞 Contact

### Maintainers
- **Lead Maintainer**: lead@your-domain.com
- **Technical Lead**: tech@your-domain.com
- **Community Manager**: community@your-domain.com

### Communication Channels
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Slack**: For real-time chat and support
- **Email**: For private or sensitive matters

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You

Thank you for contributing to the Real Estate Backend project! Your contributions help make real estate data more accessible and standardized for the entire industry.

---

*For questions about contributing, please contact the maintainers or open a discussion on GitHub.*
