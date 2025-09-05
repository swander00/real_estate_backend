# 🔄 Database Backfill & Sync Guide

This guide explains how to use the comprehensive database backfill and incremental sync system for your Real Estate Backend.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Database Setup](#database-setup)
- [Backfill Process](#backfill-process)
- [Incremental Sync](#incremental-sync)
- [API Endpoints](#api-endpoints)
- [CLI Commands](#cli-commands)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The sync system provides:

- **Complete Backfill**: Initial data loading from IDX and VOW APIs
- **Incremental Sync**: Regular updates to keep data current
- **Scheduled Sync**: Automated sync jobs with configurable schedules
- **Job Management**: Track, monitor, and cancel sync operations
- **Status Monitoring**: Real-time sync status and statistics

## 🔧 Prerequisites

### Environment Variables

Ensure these are set in your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# IDX API Configuration
IDX_API_URL=your_idx_api_url
IDX_API_KEY=your_idx_api_key

# VOW API Configuration
VOW_API_URL=your_vow_api_url
VOW_API_KEY=your_vow_api_key

# Optional: Sync Scheduler
ENABLE_SYNC_SCHEDULER=true
SYNC_INCREMENTAL_SCHEDULE="*/15 * * * *"  # Every 15 minutes
SYNC_FULL_SCHEDULE="0 2 * * *"           # Daily at 2 AM
```

### Database Tables

Run the sync jobs table creation script:

```bash
# Execute in your Supabase SQL editor or via psql
psql -h your-db-host -U your-user -d your-db -f database-sync-jobs.sql
```

## 🗄️ Database Setup

### 1. Create Sync Jobs Table

The sync system requires a `sync_jobs` table to track all sync operations:

```sql
-- This is automatically created by the sync service
-- But you can also run it manually:
\i database-sync-jobs.sql
```

### 2. Verify Tables

Ensure your main tables exist:
- `properties`
- `property_media`
- `openhouses`
- `offices`
- `users`

## 🚀 Backfill Process

### Initial Data Loading

The backfill process loads all historical data from your IDX and VOW APIs.

#### Using the Backfill Script

```bash
# Full backfill for both providers
npm run backfill

# Backfill for specific provider
npm run backfill -- --providers idx --type full

# Force backfill (overwrites existing data)
npm run backfill -- --force

# Incremental backfill
npm run backfill -- --type incremental
```

#### Using the API

```bash
# Trigger backfill via API
curl -X POST http://localhost:3001/api/sync/backfill \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "providers": ["idx", "vow"],
    "force": false
  }'
```

#### Using the CLI

```bash
# Check sync status
npm run sync status

# Trigger backfill
npm run sync trigger -- --providers idx,vow --type full

# Monitor progress
npm run sync status
```

### Backfill Process Flow

1. **Validation**: Check API credentials and database connectivity
2. **Job Creation**: Create sync job records in the database
3. **Data Fetching**: Fetch data from IDX/VOW APIs in batches
4. **Data Processing**: Transform and validate data
5. **Database Insertion**: Insert/update records in Supabase
6. **Cache Invalidation**: Clear relevant caches
7. **Job Completion**: Update job status and statistics

## ⏰ Incremental Sync

### Automated Scheduling

The sync scheduler runs automatically in production or when `ENABLE_SYNC_SCHEDULER=true`:

- **Incremental Sync**: Every 15 minutes (configurable)
- **Full Sync**: Daily at 2 AM (configurable)
- **Health Checks**: Every 5 minutes

### Manual Incremental Sync

```bash
# Trigger incremental sync via CLI
npm run sync trigger -- --type incremental

# Trigger via API
curl -X POST http://localhost:3001/api/sync/idx \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"incremental": true}'
```

### Sync Types

- **Full Sync**: Complete data refresh (backfill)
- **Incremental Sync**: Only new/updated records since last sync
- **Force Sync**: Override existing data even if unchanged

## 🌐 API Endpoints

### Sync Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sync/idx` | Trigger IDX sync |
| `POST` | `/api/sync/vow` | Trigger VOW sync |
| `POST` | `/api/sync/backfill` | Trigger complete backfill |
| `GET` | `/api/sync/status` | Get sync status |
| `GET` | `/api/sync/job/:jobId` | Get job details |
| `POST` | `/api/sync/job/:jobId/cancel` | Cancel job |
| `GET` | `/api/sync/stats` | Get sync statistics |

### Example API Calls

```bash
# Get sync status
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/sync/status

# Get job details
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/sync/job/abc123-def456-ghi789

# Get sync statistics
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/sync/stats?days=7
```

## 💻 CLI Commands

### Sync Status

```bash
# Show all sync status
npm run sync status

# Filter by provider
npm run sync status -- --provider idx

# Limit results
npm run sync status -- --limit 20
```

### Trigger Sync

```bash
# Trigger incremental sync for both providers
npm run sync trigger

# Trigger full sync for IDX only
npm run sync trigger -- --providers idx --type full

# Force sync
npm run sync trigger -- --force
```

### Job Management

```bash
# Cancel a job
npm run sync cancel abc123-def456-ghi789

# Show statistics
npm run sync stats -- --days 30
```

### Scheduler Management

```bash
# Show scheduler status
npm run sync scheduler

# Start scheduler
npm run sync scheduler start

# Stop scheduler
npm run sync scheduler stop
```

## 📊 Monitoring

### Real-time Monitoring

1. **Dashboard**: Visit `http://localhost:3001/dashboard.html`
2. **Health Check**: `http://localhost:3001/health`
3. **Cache Stats**: `http://localhost:3001/cache/stats`

### Sync Job Monitoring

```bash
# Watch sync status in real-time
watch -n 5 "npm run sync status"

# Monitor specific job
npm run sync status | grep "Job ID: abc123"
```

### Log Monitoring

```bash
# Follow server logs
tail -f logs/app.log

# Filter sync logs
grep "sync" logs/app.log
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Environment Variables Missing

```bash
# Test environment
npm run test:env

# Check specific variables
echo $IDX_API_URL
echo $VOW_API_URL
```

#### 2. Database Connection Issues

```bash
# Test database connection
curl http://localhost:3001/health

# Check database service
npm run sync status
```

#### 3. API Authentication Issues

```bash
# Verify API keys
curl -H "Authorization: Bearer $IDX_API_KEY" $IDX_API_URL/properties

# Check API endpoints
curl -H "Authorization: Bearer $VOW_API_KEY" $VOW_API_URL/properties
```

#### 4. Sync Jobs Stuck

```bash
# Check active jobs
npm run sync status

# Cancel stuck jobs
npm run sync cancel <job-id>

# Force restart sync service
# Restart your server
```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment
export DEBUG=true
export LOG_LEVEL=debug

# Start server with debug
npm run dev:local
```

### Performance Issues

1. **Reduce Batch Size**: Modify `FETCH_BATCH` in sync libraries
2. **Increase Timeouts**: Adjust API timeout settings
3. **Monitor Resources**: Check memory and CPU usage
4. **Database Optimization**: Ensure proper indexes exist

## 📈 Best Practices

### 1. Initial Setup

1. Run backfill during off-peak hours
2. Monitor system resources during initial load
3. Verify data quality after backfill completion
4. Set up monitoring and alerting

### 2. Ongoing Operations

1. Monitor sync job success rates
2. Set up alerts for failed syncs
3. Regularly review sync statistics
4. Clean up old completed jobs periodically

### 3. Data Quality

1. Validate data after each sync
2. Monitor for duplicate records
3. Check for missing required fields
4. Verify image/media URLs are accessible

### 4. Performance

1. Use incremental syncs for regular updates
2. Schedule full syncs during low-traffic periods
3. Monitor API rate limits
4. Optimize database queries and indexes

## 🆘 Support

If you encounter issues:

1. Check the logs: `tail -f logs/app.log`
2. Verify environment variables: `npm run test:env`
3. Test API connectivity: `curl http://localhost:3001/health`
4. Review sync status: `npm run sync status`
5. Check database connectivity and permissions

For additional help, refer to the main project documentation or create an issue in the project repository.
