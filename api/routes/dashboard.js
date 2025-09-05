/**
 * Monitoring Dashboard Routes
 * Provides a web-based monitoring dashboard
 */

import express from 'express';
import { metricsCollector } from '../services/monitoringService.js';
import { alertingService } from '../services/alertingService.js';

const router = express.Router();

// Dashboard overview
router.get('/', (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    const health = metricsCollector.getHealthStatus();
    const alertStats = alertingService.getAlertStats();
    
    const dashboard = {
      overview: {
        status: health.status,
        uptime: Math.floor(metrics.system.uptime / 1000),
        version: metrics.version,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      },
      metrics: {
        requests: {
          total: metrics.requests.total,
          successful: metrics.requests.successful,
          failed: metrics.requests.failed,
          successRate: metrics.requests.total > 0 
            ? ((metrics.requests.successful / metrics.requests.total) * 100).toFixed(2)
            : 0,
          avgResponseTime: metrics.requests.responseTimes.length > 0
            ? (metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / metrics.requests.responseTimes.length).toFixed(2)
            : 0
        },
        database: {
          queries: metrics.database.queries,
          errors: metrics.database.errors,
          errorRate: metrics.database.queries > 0
            ? ((metrics.database.errors / metrics.database.queries) * 100).toFixed(2)
            : 0
        },
        system: {
          memoryUsage: metrics.system.memory.percentage.toFixed(2),
          memoryUsed: Math.round(metrics.system.memory.used / 1024 / 1024), // MB
          memoryTotal: Math.round(metrics.system.memory.total / 1024 / 1024) // MB
        }
      },
      alerts: {
        total: alertStats.total,
        bySeverity: alertStats.bySeverity,
        byType: alertStats.byType,
        recent: alertStats.recent.slice(0, 5)
      },
      health: health.checks
    };

    res.status(200).json(dashboard);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve dashboard data',
      message: error.message
    });
  }
});

// Real-time metrics (for WebSocket or polling)
router.get('/metrics/realtime', (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    
    const realtime = {
      timestamp: new Date().toISOString(),
      requests: {
        total: metrics.requests.total,
        successful: metrics.requests.successful,
        failed: metrics.requests.failed,
        currentRate: this.calculateCurrentRate(metrics.requests),
        avgResponseTime: metrics.requests.responseTimes.length > 0
          ? (metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / metrics.requests.responseTimes.length).toFixed(2)
          : 0
      },
      system: {
        memoryUsage: metrics.system.memory.percentage.toFixed(2),
        uptime: Math.floor(metrics.system.uptime / 1000)
      },
      database: {
        queries: metrics.database.queries,
        errors: metrics.database.errors
      }
    };

    res.status(200).json(realtime);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve real-time metrics',
      message: error.message
    });
  }
});

// Request analytics
router.get('/analytics/requests', (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    
    const analytics = {
      summary: {
        total: metrics.requests.total,
        successful: metrics.requests.successful,
        failed: metrics.requests.failed,
        successRate: metrics.requests.total > 0 
          ? ((metrics.requests.successful / metrics.requests.total) * 100).toFixed(2)
          : 0
      },
      byEndpoint: Object.entries(metrics.requests.byEndpoint).map(([endpoint, stats]) => ({
        endpoint,
        total: stats.total,
        successful: stats.successful,
        failed: stats.failed,
        successRate: stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(2) : 0
      })),
      byMethod: Object.entries(metrics.requests.byMethod).map(([method, stats]) => ({
        method,
        total: stats.total,
        successful: stats.successful,
        failed: stats.failed,
        successRate: stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(2) : 0
      })),
      responseTimes: {
        min: metrics.requests.responseTimes.length > 0 ? Math.min(...metrics.requests.responseTimes) : 0,
        max: metrics.requests.responseTimes.length > 0 ? Math.max(...metrics.requests.responseTimes) : 0,
        avg: metrics.requests.responseTimes.length > 0 
          ? (metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / metrics.requests.responseTimes.length).toFixed(2)
          : 0,
        p50: this.calculatePercentile(metrics.requests.responseTimes, 50),
        p95: this.calculatePercentile(metrics.requests.responseTimes, 95),
        p99: this.calculatePercentile(metrics.requests.responseTimes, 99)
      }
    };

    res.status(200).json(analytics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve request analytics',
      message: error.message
    });
  }
});

// System performance
router.get('/performance', (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    
    const performance = {
      system: {
        memory: {
          used: Math.round(metrics.system.memory.used / 1024 / 1024), // MB
          total: Math.round(metrics.system.memory.total / 1024 / 1024), // MB
          percentage: metrics.system.memory.percentage.toFixed(2)
        },
        uptime: {
          seconds: Math.floor(metrics.system.uptime / 1000),
          formatted: this.formatUptime(metrics.system.uptime)
        }
      },
      database: {
        performance: {
          queries: metrics.database.queries,
          errors: metrics.database.errors,
          errorRate: metrics.database.queries > 0
            ? ((metrics.database.errors / metrics.database.queries) * 100).toFixed(2)
            : 0
        }
      },
      external: Object.entries(metrics.external).map(([apiName, apiMetrics]) => ({
        name: apiName,
        requests: apiMetrics.requests,
        errors: apiMetrics.errors,
        errorRate: apiMetrics.requests > 0
          ? ((apiMetrics.errors / apiMetrics.requests) * 100).toFixed(2)
          : 0,
        avgResponseTime: apiMetrics.responseTime.length > 0
          ? (apiMetrics.responseTime.reduce((a, b) => a + b, 0) / apiMetrics.responseTime.length).toFixed(2)
          : 0
      }))
    };

    res.status(200).json(performance);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve performance data',
      message: error.message
    });
  }
});

// Alert management
router.get('/alerts', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const severity = req.query.severity;
    const type = req.query.type;
    
    let alerts = alertingService.getAlertHistory(limit);
    
    // Filter by severity
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    // Filter by type
    if (type) {
      alerts = alerts.filter(alert => alert.type === type);
    }
    
    res.status(200).json({
      alerts,
      count: alerts.length,
      filters: { severity, type, limit },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve alerts',
      message: error.message
    });
  }
});

// Alert statistics
router.get('/alerts/stats', (req, res) => {
  try {
    const stats = alertingService.getAlertStats();
    
    const alertStats = {
      summary: {
        total: stats.total,
        bySeverity: stats.bySeverity,
        byType: stats.byType
      },
      trends: {
        last24Hours: this.calculateAlertTrends(stats.recent, 24),
        last7Days: this.calculateAlertTrends(stats.recent, 168) // 7 days in hours
      },
      recent: stats.recent.slice(0, 10)
    };

    res.status(200).json(alertStats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve alert statistics',
      message: error.message
    });
  }
});

// System configuration
router.get('/config', (req, res) => {
  try {
    const config = {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      features: {
        monitoring: true,
        alerting: true,
        metrics: true,
        healthChecks: true
      },
      limits: {
        maxResponseTime: 2000,
        maxMemoryUsage: 90,
        maxErrorRate: 5
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve configuration',
      message: error.message
    });
  }
});

// Helper methods
function calculateCurrentRate(requests) {
  // This would need to be implemented with time-based tracking
  // For now, return a placeholder
  return '0/min';
}

function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function calculateAlertTrends(alerts, hours) {
  const now = Date.now();
  const cutoff = now - (hours * 60 * 60 * 1000);
  
  const recentAlerts = alerts.filter(alert => 
    new Date(alert.timestamp).getTime() > cutoff
  );
  
  return {
    count: recentAlerts.length,
    bySeverity: recentAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {}),
    byType: recentAlerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {})
  };
}

export default router;
