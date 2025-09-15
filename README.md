# TRREB RESO Web API Sync

A production-ready Node.js backend service for synchronizing real estate data from the Toronto Regional Real Estate Board (TRREB) RESO Web API into a Supabase PostgreSQL database.

## Features

- **Multi-Resource Sync**: Synchronizes IDX (active listings), VOW (sold/expired listings), and Media data
- **Incremental Sync**: Resumes from last successful sync point using ModificationTimestamp tracking
- **100k Record Limit Handling**: Automatically slices time windows to handle TRREB's API pagination limits
- **Batch Processing**: Processes data in configurable batches with upsert operations
- **CLI Controls**: Flexible command-line options for targeted sync operations
- **Robust Error Handling**: Retry logic, graceful degradation, and comprehensive logging
- **Progress Tracking**: Real-time progress reporting with percentages and estimated totals

## Prerequisites

- Node.js 18.0.0 or higher
- Supabase project with service role access
- TRREB RESO API tokens (IDX and VOW)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment template:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   ```env
   IDX_TOKEN=your_idx_token_here
   VOW_TOKEN=your_vow_token_here
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   START_DATE=2024-01-01T00:00:00Z
   BATCH_SIZE=10000
   UPSERT_BATCH_SIZE=500
   ```

5. Set up the database by running the migration in your Supabase dashboard or via the CLI.

## Database Setup

The system creates three main tables:

- **Property**: Stores IDX and VOW property listings (primary key: `ListingKey`)
- **Media**: Stores property photos and media files (composite key: `ResourceRecordKey`, `MediaKey`)
- **SyncLog**: Tracks sync progress and timestamps for resumable operations

All tables use PascalCase field names following RESO Data Dictionary conventions.

## Usage

### Full Sync (All Resources)
```bash
npm run sync
```

### Resource-Specific Sync
```bash
npm run sync:idx    # IDX listings only
npm run sync:vow    # VOW listings only  
npm run sync:media  # Media files only
```

### Incremental Sync
```bash
npm run sync:incremental  # Resume from last sync point
```

### Direct Node.js Commands
```bash
node sync.js                    # Full sync
node sync.js --idx-only         # IDX only
node sync.js --vow-only         # VOW only
node sync.js --media-only       # Media only
node sync.js --incremental      # Incremental sync
node sync.js --fail-fast        # Stop on first error
```

## API Endpoints

The system uses these hard-coded TRREB RESO endpoints:

- **IDX**: Available commercial properties
- **VOW**: Sold/leased/expired/off-market properties  
- **Media**: Property photos and virtual tours

## Sync Logic

1. **Time Window Slicing**: Automatically handles TRREB's 100k record limit by creating optimal time windows (monthly → daily → hourly as needed)

2. **Batch Processing**: Fetches data in configurable batches (default: 10,000 records) with pagination support

3. **Upsert Operations**: Performs database upserts in smaller batches (default: 500 records) for optimal performance

4. **Progress Tracking**: Updates `SyncLog` after each batch for resumable operations

5. **Error Recovery**: Continues processing remaining resources even if one fails (unless `--fail-fast` is used)

## Logging

The system provides structured logging with:
- Timestamp-based log entries
- Progress reporting (batch numbers, record counts, percentages)
- Error tracking and debugging information
- Final sync summaries with processed/skipped/error counts

## Architecture

```
lib/
├── sync/
│   ├── propertySync.js    # IDX/VOW sync logic
│   └── mediaSync.js       # Media sync logic
├── utils/
│   ├── db.js              # Database operations
│   ├── fetchFeed.js       # API client and pagination
│   └── logger.js          # Winston logging configuration
└── mappers/
    ├── mapProperty.js     # Property data transformation
    └── mapMedia.js        # Media data transformation
```

## Error Handling

- **API Errors**: Automatic retry with exponential backoff
- **Database Errors**: Logged with context, sync continues
- **Network Issues**: Retry logic with configurable attempts
- **Data Validation**: Field validation before database upsert
- **Graceful Shutdown**: Handles SIGINT/SIGTERM signals

## Monitoring

The system provides comprehensive monitoring through:
- Real-time progress updates
- Batch-level success/failure tracking  
- Final summary reports
- Structured logging for external monitoring tools

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `IDX_TOKEN` | TRREB IDX API token | Required |
| `VOW_TOKEN` | TRREB VOW API token | Required |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Required |
| `START_DATE` | Initial sync start date | `2024-01-01T00:00:00Z` |
| `BATCH_SIZE` | API fetch batch size | `10000` |
| `UPSERT_BATCH_SIZE` | Database upsert batch size | `500` |
| `DEBUG` | Enable debug logging | `false` |

## License

Private project for TRREB data synchronization.