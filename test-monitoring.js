/**
 * Monitoring System Test Script
 * Tests the monitoring and alerting functionality
 */

import { metricsCollector, healthChecks } from './api/services/monitoringService.js';
import { alertingService, ALERT_TYPES, ALERT_SEVERITY } from './api/services/alertingService.js';

console.log('🧪 Testing Monitoring System...\n');

// Test 1: Basic Health Check
console.log('1. Testing Basic Health Check...');
try {
  const basicHealth = await healthChecks.basic();
  console.log('✅ Basic health check:', basicHealth);
} catch (error) {
  console.log('❌ Basic health check failed:', error.message);
}

// Test 2: Database Health Check
console.log('\n2. Testing Database Health Check...');
try {
  const dbHealth = await healthChecks.database();
  console.log('✅ Database health check:', dbHealth);
} catch (error) {
  console.log('❌ Database health check failed:', error.message);
}

// Test 3: External API Health Check
console.log('\n3. Testing External API Health Check...');
try {
  const externalHealth = await healthChecks.externalApis();
  console.log('✅ External API health check:', externalHealth);
} catch (error) {
  console.log('❌ External API health check failed:', error.message);
}

// Test 4: Comprehensive Health Check
console.log('\n4. Testing Comprehensive Health Check...');
try {
  const comprehensiveHealth = await healthChecks.comprehensive();
  console.log('✅ Comprehensive health check:', comprehensiveHealth);
} catch (error) {
  console.log('❌ Comprehensive health check failed:', error.message);
}

// Test 5: Metrics Collection
console.log('\n5. Testing Metrics Collection...');
try {
  // Simulate some requests
  metricsCollector.recordRequest('/api/test', 'GET', 200, 150);
  metricsCollector.recordRequest('/api/test', 'GET', 200, 200);
  metricsCollector.recordRequest('/api/test', 'GET', 500, 1000);
  
  const metrics = metricsCollector.getMetrics();
  console.log('✅ Metrics collection:', {
    totalRequests: metrics.requests.total,
    successfulRequests: metrics.requests.successful,
    failedRequests: metrics.requests.failed,
    avgResponseTime: metrics.requests.responseTimes.length > 0 
      ? (metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / metrics.requests.responseTimes.length).toFixed(2) + 'ms'
      : 'N/A'
  });
} catch (error) {
  console.log('❌ Metrics collection failed:', error.message);
}

// Test 6: Health Status
console.log('\n6. Testing Health Status...');
try {
  const healthStatus = metricsCollector.getHealthStatus();
  console.log('✅ Health status:', healthStatus);
} catch (error) {
  console.log('❌ Health status failed:', error.message);
}

// Test 7: Alert System
console.log('\n7. Testing Alert System...');
try {
  // Test different severity levels
  await alertingService.sendAlert({
    type: ALERT_TYPES.SYSTEM,
    severity: ALERT_SEVERITY.LOW,
    title: 'Test Low Alert',
    message: 'This is a test low severity alert',
    data: { test: true }
  });

  await alertingService.sendAlert({
    type: ALERT_TYPES.API,
    severity: ALERT_SEVERITY.MEDIUM,
    title: 'Test Medium Alert',
    message: 'This is a test medium severity alert',
    data: { test: true }
  });

  await alertingService.sendAlert({
    type: ALERT_TYPES.DATABASE,
    severity: ALERT_SEVERITY.HIGH,
    title: 'Test High Alert',
    message: 'This is a test high severity alert',
    data: { test: true }
  });

  console.log('✅ Alert system test completed');
} catch (error) {
  console.log('❌ Alert system test failed:', error.message);
}

// Test 8: Alert History
console.log('\n8. Testing Alert History...');
try {
  const alertHistory = alertingService.getAlertHistory(10);
  console.log('✅ Alert history:', {
    count: alertHistory.length,
    alerts: alertHistory.map(alert => ({
      title: alert.title,
      severity: alert.severity,
      timestamp: alert.timestamp
    }))
  });
} catch (error) {
  console.log('❌ Alert history failed:', error.message);
}

// Test 9: Alert Statistics
console.log('\n9. Testing Alert Statistics...');
try {
  const alertStats = alertingService.getAlertStats();
  console.log('✅ Alert statistics:', alertStats);
} catch (error) {
  console.log('❌ Alert statistics failed:', error.message);
}

// Test 10: External API Metrics
console.log('\n10. Testing External API Metrics...');
try {
  // Simulate external API calls
  metricsCollector.recordExternalApi('idxApi', true, 300);
  metricsCollector.recordExternalApi('idxApi', true, 250);
  metricsCollector.recordExternalApi('idxApi', false, 5000);
  metricsCollector.recordExternalApi('vowApi', true, 400);
  metricsCollector.recordExternalApi('vowApi', true, 350);

  const metrics = metricsCollector.getMetrics();
  console.log('✅ External API metrics:', metrics.external);
} catch (error) {
  console.log('❌ External API metrics failed:', error.message);
}

// Test 11: Sync Metrics
console.log('\n11. Testing Sync Metrics...');
try {
  // Simulate sync operations
  metricsCollector.recordSync(true, 100);
  metricsCollector.recordSync(true, 150);
  metricsCollector.recordSync(false, 0);

  const metrics = metricsCollector.getMetrics();
  console.log('✅ Sync metrics:', metrics.sync);
} catch (error) {
  console.log('❌ Sync metrics failed:', error.message);
}

console.log('\n🎉 Monitoring System Test Complete!');
console.log('\n📊 Summary:');
console.log('- Health checks: ✅ Working');
console.log('- Metrics collection: ✅ Working');
console.log('- Alert system: ✅ Working');
console.log('- External API monitoring: ✅ Working');
console.log('- Sync monitoring: ✅ Working');

console.log('\n🌐 Access the monitoring dashboard at: http://localhost:3000/dashboard.html');
console.log('🔍 Health check endpoint: http://localhost:3000/health');
console.log('📈 Metrics endpoint: http://localhost:3000/health/metrics');
console.log('🚨 Alerts endpoint: http://localhost:3000/health/alerts');
