// server.js - Enhanced Real Estate Backend Server
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';

// Import routes
import propertyRoutes from './api/routes/properties.js';
import mediaRoutes from './api/routes/media.js';
import openhouseRoutes from './api/routes/openhouses.js';
import syncRoutes from './api/routes/sync.js';
import resoRoutes from './api/routes/reso.js';
import healthRoutes from './api/routes/health.js';
import dashboardRoutes from './api/routes/dashboard.js';
import authRoutes from './api/routes/auth.js';
import oauthRoutes from './api/routes/oauth.js';
import cdnRoutes from './api/routes/cdn.js';

// Import middleware
import { errorHandler } from './api/middleware/errorHandler.js';
import { requestLogger } from './api/middleware/requestLogger.js';
import { 
  requestMonitoring, 
  errorMonitoring, 
  performanceMonitoring, 
  securityMonitoring,
  rateLimitMonitoring,
  healthCheckMonitoring 
} from './api/middleware/monitoring.js';

// Import monitoring services
import { metricsCollector, logger } from './api/services/monitoringService.js';
import { alertingService } from './api/services/alertingService.js';
import { validateMonitoringConfig } from './config/monitoring.js';

// Import cache services
import { cacheService } from './api/services/cacheService.js';
import { cacheMiddleware, cacheInvalidation, warmCache } from './api/middleware/cache.js';

// Import database service
import { databaseService } from './api/services/databaseService.js';

// Import environment validation
import { environmentValidator } from './config/validation.js';

// Import sync services
import { syncService } from './api/services/syncService.js';
import { syncScheduler } from './api/services/syncScheduler.js';

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate environment configuration
try {
  environmentValidator.validate();
  console.log('Environment validation completed successfully');
} catch (error) {
  console.error('Environment validation failed:', error.message);
  process.exit(1);
}

// Validate monitoring configuration
try {
  validateMonitoringConfig();
  console.log('Monitoring configuration validated successfully');
} catch (error) {
  console.error('Monitoring configuration validation failed:', error.message);
  process.exit(1);
}

// Enhanced Supabase client with better error handling
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      connectSrc: ["'self'", "http://localhost:3000", "http://localhost:3001"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Enhanced rate limiting with different limits for different endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased limit for testing sync operations
  message: { error: 'Rate limit exceeded for this endpoint.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/sync', strictLimiter); // Stricter limits for sync operations

// Compression middleware for better performance
app.use(compression());

// Static file serving for dashboard
app.use(express.static('public'));

// Serve sync dashboard (moved before catch-all route)

// Enhanced body parsing middleware with better limits
app.use(express.json({ 
  limit: process.env.MAX_PAYLOAD_SIZE || '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON payload' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_PAYLOAD_SIZE || '10mb' 
}));

// Enhanced logging middleware
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(requestLogger);

// Monitoring middleware
app.use(requestMonitoring);
app.use(performanceMonitoring);
app.use(securityMonitoring);
app.use(rateLimitMonitoring);
app.use(healthCheckMonitoring);

// Cache middleware
app.use(cacheMiddleware);
app.use(cacheInvalidation);

// Enhanced health check endpoint with more detailed information
app.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database connection using database service
    const dbHealth = await databaseService.healthCheck();
    
    // Test cache service
    const cacheHealth = await cacheService.healthCheck();
    
    const overallStatus = dbHealth.status === 'healthy' && cacheHealth.status === 'healthy' ? 'healthy' : 'unhealthy';

    res.json({ 
      status: overallStatus, 
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      responseTime: Date.now() - startTime,
      services: {
        database: dbHealth,
        cache: cacheHealth
      },
      environment: NODE_ENV,
      uptime: process.uptime(),
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    });

  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced test page route with better styling and functionality
app.get('/test', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔐 Real Estate Backend - Security Test</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 1000px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
        }
        .header h1 {
            color: #333;
            margin: 0;
            font-size: 2.5em;
        }
        .section { 
            margin: 25px 0; 
            padding: 20px; 
            border: 1px solid #e0e0e0; 
            border-radius: 10px;
            background: #fafafa;
            transition: all 0.3s ease;
        }
        .section:hover {
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        .public { border-left: 5px solid #28a745; }
        .protected { border-left: 5px solid #dc3545; }
        .info { border-left: 5px solid #17a2b8; }
        button { 
            background: linear-gradient(45deg, #007bff, #0056b3); 
            color: white; 
            border: none; 
            padding: 12px 20px; 
            margin: 8px; 
            border-radius: 25px; 
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        button:hover { 
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,123,255,0.4);
        }
        button:active {
            transform: translateY(0);
        }
        input { 
            padding: 12px 15px; 
            margin: 8px; 
            border: 2px solid #e0e0e0; 
            border-radius: 25px; 
            width: 100%;
            max-width: 400px;
            font-size: 14px;
            transition: border-color 0.3s ease;
        }
        input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
        }
        .results { 
            margin-top: 20px; 
            padding: 15px; 
            background: #f8f9fa; 
            border-radius: 10px; 
            min-height: 100px;
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #e9ecef;
        }
        .success { color: #28a745; font-weight: 500; }
        .error { color: #dc3545; font-weight: 500; }
        .info { color: #17a2b8; font-weight: 500; }
        .warning { color: #ffc107; font-weight: 500; }
        .clear-btn {
            background: linear-gradient(45deg, #6c757d, #495057);
            float: right;
        }
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-online { background: #28a745; }
        .status-offline { background: #dc3545; }
        .endpoint-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .endpoint-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
            text-align: center;
        }
        .endpoint-card h4 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .endpoint-card p {
            margin: 0;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Real Estate Backend - Security Test</h1>
            <p>Comprehensive API testing and security validation tool</p>
        </div>
        
        <div class="section public">
            <h3>✅ Public Endpoints (No Authentication Required)</h3>
            <button onclick="testHealth()">Test Health Check</button>
            <button onclick="testProperties()">Test Properties (Public Read)</button>
            <button onclick="testMedia()">Test Media (Public Read)</button>
            <button onclick="testOpenHouses()">Test Open Houses (Public Read)</button>
        </div>

        <div class="section protected">
            <h3>🔒 Protected Endpoints (Authentication Required)</h3>
            <input type="text" id="token" placeholder="Enter JWT token from Supabase Auth">
            <br><br>
            <button onclick="testUsers()">Test Users (Admin Only)</button>
            <button onclick="testAgents()">Test Agents (Admin Only)</button>
            <button onclick="testAudit()">Test Audit Logs (Admin Only)</button>
            <button onclick="testApiKeys()">Test API Keys (Authenticated)</button>
        </div>

        <div class="section info">
            <h3>📊 API Status & Endpoints</h3>
            <div class="endpoint-grid">
                <div class="endpoint-card">
                    <h4>Health Check</h4>
                    <p>/health</p>
                    <div class="status-indicator status-online"></div>Online
                </div>
                <div class="endpoint-card">
                    <h4>Properties</h4>
                    <p>/api/properties</p>
                    <div class="status-indicator status-online"></div>Online
                </div>
                <div class="endpoint-card">
                    <h4>Media</h4>
                    <p>/api/media</p>
                    <div class="status-indicator status-online"></div>Online
                </div>
                <div class="endpoint-card">
                    <h4>Open Houses</h4>
                    <p>/api/openhouses</p>
                    <div class="status-indicator status-online"></div>Online
                </div>
            </div>
        </div>

        <div class="section">
            <h3>📋 Test Results <button class="clear-btn" onclick="clearResults()">Clear</button></h3>
            <div id="results" class="results">Click a test button to see results...</div>
        </div>

        <div class="section info">
            <h3>📖 Test Instructions</h3>
            <ol>
                <li><strong>Test Public Endpoints:</strong> These should work without any authentication</li>
                <li><strong>Get JWT Token:</strong> Sign in to your Supabase project and copy the JWT token</li>
                <li><strong>Test Protected Endpoints:</strong> Paste the token and test admin functions</li>
                <li><strong>Verify Security:</strong> Protected endpoints should return 401 without valid token</li>
                <li><strong>Monitor Results:</strong> Check the test results section for detailed responses</li>
            </ol>
        </div>
    </div>

    <script>
        function log(message, type = 'info') {
            const results = document.getElementById('results');
            const timestamp = new Date().toLocaleTimeString();
            const className = type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info';
            const statusIcon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
            results.innerHTML += \`<div class="\${className}">\${statusIcon} [\${timestamp}] \${message}</div>\`;
            results.scrollTop = results.scrollHeight;
        }

        function clearResults() {
            document.getElementById('results').innerHTML = '';
        }

        async function testHealth() {
            clearResults();
            log('Testing Health Check...', 'info');
            try {
                const startTime = performance.now();
                const response = await fetch('/health');
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                const data = await response.json();
                log(\`✅ Health Check: Status \${response.status} (\${responseTime}ms)\`, 'success');
                log(\`Response: \${JSON.stringify(data, null, 2)}\`, 'info');
            } catch (error) {
                log(\`❌ Health Check Failed: \${error.message}\`, 'error');
            }
        }

        async function testProperties() {
            clearResults();
            log('Testing Properties (Public)...', 'info');
            try {
                const startTime = performance.now();
                const response = await fetch('/api/properties');
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                const data = await response.json();
                log(\`✅ Properties: Status \${response.status} (\${responseTime}ms)\`, 'success');
                log(\`Found \${data.length || 0} properties\`, 'info');
            } catch (error) {
                log(\`❌ Properties Failed: \${error.message}\`, 'error');
            }
        }

        async function testMedia() {
            clearResults();
            log('Testing Media (Public)...', 'info');
            try {
                const startTime = performance.now();
                const response = await fetch('/api/media');
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                const data = await response.json();
                log(\`✅ Media: Status \${response.status} (\${responseTime}ms)\`, 'success');
                log(\`Found \${data.length || 0} media items\`, 'info');
            } catch (error) {
                log(\`❌ Media Failed: \${error.message}\`, 'error');
            }
        }

        async function testOpenHouses() {
            clearResults();
            log('Testing Open Houses (Public)...', 'info');
            try {
                const startTime = performance.now();
                const response = await fetch('/api/openhouses');
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                const data = await response.json();
                log(\`✅ Open Houses: Status \${response.status} (\${responseTime}ms)\`, 'success');
                log(\`Found \${data.length || 0} open houses\`, 'info');
            } catch (error) {
                log(\`❌ Open Houses Failed: \${error.message}\`, 'error');
            }
        }

        async function testUsers() {
            clearResults();
            const token = document.getElementById('token').value;
            if (!token) {
                log('❌ Please enter a JWT token first', 'error');
                return;
            }
            
            log('Testing Users (Protected)...', 'info');
            try {
                const startTime = performance.now();
                const response = await fetch('/api/users', {
                    headers: {
                        'Authorization': \`Bearer \${token}\`
                    }
                });
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                const data = await response.json();
                
                if (response.status === 200) {
                    log(\`✅ Users: Status \${response.status} (\${responseTime}ms)\`, 'success');
                    log(\`Found \${data.length || 0} users\`, 'info');
                } else {
                    log(\`❌ Users: Status \${response.status} (\${responseTime}ms)\`, 'error');
                    log(\`Response: \${JSON.stringify(data)}\`, 'error');
                }
            } catch (error) {
                log(\`❌ Users Failed: \${error.message}\`, 'error');
            }
        }

        async function testAgents() {
            clearResults();
            const token = document.getElementById('token').value;
            if (!token) {
                log('❌ Please enter a JWT token first', 'error');
                return;
            }
            
            log('Testing Agents (Protected)...', 'info');
            try {
                const startTime = performance.now();
                const response = await fetch('/api/agents', {
                    headers: {
                        'Authorization': \`Bearer \${token}\`
                    }
                });
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                const data = await response.json();
                
                if (response.status === 200) {
                    log(\`✅ Agents: Status \${response.status} (\${responseTime}ms)\`, 'success');
                    log(\`Found \${data.length || 0} agents\`, 'info');
                } else {
                    log(\`❌ Agents: Status \${response.status} (\${responseTime}ms)\`, 'error');
                    log(\`Response: \${JSON.stringify(data)}\`, 'error');
                }
            } catch (error) {
                log(\`❌ Agents Failed: \${error.message}\`, 'error');
            }
        }

        async function testAudit() {
            clearResults();
            const token = document.getElementById('token').value;
            if (!token) {
                log('❌ Please enter a JWT token first', 'error');
                return;
            }
            
            log('Testing Audit Logs (Protected)...', 'info');
            try {
                const startTime = performance.now();
                const response = await fetch('/api/audit', {
                    headers: {
                        'Authorization': \`Bearer \${token}\`
                    }
                });
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                const data = await response.json();
                
                if (response.status === 200) {
                    log(\`✅ Audit: Status \${response.status} (\${responseTime}ms)\`, 'success');
                    log(\`Found \${data.length || 0} audit logs\`, 'info');
                } else {
                    log(\`❌ Audit: Status \${response.status} (\${responseTime}ms)\`, 'error');
                    log(\`Response: \${JSON.stringify(data)}\`, 'error');
                }
            } catch (error) {
                log(\`❌ Audit Failed: \${error.message}\`, 'error');
            }
        }

        async function testApiKeys() {
            clearResults();
            const token = document.getElementById('token').value;
            if (!token) {
                log('❌ Please enter a JWT token first', 'error');
                return;
            }
            
            log('Testing API Keys (Protected)...', 'info');
            try {
                const startTime = performance.now();
                const response = await fetch('/api/api-keys', {
                    headers: {
                        'Authorization': \`Bearer \${token}\`
                    }
                });
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                const data = await response.json();
                
                if (response.status === 200) {
                    log(\`✅ API Keys: Status \${response.status} (\${responseTime}ms)\`, 'success');
                    log(\`Found \${data.length || 0} API keys\`, 'info');
                } else {
                    log(\`❌ API Keys: Status \${response.status} (\${responseTime}ms)\`, 'error');
                    log(\`Response: \${JSON.stringify(data)}\`, 'error');
                }
            } catch (error) {
                log(\`❌ API Keys Failed: \${error.message}\`, 'error');
            }
        }

        // Auto-test health check on page load
        window.addEventListener('load', () => {
            setTimeout(testHealth, 1000);
        });
    </script>
</body>
</html>
  `);
});

// API routes
app.use('/api/properties', propertyRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/openhouses', openhouseRoutes);
app.use('/api/sync', syncRoutes);

// RESO Web API 2.0.0 routes
app.use('/api/reso', resoRoutes);

// Authentication routes
app.use('/auth', authRoutes);
app.use('/auth/oauth', oauthRoutes);

// CDN routes
app.use('/cdn', cdnRoutes);

// Monitoring and health check routes
app.use('/health', healthRoutes);
app.use('/dashboard', dashboardRoutes);

// Cache management routes
app.get('/cache/stats', async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    res.json({
      cache: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get cache statistics',
      message: error.message
    });
  }
});

app.post('/cache/clear', async (req, res) => {
  try {
    const { pattern } = req.body;
    
    if (pattern) {
      const deletedCount = await cacheService.invalidatePattern(pattern);
      res.json({
        message: `Cache cleared for pattern: ${pattern}`,
        deletedCount,
        timestamp: new Date().toISOString()
      });
    } else {
      await cacheService.flush();
      res.json({
        message: 'All cache cleared',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

app.post('/cache/warm', async (req, res) => {
  try {
    await warmCache();
    res.json({
      message: 'Cache warming completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to warm cache',
      message: error.message
    });
  }
});

// Enhanced root endpoint with more information
app.get('/', (req, res) => {
  res.json({
    message: 'Real Estate Backend API',
    version: process.env.APP_VERSION || '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      properties: '/api/properties',
      media: '/api/media',
      openhouses: '/api/openhouses',
      sync: '/api/sync',
      reso: '/api/reso',
      health: '/health',
      test: '/test'
    },
    documentation: {
      health: '/health - Server health and status information',
      test: '/test - Interactive API testing interface',
      api: '/api/* - REST API endpoints'
    }
  });
});

// Serve sync dashboard
app.get('/sync-dashboard', (req, res) => {
  res.sendFile('sync-dashboard.html', { root: 'public' });
});

// Enhanced 404 handler with suggestions
app.use('*', (req, res) => {
  const suggestions = [];
  const path = req.originalUrl;
  
  if (path.startsWith('/api/')) {
    suggestions.push('Check if the endpoint exists in your routes');
    suggestions.push('Verify the HTTP method (GET, POST, PUT, DELETE)');
    suggestions.push('Ensure proper authentication if required');
  } else if (path === '/health') {
    suggestions.push('The health endpoint is available at /health');
  } else if (path === '/test') {
    suggestions.push('The test page is available at /test');
  } else if (path === '/sync-dashboard') {
    suggestions.push('The sync dashboard is available at /sync-dashboard');
  }
  
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    suggestions: suggestions.length > 0 ? suggestions : ['Check the API documentation at /'],
    availableEndpoints: ['/', '/health', '/test', '/api/properties', '/api/media', '/api/openhouses', '/api/sync', '/api/reso']
  });
});

// Error monitoring middleware (must be before error handler)
app.use(errorMonitoring);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server with enhanced logging
const server = app.listen(PORT, async () => {
  console.log(`🚀 Real Estate Backend Server v${process.env.APP_VERSION || '1.0.0'} is running!`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`📈 Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`🔄 Sync Dashboard: http://localhost:${PORT}/sync-dashboard`);
  console.log(`💾 Cache Stats: http://localhost:${PORT}/cache/stats`);
  
  // Initialize sync services
  try {
    await syncService.initialize();
    console.log(`🔄 Sync service initialized`);
  } catch (error) {
    console.log(`⚠️  Sync service initialization failed: ${error.message}`);
  }

  // Start sync scheduler (only in production or when explicitly enabled)
  if (NODE_ENV === 'production' || process.env.ENABLE_SYNC_SCHEDULER === 'true') {
    try {
      await syncScheduler.initialize();
      console.log(`⏰ Sync scheduler started`);
    } catch (error) {
      console.log(`⚠️  Sync scheduler failed to start: ${error.message}`);
    }
  } else {
    console.log(`⏸️  Sync scheduler disabled (set ENABLE_SYNC_SCHEDULER=true to enable)`);
  }

  // Warm cache on startup
  try {
    await warmCache();
    console.log(`🔥 Cache warmed successfully`);
  } catch (error) {
    console.log(`⚠️  Cache warming failed: ${error.message}`);
  }
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  
  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;
  
  switch (error.code) {
    case 'EACCES':
      console.error(`❌ ${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`❌ ${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  
  try {
    // Stop sync scheduler
    await syncScheduler.stop();
    console.log('✅ Sync scheduler stopped');
    
    // Stop accepting new connections
    server.close(() => {
      console.log('✅ HTTP server closed');
    });
    
    // Close database connections
    await databaseService.close();
    console.log('✅ Database connections closed');
    
    // Close cache connections
    await cacheService.close();
    console.log('✅ Cache connections closed');
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
});

export default app;