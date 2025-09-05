/**
 * Monitoring Configuration
 * Centralized configuration for monitoring, alerting, and metrics
 */

export const monitoringConfig = {
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    file: {
      enabled: process.env.LOG_FILE_ENABLED !== 'false',
      path: process.env.LOG_FILE_PATH || 'logs/',
      maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
      maxFiles: process.env.LOG_FILE_MAX_FILES || '5'
    },
    console: {
      enabled: process.env.LOG_CONSOLE_ENABLED !== 'false',
      colorize: process.env.LOG_CONSOLE_COLORIZE !== 'false'
    }
  },

  // Metrics configuration
  metrics: {
    collectionInterval: parseInt(process.env.METRICS_COLLECTION_INTERVAL) || 30000, // 30 seconds
    retentionPeriod: parseInt(process.env.METRICS_RETENTION_PERIOD) || 86400000, // 24 hours
    maxResponseTimeSamples: parseInt(process.env.METRICS_MAX_RESPONSE_TIME_SAMPLES) || 100,
    maxExternalApiSamples: parseInt(process.env.METRICS_MAX_EXTERNAL_API_SAMPLES) || 50
  },

  // Health check configuration
  healthChecks: {
    basic: {
      enabled: true,
      interval: 30000 // 30 seconds
    },
    database: {
      enabled: true,
      interval: 60000, // 1 minute
      timeout: 5000, // 5 seconds
      query: 'SELECT 1'
    },
    external: {
      enabled: true,
      interval: 120000, // 2 minutes
      timeout: 10000, // 10 seconds
      apis: {
        idx: {
          url: process.env.IDX_API_URL,
          key: process.env.IDX_API_KEY,
          enabled: !!process.env.IDX_API_URL
        },
        vow: {
          url: process.env.VOW_API_URL,
          key: process.env.VOW_API_KEY,
          enabled: !!process.env.VOW_API_URL
        }
      }
    }
  },

  // Alerting configuration
  alerting: {
    enabled: process.env.ALERTING_ENABLED !== 'false',
    channels: {
      console: {
        enabled: process.env.ALERT_CONSOLE_ENABLED !== 'false'
      },
      webhook: {
        enabled: !!process.env.ALERT_WEBHOOK_URL,
        url: process.env.ALERT_WEBHOOK_URL,
        timeout: parseInt(process.env.ALERT_WEBHOOK_TIMEOUT) || 5000,
        retries: parseInt(process.env.ALERT_WEBHOOK_RETRIES) || 3
      },
      email: {
        enabled: !!process.env.SMTP_HOST,
        smtp: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
          secure: process.env.SMTP_SECURE === 'true'
        },
        from: process.env.ALERT_EMAIL_FROM || 'alerts@your-domain.com',
        to: process.env.ALERT_EMAIL_TO ? process.env.ALERT_EMAIL_TO.split(',') : []
      }
    },
    thresholds: {
      errorRate: {
        critical: parseFloat(process.env.ALERT_ERROR_RATE_CRITICAL) || 5.0,
        high: parseFloat(process.env.ALERT_ERROR_RATE_HIGH) || 2.0,
        medium: parseFloat(process.env.ALERT_ERROR_RATE_MEDIUM) || 1.0
      },
      responseTime: {
        critical: parseInt(process.env.ALERT_RESPONSE_TIME_CRITICAL) || 2000,
        high: parseInt(process.env.ALERT_RESPONSE_TIME_HIGH) || 1000,
        medium: parseInt(process.env.ALERT_RESPONSE_TIME_MEDIUM) || 500
      },
      memoryUsage: {
        critical: parseInt(process.env.ALERT_MEMORY_CRITICAL) || 90,
        high: parseInt(process.env.ALERT_MEMORY_HIGH) || 80,
        medium: parseInt(process.env.ALERT_MEMORY_MEDIUM) || 70
      },
      databaseErrors: {
        critical: parseInt(process.env.ALERT_DB_ERRORS_CRITICAL) || 10,
        high: parseInt(process.env.ALERT_DB_ERRORS_HIGH) || 5,
        medium: parseInt(process.env.ALERT_DB_ERRORS_MEDIUM) || 2
      },
      externalApiErrors: {
        critical: parseInt(process.env.ALERT_EXTERNAL_API_ERRORS_CRITICAL) || 20,
        high: parseInt(process.env.ALERT_EXTERNAL_API_ERRORS_HIGH) || 10,
        medium: parseInt(process.env.ALERT_EXTERNAL_API_ERRORS_MEDIUM) || 5
      }
    },
    cooldownPeriods: {
      critical: parseInt(process.env.ALERT_COOLDOWN_CRITICAL) || 300000, // 5 minutes
      high: parseInt(process.env.ALERT_COOLDOWN_HIGH) || 600000, // 10 minutes
      medium: parseInt(process.env.ALERT_COOLDOWN_MEDIUM) || 1800000, // 30 minutes
      low: parseInt(process.env.ALERT_COOLDOWN_LOW) || 3600000 // 1 hour
    },
    rateLimits: {
      critical: parseInt(process.env.ALERT_RATE_LIMIT_CRITICAL) || 10,
      high: parseInt(process.env.ALERT_RATE_LIMIT_HIGH) || 20,
      medium: parseInt(process.env.ALERT_RATE_LIMIT_MEDIUM) || 50,
      low: parseInt(process.env.ALERT_RATE_LIMIT_LOW) || 100
    }
  },

  // Performance monitoring
  performance: {
    slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD) || 5000, // 5 seconds
    highMemoryThreshold: parseInt(process.env.HIGH_MEMORY_THRESHOLD) || 10 * 1024 * 1024, // 10MB
    slowDatabaseThreshold: parseInt(process.env.SLOW_DATABASE_THRESHOLD) || 1000 // 1 second
  },

  // Security monitoring
  security: {
    enabled: process.env.SECURITY_MONITORING_ENABLED !== 'false',
    suspiciousPatterns: [
      /\.\./,  // Directory traversal
      /<script/i,  // XSS attempts
      /union.*select/i,  // SQL injection
      /eval\(/i,  // Code injection
      /javascript:/i,  // JavaScript injection
      /onload=/i,  // Event handler injection
      /onerror=/i,  // Event handler injection
      /document\.cookie/i,  // Cookie access
      /window\.location/i,  // Location manipulation
      /alert\(/i,  // Alert injection
      /confirm\(/i,  // Confirm injection
      /prompt\(/i  // Prompt injection
    ],
    rateLimitThreshold: parseInt(process.env.SECURITY_RATE_LIMIT_THRESHOLD) || 100, // requests per minute
    ipWhitelist: process.env.SECURITY_IP_WHITELIST ? process.env.SECURITY_IP_WHITELIST.split(',') : [],
    ipBlacklist: process.env.SECURITY_IP_BLACKLIST ? process.env.SECURITY_IP_BLACKLIST.split(',') : []
  },

  // Dashboard configuration
  dashboard: {
    enabled: process.env.DASHBOARD_ENABLED !== 'false',
    refreshInterval: parseInt(process.env.DASHBOARD_REFRESH_INTERVAL) || 30000, // 30 seconds
    maxAlertsDisplay: parseInt(process.env.DASHBOARD_MAX_ALERTS) || 50,
    maxMetricsHistory: parseInt(process.env.DASHBOARD_MAX_METRICS_HISTORY) || 100
  },

  // External monitoring services
  external: {
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED === 'true',
      port: parseInt(process.env.PROMETHEUS_PORT) || 9090,
      path: process.env.PROMETHEUS_PATH || '/metrics'
    },
    grafana: {
      enabled: process.env.GRAFANA_ENABLED === 'true',
      url: process.env.GRAFANA_URL,
      apiKey: process.env.GRAFANA_API_KEY
    },
    datadog: {
      enabled: process.env.DATADOG_ENABLED === 'true',
      apiKey: process.env.DATADOG_API_KEY,
      appKey: process.env.DATADOG_APP_KEY
    },
    newrelic: {
      enabled: process.env.NEWRELIC_ENABLED === 'true',
      licenseKey: process.env.NEWRELIC_LICENSE_KEY,
      appName: process.env.NEWRELIC_APP_NAME || 'real-estate-backend'
    }
  },

  // Notification templates
  notifications: {
    email: {
      subject: process.env.ALERT_EMAIL_SUBJECT || '🚨 Real Estate Backend Alert',
      template: process.env.ALERT_EMAIL_TEMPLATE || 'default'
    },
    webhook: {
      template: process.env.ALERT_WEBHOOK_TEMPLATE || 'slack'
    }
  },

  // Maintenance mode
  maintenance: {
    enabled: process.env.MAINTENANCE_MODE === 'true',
    message: process.env.MAINTENANCE_MESSAGE || 'System is under maintenance. Please try again later.',
    allowedPaths: process.env.MAINTENANCE_ALLOWED_PATHS ? 
      process.env.MAINTENANCE_ALLOWED_PATHS.split(',') : 
      ['/health', '/metrics']
  }
};

// Validation function
export function validateMonitoringConfig() {
  const errors = [];

  // Validate required environment variables
  if (monitoringConfig.alerting.channels.webhook.enabled && !monitoringConfig.alerting.channels.webhook.url) {
    errors.push('ALERT_WEBHOOK_URL is required when webhook alerts are enabled');
  }

  if (monitoringConfig.alerting.channels.email.enabled) {
    if (!monitoringConfig.alerting.channels.email.smtp.host) {
      errors.push('SMTP_HOST is required when email alerts are enabled');
    }
    if (!monitoringConfig.alerting.channels.email.from) {
      errors.push('ALERT_EMAIL_FROM is required when email alerts are enabled');
    }
    if (monitoringConfig.alerting.channels.email.to.length === 0) {
      errors.push('ALERT_EMAIL_TO is required when email alerts are enabled');
    }
  }

  // Validate thresholds
  const thresholds = monitoringConfig.alerting.thresholds;
  for (const [metric, values] of Object.entries(thresholds)) {
    if (values.critical <= values.high || values.high <= values.medium) {
      errors.push(`Invalid thresholds for ${metric}: critical > high > medium`);
    }
  }

  // Validate cooldown periods
  const cooldowns = monitoringConfig.alerting.cooldownPeriods;
  if (cooldowns.critical >= cooldowns.high || cooldowns.high >= cooldowns.medium || cooldowns.medium >= cooldowns.low) {
    errors.push('Invalid cooldown periods: critical < high < medium < low');
  }

  if (errors.length > 0) {
    throw new Error(`Monitoring configuration validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

// Export default configuration
export default monitoringConfig;
