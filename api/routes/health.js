/**
 * Health Check Routes
 * Provides comprehensive health monitoring endpoints
 */

import express from 'express';
import { healthChecks, metricsCollector } from '../services/monitoringService.js';
import { alertingService } from '../services/alertingService.js';

const router = express.Router();

// Basic health check endpoint
router.get('/', async (req, res) => {
  try {
    const health = await healthChecks.basic();
    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Database health check
router.get('/database', async (req, res) => {
  try {
    const health = await healthChecks.database();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// External APIs health check
router.get('/external', async (req, res) => {
  try {
    const health = await healthChecks.externalApis();
    const hasUnhealthy = Object.values(health).some(check => check.status === 'unhealthy');
    const statusCode = hasUnhealthy ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Comprehensive health check
router.get('/comprehensive', async (req, res) => {
  try {
    const health = await healthChecks.comprehensive();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Metrics endpoint
router.get('/metrics', (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

// Health status with metrics
router.get('/status', (req, res) => {
  try {
    const health = metricsCollector.getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Alert history endpoint
router.get('/alerts', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = alertingService.getAlertHistory(limit);
    res.status(200).json({
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve alerts',
      message: error.message
    });
  }
});

// Alert statistics endpoint
router.get('/alerts/stats', (req, res) => {
  try {
    const stats = alertingService.getAlertStats();
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve alert statistics',
      message: error.message
    });
  }
});

// System information endpoint
router.get('/system', (req, res) => {
  try {
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(systemInfo);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve system information',
      message: error.message
    });
  }
});

// Readiness probe (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    const health = await healthChecks.comprehensive();
    
    if (health.status === 'healthy') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        checks: health.checks
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Liveness probe (for Kubernetes)
router.get('/live', (req, res) => {
  try {
    // Basic liveness check - if we can respond, we're alive
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'not alive',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Performance metrics endpoint
router.get('/performance', (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    const performance = {
      requests: {
        total: metrics.requests.total,
        successful: metrics.requests.successful,
        failed: metrics.requests.failed,
        successRate: metrics.requests.total > 0 
          ? ((metrics.requests.successful / metrics.requests.total) * 100).toFixed(2) + '%'
          : '0%',
        avgResponseTime: metrics.requests.responseTimes.length > 0
          ? (metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / metrics.requests.responseTimes.length).toFixed(2) + 'ms'
          : 'N/A',
        p95ResponseTime: metrics.requests.responseTimes.length > 0
          ? metrics.requests.responseTimes.sort((a, b) => a - b)[Math.floor(metrics.requests.responseTimes.length * 0.95)] + 'ms'
          : 'N/A'
      },
      database: {
        queries: metrics.database.queries,
        errors: metrics.database.errors,
        errorRate: metrics.database.queries > 0
          ? ((metrics.database.errors / metrics.database.queries) * 100).toFixed(2) + '%'
          : '0%'
      },
      system: {
        memoryUsage: metrics.system.memory.percentage.toFixed(2) + '%',
        uptime: Math.floor(metrics.system.uptime / 1000) + 's'
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(performance);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve performance metrics',
      message: error.message
    });
  }
});

// Custom health check endpoint
router.post('/custom', async (req, res) => {
  try {
    const { checks } = req.body;
    
    if (!checks || !Array.isArray(checks)) {
      return res.status(400).json({
        error: 'Invalid request body. Expected { checks: string[] }'
      });
    }

    const results = {};
    
    for (const check of checks) {
      switch (check) {
        case 'database':
          results.database = await healthChecks.database();
          break;
        case 'external':
          results.external = await healthChecks.externalApis();
          break;
        case 'basic':
          results.basic = await healthChecks.basic();
          break;
        default:
          results[check] = {
            status: 'unknown',
            message: `Unknown health check: ${check}`
          };
      }
    }

    const hasUnhealthy = Object.values(results).some(result => result.status === 'unhealthy');
    const statusCode = hasUnhealthy ? 503 : 200;

    res.status(statusCode).json({
      checks: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to perform custom health checks',
      message: error.message
    });
  }
});

export default router;
