/**
 * Alerting Service
 * Provides comprehensive alerting capabilities for monitoring and incident management
 */

import winston from 'winston';
import { metricsCollector } from './monitoringService.js';

// Configure alerting logger
const alertLogger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'alerting' },
  transports: [
    new winston.transports.File({ filename: 'logs/alerts.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Alert severity levels
export const ALERT_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

// Alert types
export const ALERT_TYPES = {
  SYSTEM: 'system',
  DATABASE: 'database',
  API: 'api',
  EXTERNAL: 'external',
  SECURITY: 'security',
  PERFORMANCE: 'performance'
};

// Alert configuration
const alertConfig = {
  thresholds: {
    errorRate: { critical: 5, high: 2, medium: 1 },
    responseTime: { critical: 2000, high: 1000, medium: 500 },
    memoryUsage: { critical: 90, high: 80, medium: 70 },
    databaseErrors: { critical: 10, high: 5, medium: 2 },
    externalApiErrors: { critical: 20, high: 10, medium: 5 }
  },
  cooldownPeriods: {
    critical: 300000,  // 5 minutes
    high: 600000,      // 10 minutes
    medium: 1800000,   // 30 minutes
    low: 3600000       // 1 hour
  },
  maxAlertsPerHour: {
    critical: 10,
    high: 20,
    medium: 50,
    low: 100
  }
};

// Alert storage (in production, use Redis or database)
const alertHistory = new Map();
const alertCounts = new Map();

class AlertingService {
  constructor() {
    this.alertChannels = [];
    this.startMonitoring();
  }

  // Add alert channel
  addChannel(channel) {
    this.alertChannels.push(channel);
  }

  // Start monitoring for alerts
  startMonitoring() {
    // Check for alerts every 30 seconds
    setInterval(() => {
      this.checkAlerts();
    }, 30000);

    // Check for critical alerts every 10 seconds
    setInterval(() => {
      this.checkCriticalAlerts();
    }, 10000);
  }

  // Check for various alert conditions
  async checkAlerts() {
    const metrics = metricsCollector.getMetrics();
    
    // Check error rate
    await this.checkErrorRateAlert(metrics);
    
    // Check response time
    await this.checkResponseTimeAlert(metrics);
    
    // Check memory usage
    await this.checkMemoryUsageAlert(metrics);
    
    // Check database health
    await this.checkDatabaseAlert(metrics);
    
    // Check external API health
    await this.checkExternalApiAlert(metrics);
    
    // Check sync status
    await this.checkSyncAlert(metrics);
  }

  // Check for critical alerts more frequently
  async checkCriticalAlerts() {
    const metrics = metricsCollector.getMetrics();
    
    // Check for critical memory usage
    if (metrics.system.memory.percentage > 95) {
      await this.sendAlert({
        type: ALERT_TYPES.SYSTEM,
        severity: ALERT_SEVERITY.CRITICAL,
        title: 'Critical Memory Usage',
        message: `Memory usage is at ${metrics.system.memory.percentage.toFixed(2)}%`,
        data: { memoryUsage: metrics.system.memory.percentage }
      });
    }

    // Check for critical error rate
    const errorRate = metrics.requests.total > 0 
      ? (metrics.requests.failed / metrics.requests.total) * 100 
      : 0;
    
    if (errorRate > 10) {
      await this.sendAlert({
        type: ALERT_TYPES.API,
        severity: ALERT_SEVERITY.CRITICAL,
        title: 'Critical Error Rate',
        message: `Error rate is at ${errorRate.toFixed(2)}%`,
        data: { errorRate, totalRequests: metrics.requests.total }
      });
    }
  }

  // Check error rate alert
  async checkErrorRateAlert(metrics) {
    if (metrics.requests.total === 0) return;

    const errorRate = (metrics.requests.failed / metrics.requests.total) * 100;
    const severity = this.getSeverity(errorRate, alertConfig.thresholds.errorRate);

    if (severity) {
      await this.sendAlert({
        type: ALERT_TYPES.API,
        severity,
        title: 'High Error Rate Detected',
        message: `Error rate is at ${errorRate.toFixed(2)}% (${metrics.requests.failed}/${metrics.requests.total} requests)`,
        data: { errorRate, failedRequests: metrics.requests.failed, totalRequests: metrics.requests.total }
      });
    }
  }

  // Check response time alert
  async checkResponseTimeAlert(metrics) {
    if (metrics.requests.responseTimes.length === 0) return;

    const p95ResponseTime = metrics.requests.responseTimes
      .sort((a, b) => a - b)[Math.floor(metrics.requests.responseTimes.length * 0.95)];
    
    const severity = this.getSeverity(p95ResponseTime, alertConfig.thresholds.responseTime);

    if (severity) {
      await this.sendAlert({
        type: ALERT_TYPES.PERFORMANCE,
        severity,
        title: 'High Response Time Detected',
        message: `P95 response time is ${p95ResponseTime}ms`,
        data: { p95ResponseTime, avgResponseTime: metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / metrics.requests.responseTimes.length }
      });
    }
  }

  // Check memory usage alert
  async checkMemoryUsageAlert(metrics) {
    const memoryUsage = metrics.system.memory.percentage;
    const severity = this.getSeverity(memoryUsage, alertConfig.thresholds.memoryUsage);

    if (severity) {
      await this.sendAlert({
        type: ALERT_TYPES.SYSTEM,
        severity,
        title: 'High Memory Usage',
        message: `Memory usage is at ${memoryUsage.toFixed(2)}%`,
        data: { memoryUsage, usedMemory: metrics.system.memory.used, totalMemory: metrics.system.memory.total }
      });
    }
  }

  // Check database alert
  async checkDatabaseAlert(metrics) {
    if (metrics.database.queries === 0) return;

    const errorRate = (metrics.database.errors / metrics.database.queries) * 100;
    const severity = this.getSeverity(errorRate, alertConfig.thresholds.databaseErrors);

    if (severity) {
      await this.sendAlert({
        type: ALERT_TYPES.DATABASE,
        severity,
        title: 'Database Issues Detected',
        message: `Database error rate is at ${errorRate.toFixed(2)}%`,
        data: { errorRate, databaseErrors: metrics.database.errors, totalQueries: metrics.database.queries }
      });
    }
  }

  // Check external API alert
  async checkExternalApiAlert(metrics) {
    for (const [apiName, apiMetrics] of Object.entries(metrics.external)) {
      if (apiMetrics.requests === 0) continue;

      const errorRate = (apiMetrics.errors / apiMetrics.requests) * 100;
      const severity = this.getSeverity(errorRate, alertConfig.thresholds.externalApiErrors);

      if (severity) {
        await this.sendAlert({
          type: ALERT_TYPES.EXTERNAL,
          severity,
          title: `External API Issues: ${apiName}`,
          message: `${apiName} API error rate is at ${errorRate.toFixed(2)}%`,
          data: { apiName, errorRate, errors: apiMetrics.errors, requests: apiMetrics.requests }
        });
      }
    }
  }

  // Check sync alert
  async checkSyncAlert(metrics) {
    if (!metrics.sync.lastRun) return;

    const lastRun = new Date(metrics.sync.lastRun);
    const timeSinceLastRun = Date.now() - lastRun.getTime();
    const hoursSinceLastRun = timeSinceLastRun / (1000 * 60 * 60);

    // Alert if sync hasn't run in more than 2 hours
    if (hoursSinceLastRun > 2) {
      await this.sendAlert({
        type: ALERT_TYPES.SYSTEM,
        severity: ALERT_SEVERITY.HIGH,
        title: 'Sync Job Overdue',
        message: `Last sync was ${hoursSinceLastRun.toFixed(1)} hours ago`,
        data: { lastRun: metrics.sync.lastRun, hoursSinceLastRun }
      });
    }

    // Alert if sync failure rate is high
    const totalSyncs = metrics.sync.success + metrics.sync.failed;
    if (totalSyncs > 0) {
      const failureRate = (metrics.sync.failed / totalSyncs) * 100;
      if (failureRate > 20) {
        await this.sendAlert({
          type: ALERT_TYPES.SYSTEM,
          severity: ALERT_SEVERITY.MEDIUM,
          title: 'High Sync Failure Rate',
          message: `Sync failure rate is at ${failureRate.toFixed(2)}%`,
          data: { failureRate, successfulSyncs: metrics.sync.success, failedSyncs: metrics.sync.failed }
        });
      }
    }
  }

  // Get severity level based on thresholds
  getSeverity(value, thresholds) {
    if (value >= thresholds.critical) return ALERT_SEVERITY.CRITICAL;
    if (value >= thresholds.high) return ALERT_SEVERITY.HIGH;
    if (value >= thresholds.medium) return ALERT_SEVERITY.MEDIUM;
    return null;
  }

  // Send alert
  async sendAlert(alert) {
    const alertKey = `${alert.type}-${alert.severity}-${alert.title}`;
    const now = Date.now();

    // Check cooldown period
    if (this.isInCooldown(alertKey, alert.severity)) {
      return;
    }

    // Check rate limiting
    if (this.isRateLimited(alert.severity)) {
      return;
    }

    // Add alert metadata
    const fullAlert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      service: 'real-estate-backend'
    };

    // Store alert
    alertHistory.set(alertKey, { alert: fullAlert, timestamp: now });
    this.incrementAlertCount(alert.severity);

    // Log alert
    alertLogger.warn('Alert triggered', fullAlert);

    // Send to all channels
    for (const channel of this.alertChannels) {
      try {
        await channel.send(fullAlert);
      } catch (error) {
        alertLogger.error('Failed to send alert to channel', { 
          channel: channel.name, 
          error: error.message 
        });
      }
    }
  }

  // Check if alert is in cooldown period
  isInCooldown(alertKey, severity) {
    const lastAlert = alertHistory.get(alertKey);
    if (!lastAlert) return false;

    const cooldownPeriod = alertConfig.cooldownPeriods[severity];
    return (Date.now() - lastAlert.timestamp) < cooldownPeriod;
  }

  // Check if alert rate is limited
  isRateLimited(severity) {
    const count = alertCounts.get(severity) || 0;
    const maxAlerts = alertConfig.maxAlertsPerHour[severity];
    return count >= maxAlerts;
  }

  // Increment alert count
  incrementAlertCount(severity) {
    const count = alertCounts.get(severity) || 0;
    alertCounts.set(severity, count + 1);

    // Reset count every hour
    setTimeout(() => {
      const currentCount = alertCounts.get(severity) || 0;
      alertCounts.set(severity, Math.max(0, currentCount - 1));
    }, 3600000);
  }

  // Generate unique alert ID
  generateAlertId() {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get alert history
  getAlertHistory(limit = 100) {
    const alerts = Array.from(alertHistory.values())
      .map(item => item.alert)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return alerts;
  }

  // Get alert statistics
  getAlertStats() {
    const stats = {
      total: alertHistory.size,
      bySeverity: {},
      byType: {},
      recent: this.getAlertHistory(10)
    };

    // Count by severity
    for (const [severity, count] of alertCounts.entries()) {
      stats.bySeverity[severity] = count;
    }

    // Count by type
    for (const alert of alertHistory.values()) {
      const type = alert.alert.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return stats;
  }
}

// Alert channel implementations
export class ConsoleAlertChannel {
  constructor() {
    this.name = 'console';
  }

  async send(alert) {
    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`);
    if (alert.data) {
      console.log('Data:', JSON.stringify(alert.data, null, 2));
    }
  }
}

export class WebhookAlertChannel {
  constructor(url, options = {}) {
    this.name = 'webhook';
    this.url = url;
    this.options = {
      timeout: 5000,
      retries: 3,
      ...options
    };
  }

  async send(alert) {
    const payload = {
      text: `🚨 *${alert.severity.toUpperCase()}* - ${alert.title}`,
      attachments: [{
        color: this.getColor(alert.severity),
        fields: [
          { title: 'Message', value: alert.message, short: false },
          { title: 'Type', value: alert.type, short: true },
          { title: 'Environment', value: alert.environment, short: true },
          { title: 'Timestamp', value: alert.timestamp, short: true }
        ]
      }]
    };

    if (alert.data) {
      payload.attachments[0].fields.push({
        title: 'Data',
        value: '```' + JSON.stringify(alert.data, null, 2) + '```',
        short: false
      });
    }

    for (let attempt = 1; attempt <= this.options.retries; attempt++) {
      try {
        const response = await fetch(this.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          timeout: this.options.timeout
        });

        if (response.ok) {
          return;
        }
      } catch (error) {
        if (attempt === this.options.retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  getColor(severity) {
    const colors = {
      critical: 'danger',
      high: 'warning',
      medium: 'good',
      low: '#36a64f'
    };
    return colors[severity] || 'good';
  }
}

export class EmailAlertChannel {
  constructor(smtpConfig) {
    this.name = 'email';
    this.smtpConfig = smtpConfig;
  }

  async send(alert) {
    // Implementation would depend on email service (SendGrid, AWS SES, etc.)
    // This is a placeholder implementation
    console.log(`📧 EMAIL ALERT [${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`);
  }
}

// Create global alerting service instance
const alertingService = new AlertingService();

// Add default console channel
alertingService.addChannel(new ConsoleAlertChannel());

// Add webhook channel if configured
if (process.env.ALERT_WEBHOOK_URL) {
  alertingService.addChannel(new WebhookAlertChannel(process.env.ALERT_WEBHOOK_URL));
}

// Add email channel if configured
if (process.env.SMTP_HOST) {
  alertingService.addChannel(new EmailAlertChannel({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }));
}

export { alertingService };
export default alertingService;
