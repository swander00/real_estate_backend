# 🔧 Operational Runbook

## Overview

This runbook provides operational procedures for maintaining and troubleshooting the Real Estate Backend system in production.

## System Architecture

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
```

## Monitoring and Alerting

### Health Checks

#### Application Health
```bash
# Check application status
curl -f http://localhost:3000/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400,
  "version": "2.0.0"
}
```

#### Database Health
```bash
# Check database connection
curl -H "apikey: $SUPABASE_ANON_KEY" \
     "$SUPABASE_URL/rest/v1/"

# Check specific table
curl -H "apikey: $SUPABASE_ANON_KEY" \
     "$SUPABASE_URL/rest/v1/common_fields?select=count"
```

#### External API Health
```bash
# Check IDX API
curl -H "Authorization: Bearer $IDX_API_KEY" \
     "$IDX_API_URL/health"

# Check VOW API
curl -H "Authorization: Bearer $VOW_API_KEY" \
     "$VOW_API_URL/health"
```

### Key Metrics

#### Application Metrics
- **Response Time**: < 200ms (95th percentile)
- **Error Rate**: < 1%
- **Throughput**: > 1000 requests/minute
- **Memory Usage**: < 512MB
- **CPU Usage**: < 70%

#### Database Metrics
- **Connection Pool**: < 80% utilization
- **Query Performance**: < 100ms average
- **Storage Usage**: < 80% of limit
- **Backup Status**: Daily backups successful

#### Business Metrics
- **Property Sync Success**: > 99%
- **Data Freshness**: < 1 hour
- **API Availability**: > 99.9%

### Alerting Rules

#### Critical Alerts
```yaml
# Application down
- alert: ApplicationDown
  expr: up{job="real-estate-backend"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Application is down"

# High error rate
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "High error rate detected"

# Database connection issues
- alert: DatabaseConnectionIssues
  expr: database_connections_failed_total > 10
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Database connection issues"
```

#### Warning Alerts
```yaml
# High response time
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High response time detected"

# High memory usage
- alert: HighMemoryUsage
  expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.8
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High memory usage"
```

## Daily Operations

### Morning Checklist
- [ ] Check overnight sync status
- [ ] Review error logs
- [ ] Verify database backups
- [ ] Check system resources
- [ ] Review alert notifications

### Evening Checklist
- [ ] Review daily metrics
- [ ] Check scheduled sync jobs
- [ ] Verify security logs
- [ ] Update documentation if needed
- [ ] Plan next day priorities

### Weekly Tasks
- [ ] Review performance metrics
- [ ] Update dependencies
- [ ] Security patch review
- [ ] Capacity planning
- [ ] Disaster recovery test

## Incident Response

### Severity Levels

#### P1 - Critical
- **Definition**: Complete service outage
- **Response Time**: 15 minutes
- **Resolution Time**: 2 hours
- **Examples**: Application down, database unavailable

#### P2 - High
- **Definition**: Significant service degradation
- **Response Time**: 1 hour
- **Resolution Time**: 8 hours
- **Examples**: High error rate, slow response times

#### P3 - Medium
- **Definition**: Minor service issues
- **Response Time**: 4 hours
- **Resolution Time**: 24 hours
- **Examples**: Sync delays, minor bugs

#### P4 - Low
- **Definition**: Cosmetic issues
- **Response Time**: 24 hours
- **Resolution Time**: 1 week
- **Examples**: UI issues, documentation updates

### Incident Response Process

#### 1. Detection and Assessment
```bash
# Check system status
curl -f http://localhost:3000/health

# Check logs
tail -f /var/log/application.log

# Check metrics
pm2 monit
```

#### 2. Immediate Response
```bash
# Restart application if needed
pm2 restart real-estate-backend

# Check database
psql $DATABASE_URL -c "SELECT 1"

# Check external APIs
curl -f $IDX_API_URL/health
```

#### 3. Investigation
```bash
# Check application logs
pm2 logs real-estate-backend --lines 100

# Check system resources
htop
df -h
free -m

# Check network connectivity
ping google.com
nslookup your-domain.com
```

#### 4. Resolution
- Implement fix
- Test solution
- Monitor for stability
- Document incident

#### 5. Post-Incident
- Conduct post-mortem
- Update runbook
- Implement preventive measures
- Communicate lessons learned

## Common Issues and Solutions

### Application Issues

#### High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart application
pm2 restart real-estate-backend

# Check for memory leaks
node --inspect server.js
```

#### High CPU Usage
```bash
# Check CPU usage
top -p $(pgrep -f "node server.js")

# Profile application
node --prof server.js

# Check for infinite loops
grep -r "while\|for" api/ lib/
```

#### Slow Response Times
```bash
# Check database queries
EXPLAIN ANALYZE SELECT * FROM common_fields WHERE City = 'Toronto';

# Check indexes
\d+ common_fields

# Optimize queries
CREATE INDEX CONCURRENTLY idx_property_city ON common_fields(City);
```

### Database Issues

#### Connection Pool Exhaustion
```bash
# Check connections
SELECT count(*) FROM pg_stat_activity;

# Check connection limits
SHOW max_connections;

# Restart application
pm2 restart real-estate-backend
```

#### Slow Queries
```bash
# Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

# Add indexes
CREATE INDEX CONCURRENTLY idx_property_price ON common_fields(ListPrice);
```

#### Data Sync Issues
```bash
# Check sync status
SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10;

# Manual sync
node lib/syncListingsIdx.js --force

# Check external API status
curl -H "Authorization: Bearer $IDX_API_KEY" $IDX_API_URL/status
```

### External API Issues

#### IDX API Down
```bash
# Check API status
curl -f $IDX_API_URL/health

# Check API key
curl -H "Authorization: Bearer $IDX_API_KEY" $IDX_API_URL/test

# Contact API provider
# Check status page
# Implement fallback logic
```

#### VOW API Issues
```bash
# Check API status
curl -f $VOW_API_URL/health

# Check rate limits
curl -H "Authorization: Bearer $VOW_API_KEY" \
     -I $VOW_API_URL/properties

# Implement retry logic
# Check API documentation
```

## Maintenance Procedures

### Application Updates

#### Rolling Deployment
```bash
# Deploy new version
git pull origin main
npm ci
npm run test
pm2 reload real-estate-backend

# Verify deployment
curl -f http://localhost:3000/health
```

#### Database Migrations
```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
psql $DATABASE_URL -f migrations/001_add_new_table.sql

# Verify migration
psql $DATABASE_URL -c "\dt"
```

#### Configuration Updates
```bash
# Update environment variables
export NEW_CONFIG_VALUE="new_value"

# Restart application
pm2 restart real-estate-backend

# Verify configuration
curl -f http://localhost:3000/config
```

### Backup Procedures

#### Database Backup
```bash
# Daily backup
pg_dump $DATABASE_URL | gzip > backups/db_$(date +%Y%m%d).sql.gz

# Weekly full backup
pg_dump -Fc $DATABASE_URL > backups/full_$(date +%Y%m%d).dump

# Verify backup
pg_restore --list backups/full_$(date +%Y%m%d).dump
```

#### Application Backup
```bash
# Backup application code
tar -czf backups/app_$(date +%Y%m%d).tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    .

# Backup configuration
cp .env backups/env_$(date +%Y%m%d).backup
```

### Security Procedures

#### SSL Certificate Renewal
```bash
# Check certificate expiry
openssl x509 -in /etc/ssl/certs/your-domain.com.pem -text -noout | grep "Not After"

# Renew certificate
certbot renew --nginx

# Restart nginx
systemctl restart nginx
```

#### Security Updates
```bash
# Update system packages
apt update && apt upgrade -y

# Update Node.js dependencies
npm audit
npm update

# Check for vulnerabilities
npm audit fix
```

## Performance Tuning

### Application Optimization

#### Memory Optimization
```javascript
// Increase heap size
node --max-old-space-size=4096 server.js

// Enable garbage collection logging
node --trace-gc server.js
```

#### Connection Pooling
```javascript
// Configure database connection pool
const pool = new Pool({
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Database Optimization

#### Query Optimization
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_property_city_status 
ON common_fields(City, StandardStatus);

-- Analyze tables
ANALYZE common_fields;
ANALYZE property_media;
ANALYZE property_openhouse;
```

#### Connection Optimization
```sql
-- Check connection settings
SHOW max_connections;
SHOW shared_buffers;
SHOW effective_cache_size;

-- Optimize settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

## Disaster Recovery

### Recovery Procedures

#### Complete System Recovery
```bash
# 1. Restore from backup
pg_restore -d $DATABASE_URL backups/full_20240115.dump

# 2. Deploy application
git clone https://github.com/your-repo/real-estate-backend.git
cd real-estate-backend
npm ci
pm2 start ecosystem.config.js

# 3. Verify system
curl -f http://localhost:3000/health
```

#### Partial Recovery
```bash
# Restore specific tables
pg_restore -t common_fields -d $DATABASE_URL backups/full_20240115.dump

# Restore specific data
psql $DATABASE_URL -c "COPY common_fields FROM 'backups/properties.csv' CSV HEADER;"
```

### Recovery Testing

#### Monthly DR Test
```bash
# 1. Create test environment
docker-compose -f docker-compose.test.yml up -d

# 2. Restore backup
pg_restore -d $TEST_DATABASE_URL backups/full_20240115.dump

# 3. Test application
curl -f http://test.localhost:3000/health

# 4. Run test suite
npm run test:ci

# 5. Cleanup
docker-compose -f docker-compose.test.yml down
```

## Communication Procedures

### Status Page Updates
```bash
# Update status page
curl -X POST https://status.your-domain.com/api/incidents \
  -H "Authorization: Bearer $STATUS_PAGE_TOKEN" \
  -d '{"name": "Database Maintenance", "status": "investigating"}'
```

### Stakeholder Communication
```bash
# Send notification
curl -X POST https://api.slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $SLACK_TOKEN" \
  -d '{"channel": "#alerts", "text": "System maintenance scheduled for 2 AM EST"}'
```

## Escalation Procedures

### On-Call Rotation
- **Primary**: Available 24/7 for P1/P2 incidents
- **Secondary**: Available during business hours for P3/P4 incidents
- **Manager**: Escalation for P1 incidents after 1 hour

### Escalation Contacts
- **Development Team**: dev-team@your-domain.com
- **Database Team**: db-team@your-domain.com
- **Infrastructure Team**: infra-team@your-domain.com
- **Management**: management@your-domain.com

### External Escalation
- **Supabase Support**: support@supabase.com
- **Vercel Support**: support@vercel.com
- **IDX API Support**: support@idx-api.com
- **VOW API Support**: support@vow-api.com

## Documentation Updates

### Runbook Maintenance
- Update procedures after each incident
- Review and test procedures quarterly
- Update contact information monthly
- Validate recovery procedures annually

### Knowledge Base
- Document new issues and solutions
- Update troubleshooting guides
- Share lessons learned
- Maintain FAQ section

## Support Contacts

- **On-Call**: oncall@your-domain.com
- **Operations**: ops@your-domain.com
- **Development**: dev@your-domain.com
- **Emergency**: +1-555-0123
