/**
 * Monitoring Service
 * Provides comprehensive monitoring, metrics collection, and health checks
 */

import winston from 'winston';
import { supabase } from '../../server.js';

// Configure structured logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'real-estate-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Metrics collection
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: {},
        byMethod: {},
        responseTimes: []
      },
      database: {
        queries: 0,
        errors: 0,
        connectionPool: {
          active: 0,
          idle: 0,
          total: 0
        }
      },
      external: {
        idxApi: { requests: 0, errors: 0, responseTime: [] },
        vowApi: { requests: 0, errors: 0, responseTime: [] }
      },
      sync: {
        lastRun: null,
        success: 0,
        failed: 0,
        recordsProcessed: 0
      },
      system: {
        memory: {
          used: 0,
          total: 0,
          percentage: 0
        },
        cpu: {
          usage: 0
        },
        uptime: 0
      }
    };
    
    this.startTime = Date.now();
    this.startMetricsCollection();
  }

  // Start periodic metrics collection
  startMetricsCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Collect database metrics every 60 seconds
    setInterval(() => {
      this.collectDatabaseMetrics();
    }, 60000);

    // Log metrics every 5 minutes
    setInterval(() => {
      this.logMetrics();
    }, 300000);
  }

  // Collect system metrics
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.system.memory.used = memUsage.heapUsed;
    this.metrics.system.memory.total = memUsage.heapTotal;
    this.metrics.system.memory.percentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    this.metrics.system.uptime = Date.now() - this.startTime;
  }

  // Collect database metrics
  async collectDatabaseMetrics() {
    try {
      // Test database connection
      const start = Date.now();
      const { data, error } = await supabase
        .from('common_fields')
        .select('count')
        .limit(1);
      
      const responseTime = Date.now() - start;
      
      if (error) {
        this.metrics.database.errors++;
        logger.error('Database health check failed', { error: error.message });
      } else {
        this.metrics.database.queries++;
        logger.debug('Database health check successful', { responseTime });
      }
    } catch (error) {
      this.metrics.database.errors++;
      logger.error('Database metrics collection failed', { error: error.message });
    }
  }

  // Record request metrics
  recordRequest(endpoint, method, statusCode, responseTime) {
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Track by endpoint
    if (!this.metrics.requests.byEndpoint[endpoint]) {
      this.metrics.requests.byEndpoint[endpoint] = { total: 0, successful: 0, failed: 0 };
    }
    this.metrics.requests.byEndpoint[endpoint].total++;
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.byEndpoint[endpoint].successful++;
    } else {
      this.metrics.requests.byEndpoint[endpoint].failed++;
    }

    // Track by method
    if (!this.metrics.requests.byMethod[method]) {
      this.metrics.requests.byMethod[method] = { total: 0, successful: 0, failed: 0 };
    }
    this.metrics.requests.byMethod[method].total++;
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.byMethod[method].successful++;
    } else {
      this.metrics.requests.byMethod[method].failed++;
    }

    // Track response times (keep last 100)
    this.metrics.requests.responseTimes.push(responseTime);
    if (this.metrics.requests.responseTimes.length > 100) {
      this.metrics.requests.responseTimes.shift();
    }
  }

  // Record external API metrics
  recordExternalApi(apiName, success, responseTime) {
    if (!this.metrics.external[apiName]) {
      this.metrics.external[apiName] = { requests: 0, errors: 0, responseTime: [] };
    }

    this.metrics.external[apiName].requests++;
    if (success) {
      this.metrics.external[apiName].responseTime.push(responseTime);
      if (this.metrics.external[apiName].responseTime.length > 50) {
        this.metrics.external[apiName].responseTime.shift();
      }
    } else {
      this.metrics.external[apiName].errors++;
    }
  }

  // Record sync metrics
  recordSync(success, recordsProcessed) {
    this.metrics.sync.lastRun = new Date().toISOString();
    if (success) {
      this.metrics.sync.success++;
      this.metrics.sync.recordsProcessed += recordsProcessed;
    } else {
      this.metrics.sync.failed++;
    }
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  // Get health status
  getHealthStatus() {
    const metrics = this.getMetrics();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: metrics.system.uptime,
      version: metrics.version,
      checks: {
        database: this.checkDatabaseHealth(),
        memory: this.checkMemoryHealth(),
        responseTime: this.checkResponseTimeHealth(),
        errorRate: this.checkErrorRateHealth()
      }
    };

    // Determine overall health status
    const failedChecks = Object.values(health.checks).filter(check => check.status !== 'healthy');
    if (failedChecks.length > 0) {
      health.status = failedChecks.some(check => check.status === 'critical') ? 'critical' : 'degraded';
    }

    return health;
  }

  // Check database health
  checkDatabaseHealth() {
    const errorRate = this.metrics.database.queries > 0 
      ? (this.metrics.database.errors / this.metrics.database.queries) * 100 
      : 0;

    if (errorRate > 10) {
      return { status: 'critical', message: `Database error rate: ${errorRate.toFixed(2)}%` };
    } else if (errorRate > 5) {
      return { status: 'degraded', message: `Database error rate: ${errorRate.toFixed(2)}%` };
    } else {
      return { status: 'healthy', message: 'Database connection stable' };
    }
  }

  // Check memory health
  checkMemoryHealth() {
    const memoryUsage = this.metrics.system.memory.percentage;
    
    if (memoryUsage > 90) {
      return { status: 'critical', message: `Memory usage: ${memoryUsage.toFixed(2)}%` };
    } else if (memoryUsage > 80) {
      return { status: 'degraded', message: `Memory usage: ${memoryUsage.toFixed(2)}%` };
    } else {
      return { status: 'healthy', message: `Memory usage: ${memoryUsage.toFixed(2)}%` };
    }
  }

  // Check response time health
  checkResponseTimeHealth() {
    const responseTimes = this.metrics.requests.responseTimes;
    if (responseTimes.length === 0) {
      return { status: 'healthy', message: 'No response time data available' };
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

    if (p95ResponseTime > 2000) {
      return { status: 'critical', message: `P95 response time: ${p95ResponseTime}ms` };
    } else if (p95ResponseTime > 1000) {
      return { status: 'degraded', message: `P95 response time: ${p95ResponseTime}ms` };
    } else {
      return { status: 'healthy', message: `P95 response time: ${p95ResponseTime}ms` };
    }
  }

  // Check error rate health
  checkErrorRateHealth() {
    const totalRequests = this.metrics.requests.total;
    if (totalRequests === 0) {
      return { status: 'healthy', message: 'No requests processed yet' };
    }

    const errorRate = (this.metrics.requests.failed / totalRequests) * 100;

    if (errorRate > 5) {
      return { status: 'critical', message: `Error rate: ${errorRate.toFixed(2)}%` };
    } else if (errorRate > 2) {
      return { status: 'degraded', message: `Error rate: ${errorRate.toFixed(2)}%` };
    } else {
      return { status: 'healthy', message: `Error rate: ${errorRate.toFixed(2)}%` };
    }
  }

  // Log metrics summary
  logMetrics() {
    const metrics = this.getMetrics();
    logger.info('Metrics summary', {
      requests: {
        total: metrics.requests.total,
        successRate: ((metrics.requests.successful / metrics.requests.total) * 100).toFixed(2) + '%',
        avgResponseTime: metrics.requests.responseTimes.length > 0 
          ? (metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / metrics.requests.responseTimes.length).toFixed(2) + 'ms'
          : 'N/A'
      },
      database: {
        queries: metrics.database.queries,
        errorRate: metrics.database.queries > 0 
          ? ((metrics.database.errors / metrics.database.queries) * 100).toFixed(2) + '%'
          : '0%'
      },
      system: {
        memoryUsage: metrics.system.memory.percentage.toFixed(2) + '%',
        uptime: Math.floor(metrics.system.uptime / 1000) + 's'
      }
    });
  }
}

// Create global metrics collector instance
const metricsCollector = new MetricsCollector();

// Health check functions
export const healthChecks = {
  // Basic health check
  async basic() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  },

  // Database health check
  async database() {
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from('common_fields')
        .select('count')
        .limit(1);
      
      const responseTime = Date.now() - start;

      if (error) {
        return {
          status: 'unhealthy',
          message: 'Database connection failed',
          error: error.message,
          responseTime
        };
      }

      return {
        status: 'healthy',
        message: 'Database connection successful',
        responseTime,
        data: data
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database health check failed',
        error: error.message
      };
    }
  },

  // External API health checks
  async externalApis() {
    const checks = {};

    // Check IDX API
    if (process.env.IDX_API_URL) {
      try {
        const start = Date.now();
        const response = await fetch(`${process.env.IDX_API_URL}/health`, {
          headers: {
            'Authorization': `Bearer ${process.env.IDX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        const responseTime = Date.now() - start;
        checks.idxApi = {
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime,
          statusCode: response.status
        };
      } catch (error) {
        checks.idxApi = {
          status: 'unhealthy',
          error: error.message
        };
      }
    }

    // Check VOW API
    if (process.env.VOW_API_URL) {
      try {
        const start = Date.now();
        const response = await fetch(`${process.env.VOW_API_URL}/health`, {
          headers: {
            'Authorization': `Bearer ${process.env.VOW_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        const responseTime = Date.now() - start;
        checks.vowApi = {
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime,
          statusCode: response.status
        };
      } catch (error) {
        checks.vowApi = {
          status: 'unhealthy',
          error: error.message
        };
      }
    }

    return checks;
  },

  // Comprehensive health check
  async comprehensive() {
    const [basic, database, externalApis] = await Promise.all([
      healthChecks.basic(),
      healthChecks.database(),
      healthChecks.externalApis()
    ]);

    const overallStatus = [basic, database].every(check => check.status === 'healthy') 
      ? 'healthy' 
      : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        basic,
        database,
        externalApis
      },
      metrics: metricsCollector.getHealthStatus()
    };
  }
};

// Middleware for request metrics
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    metricsCollector.recordRequest(
      req.route?.path || req.path,
      req.method,
      res.statusCode,
      responseTime
    );
  });

  next();
};

// Export services
export { metricsCollector, logger };
export default {
  metricsCollector,
  logger,
  healthChecks,
  metricsMiddleware
};
