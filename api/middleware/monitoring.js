/**
 * Monitoring Middleware
 * Provides request monitoring, metrics collection, and performance tracking
 */

import { metricsCollector, logger } from '../services/monitoringService.js';
import { alertingService, ALERT_TYPES, ALERT_SEVERITY } from '../services/alertingService.js';

// Request monitoring middleware
export const requestMonitoring = (req, res, next) => {
  const start = Date.now();
  const requestId = generateRequestId();
  
  // Add request ID to request object
  req.requestId = requestId;
  
  // Log request start
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - start;
    
    // Record metrics
    metricsCollector.recordRequest(
      req.route?.path || req.path,
      req.method,
      res.statusCode,
      responseTime
    );

    // Log request completion
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      contentLength: res.get('Content-Length') || 0,
      timestamp: new Date().toISOString()
    });

    // Check for slow requests
    if (responseTime > 5000) { // 5 seconds
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        responseTime,
        statusCode: res.statusCode
      });
    }

    // Check for error responses
    if (res.statusCode >= 400) {
      logger.error('Error response', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime,
        error: res.statusMessage
      });
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error monitoring middleware
export const errorMonitoring = (error, req, res, next) => {
  const requestId = req.requestId || 'unknown';
  
  // Log error
  logger.error('Request error', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    timestamp: new Date().toISOString()
  });

  // Send alert for critical errors
  if (error.status >= 500) {
    alertingService.sendAlert({
      type: ALERT_TYPES.API,
      severity: ALERT_SEVERITY.HIGH,
      title: 'Server Error Detected',
      message: `Server error ${error.status} on ${req.method} ${req.originalUrl}`,
      data: {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: error.status,
        errorMessage: error.message
      }
    });
  }

  // Record error metrics
  metricsCollector.recordRequest(
    req.route?.path || req.path,
    req.method,
    error.status || 500,
    Date.now() - (req.startTime || Date.now())
  );

  next(error);
};

// Performance monitoring middleware
export const performanceMonitoring = (req, res, next) => {
  req.startTime = Date.now();
  
  // Monitor memory usage
  const initialMemory = process.memoryUsage();
  
  res.on('finish', () => {
    const finalMemory = process.memoryUsage();
    const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;
    
    // Log significant memory usage
    if (memoryDelta > 10 * 1024 * 1024) { // 10MB
      logger.warn('High memory usage request', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        memoryDelta: Math.round(memoryDelta / 1024 / 1024) + 'MB',
        finalMemory: Math.round(finalMemory.heapUsed / 1024 / 1024) + 'MB'
      });
    }
  });

  next();
};

// Security monitoring middleware
export const securityMonitoring = (req, res, next) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /eval\(/i,  // Code injection
    /javascript:/i  // JavaScript injection
  ];

  const url = req.originalUrl;
  const body = JSON.stringify(req.body || {});
  const query = JSON.stringify(req.query || {});

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(body) || pattern.test(query)) {
      logger.warn('Suspicious request detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        pattern: pattern.toString(),
        timestamp: new Date().toISOString()
      });

      // Send security alert
      alertingService.sendAlert({
        type: ALERT_TYPES.SECURITY,
        severity: ALERT_SEVERITY.HIGH,
        title: 'Suspicious Request Detected',
        message: `Suspicious pattern detected in ${req.method} ${req.originalUrl}`,
        data: {
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          pattern: pattern.toString()
        }
      });

      break;
    }
  }

  next();
};

// Rate limiting monitoring
export const rateLimitMonitoring = (req, res, next) => {
  // This would integrate with your rate limiting middleware
  // For now, just log rate limit hits
  
  res.on('finish', () => {
    if (res.statusCode === 429) {
      logger.warn('Rate limit exceeded', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      // Send rate limit alert
      alertingService.sendAlert({
        type: ALERT_TYPES.SECURITY,
        severity: ALERT_SEVERITY.MEDIUM,
        title: 'Rate Limit Exceeded',
        message: `Rate limit exceeded for IP ${req.ip}`,
        data: {
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    }
  });

  next();
};

// Database monitoring middleware
export const databaseMonitoring = (req, res, next) => {
  const start = Date.now();
  
  // Override res.json to monitor database queries
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - start;
    
    // Log slow database responses
    if (responseTime > 1000) { // 1 second
      logger.warn('Slow database response', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        responseTime,
        timestamp: new Date().toISOString()
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

// Health check monitoring
export const healthCheckMonitoring = (req, res, next) => {
  // Don't monitor health check endpoints to avoid noise
  if (req.path.startsWith('/health') || req.path.startsWith('/metrics')) {
    return next();
  }

  // Monitor health check failures
  res.on('finish', () => {
    if (req.path.includes('health') && res.statusCode >= 400) {
      logger.error('Health check failed', {
        requestId: req.requestId,
        path: req.path,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      });

      // Send critical alert for health check failures
      alertingService.sendAlert({
        type: ALERT_TYPES.SYSTEM,
        severity: ALERT_SEVERITY.CRITICAL,
        title: 'Health Check Failed',
        message: `Health check ${req.path} returned status ${res.statusCode}`,
        data: {
          requestId: req.requestId,
          path: req.path,
          statusCode: res.statusCode
        }
      });
    }
  });

  next();
};

// Custom metrics middleware
export const customMetrics = (metricName, valueFunction) => {
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const value = valueFunction(req, res, Date.now() - start);
      
      // Record custom metric
      logger.info('Custom metric', {
        requestId: req.requestId,
        metric: metricName,
        value,
        method: req.method,
        url: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    });

    next();
  };
};

// Request ID generator
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Export all middleware
export default {
  requestMonitoring,
  errorMonitoring,
  performanceMonitoring,
  securityMonitoring,
  rateLimitMonitoring,
  databaseMonitoring,
  healthCheckMonitoring,
  customMetrics
};
