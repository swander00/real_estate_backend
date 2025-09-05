# 🏠 Real Estate Backend

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![RESO Compliance](https://img.shields.io/badge/RESO-Web%20API%202.0.0-blue.svg)](https://www.reso.org/)
[![OData Support](https://img.shields.io/badge/OData-4.0-orange.svg)](https://www.odata.org/)

A production-ready, RESO Web API 2.0.0 compliant real estate backend with advanced MLS data synchronization, OData 4.0 query support, and comprehensive property data management.

## ✨ Features

### 🎯 RESO Compliance
- **Full RESO Web API 2.0.0 compliance** with standard field names and data types
- **OData 4.0 query support** with complex filtering, sorting, and pagination
- **Comprehensive metadata endpoint** with complete schema definitions
- **Standard resource endpoints** for Property, Media, OpenHouse, Room, Member, and Office

### 🔍 Advanced Query Capabilities
- **Complex OData filters** with AND/OR operators and parentheses
- **Function support** for contains, startswith, endswith operations
- **IN/NOT IN operators** for list-based filtering
- **Full-text search** across multiple entities
- **Relationship expansion** with $expand parameter
- **Field selection** with $select parameter

### 🗄️ Data Management
- **Multi-source data synchronization** from IDX and VOW feeds
- **Real-time data updates** with incremental sync capabilities
- **Data validation and cleaning** with comprehensive error handling
- **Property history tracking** for price changes and status updates
- **Media management** with automatic image processing and optimization

### 🚀 Performance & Scalability
- **High-performance database queries** with optimized indexes
- **Caching layer** with Redis support for improved response times
- **Connection pooling** for efficient database resource usage
- **Rate limiting** to ensure fair API usage
- **Horizontal scaling** support with load balancer compatibility

### 🔒 Security & Authentication
- **JWT-based authentication** with role-based access control
- **API key authentication** for external integrations
- **Row Level Security (RLS)** for data access control
- **Input validation and sanitization** to prevent security vulnerabilities
- **CORS configuration** for cross-origin request handling

### 📊 Monitoring & Operations
- **Comprehensive logging** with structured log formats
- **Health check endpoints** for system monitoring
- **Performance metrics** and alerting capabilities
- **Error tracking** with detailed error reporting
- **Operational runbook** for maintenance procedures

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **Supabase account** for database
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/real-estate-backend.git
   cd real-estate-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp env.template .env
   # Edit .env with your configuration
   ```

4. **Setup database**
   ```bash
   # Run database setup
   node database-setup.sql
   
   # Apply RLS policies
   node fix-rls-policies.sql
   
   # Create admin user
   node setup-admin-user.sql
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Run tests**
   ```bash
   npm test
   ```

## 📚 Documentation

### Core Documentation
- **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete API reference with examples
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Development setup and coding standards
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[Operational Runbook](docs/OPERATIONAL_RUNBOOK.md)** - Operations and maintenance procedures

### Quick Links
- **[Getting Started](#-quick-start)** - Installation and setup
- **[API Examples](#-api-examples)** - Common API usage patterns
- **[Configuration](#-configuration)** - Environment and system configuration
- **[Testing](#-testing)** - Test suite and quality assurance

## 🔌 API Examples

### Basic Property Query
```bash
# Get all properties
curl "https://your-domain.com/api/reso/Property"

# Get properties with specific fields
curl "https://your-domain.com/api/reso/Property?\$select=ListingKey,ListPrice,City"

# Filter properties by city
curl "https://your-domain.com/api/reso/Property?\$filter=City eq 'Toronto'"
```

### Advanced OData Queries
```bash
# Complex filter with multiple conditions
curl "https://your-domain.com/api/reso/Property?\$filter=(City eq 'Toronto' or City eq 'Vancouver') and ListPrice ge 500000"

# Search with function calls
curl "https://your-domain.com/api/reso/Property?\$filter=contains(PublicRemarks, 'pool') and BedroomsTotal ge 3"

# Expand related data
curl "https://your-domain.com/api/reso/Property?\$expand=Media,OpenHouse,Room"

# Pagination and sorting
curl "https://your-domain.com/api/reso/Property?\$top=50&\$skip=100&\$orderby=ListPrice desc"
```

### Cross-Entity Search
```bash
# Search across all entities
curl "https://your-domain.com/api/reso/\$search?\$search=downtown pool"
```

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   API Gateway   │────│   Application   │
│     (Nginx)     │    │   (Express)     │    │     Server      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Database      │
                       │   (Supabase)    │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  External APIs  │
                       │  (IDX & VOW)    │
                       └─────────────────┘
```

### Data Flow

1. **External Data Sources** → IDX/VOW APIs provide property data
2. **Data Synchronization** → Scheduled sync jobs process and clean data
3. **Database Storage** → Supabase stores normalized property data
4. **API Layer** → Express.js serves RESO-compliant endpoints
5. **Client Applications** → Frontend apps consume the API

## ⚙️ Configuration

### Environment Variables

```bash
# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Configuration
API_BASE_URL=https://your-domain.com
PORT=3000

# Authentication
JWT_SECRET=your-jwt-secret-key
API_KEY_SECRET=your-api-key-secret

# External APIs
IDX_API_URL=https://idx-api.example.com
IDX_API_KEY=your-idx-api-key
VOW_API_URL=https://vow-api.example.com
VOW_API_KEY=your-vow-api-key

# Performance
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL_SECONDS=300
```

### Database Schema

The system uses a normalized database schema with the following core tables:

- **`common_fields`** - Property listings with RESO-compliant fields
- **`property_media`** - Property images and media files
- **`property_openhouse`** - Open house events and schedules
- **`property_rooms`** - Room details and specifications
- **`users`** - Agent and broker information
- **`offices`** - Brokerage office information

## 🧪 Testing

### Test Suite

The project includes a comprehensive test suite with:

- **Unit Tests** - Individual function and module testing
- **Integration Tests** - API endpoint and database interaction testing
- **End-to-End Tests** - Complete workflow testing
- **Performance Tests** - Load and stress testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Coverage

The project maintains high test coverage with minimum thresholds:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## 🚀 Deployment

### Supported Platforms

- **Vercel** - Serverless deployment with automatic scaling
- **AWS** - Lambda, ECS, or EC2 deployment options
- **Docker** - Containerized deployment for any platform
- **Kubernetes** - Orchestrated deployment with auto-scaling

### Quick Deployment

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Docker
```bash
# Build image
docker build -t real-estate-backend .

# Run container
docker run -d -p 3000:3000 --env-file .env real-estate-backend
```

#### AWS Lambda
```bash
# Deploy with Serverless Framework
serverless deploy
```

## 📊 Monitoring

### Health Checks

```bash
# Application health
curl https://your-domain.com/health

# Database health
curl https://your-domain.com/health/database

# External API health
curl https://your-domain.com/health/external
```

### Metrics

The system provides comprehensive metrics including:
- **Response times** and throughput
- **Error rates** and status codes
- **Database performance** and connection usage
- **Cache hit rates** and memory usage
- **Sync job status** and data freshness

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards

- Follow ES6+ JavaScript standards
- Maintain RESO compliance
- Write comprehensive tests
- Update documentation
- Follow security best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

- **Documentation**: Check the [docs](docs/) folder for comprehensive guides
- **Issues**: Create a [GitHub issue](https://github.com/your-repo/real-estate-backend/issues) for bugs
- **Discussions**: Use [GitHub discussions](https://github.com/your-repo/real-estate-backend/discussions) for questions
- **Email**: Contact support@your-domain.com

### Community

- **Slack**: Join our [development Slack](https://your-slack.workspace.com)
- **Discord**: Chat with the community on [Discord](https://discord.gg/your-server)
- **Twitter**: Follow updates on [@YourTwitter](https://twitter.com/YourTwitter)

## 🗺️ Roadmap

### Upcoming Features

- **GraphQL API** - Alternative query interface
- **Real-time Updates** - WebSocket support for live data
- **Advanced Analytics** - Property market insights
- **Mobile SDK** - Native mobile app support
- **Multi-tenant Support** - Multiple MLS organization support

### Version History

- **v2.0.0** - Full RESO compliance and OData support
- **v1.5.0** - Enhanced sync capabilities and performance
- **v1.0.0** - Initial release with basic functionality

## 🙏 Acknowledgments

- **RESO** for the Web API 2.0.0 standard
- **Supabase** for the database platform
- **Express.js** for the web framework
- **Open source community** for various dependencies

---

**Built with ❤️ for the real estate industry**

*For more information, visit [your-domain.com](https://your-domain.com) or check out our [documentation](docs/).*
