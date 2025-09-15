# Environment Configuration

This document describes the environment variables needed for the TRREB RESO Web API sync service.

## Required Environment Variables

### API Base URLs
- `IDX_BASE_URL` - Base URL for IDX property feed (default: https://query.ampre.ca/odata/Property)
- `VOW_BASE_URL` - Base URL for VOW property feed (default: https://query.ampre.ca/odata/Property)
- `MEDIA_BASE_URL` - Base URL for media feed (default: https://query.ampre.ca/odata/Media)

### API Authentication Tokens
- `IDX_TOKEN` - Authentication token for IDX feed (required)
- `VOW_TOKEN` - Authentication token for VOW feed (required)

### Legacy Support
- `MEDIA_URL` - Legacy environment variable for media URL (kept for backward compatibility)

### Supabase Configuration
- `SUPABASE_URL` - Your Supabase project URL (required)
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key (required)

### Sync Configuration
- `BATCH_SIZE` - Number of records to process per batch (default: 5000)
- `NODE_ENV` - Environment mode (development/production)

### Database Configuration (Optional)
- `DATABASE_URL` - Direct database connection URL (if not using Supabase)

## Setup Instructions

1. Copy the example environment file:
   ```bash
   cp env.example .env
   ```

2. Edit the `.env` file with your actual values:
   ```bash
   # API Base URLs
   IDX_BASE_URL=https://query.ampre.ca/odata/Property
   VOW_BASE_URL=https://query.ampre.ca/odata/Property
   MEDIA_BASE_URL=https://query.ampre.ca/odata/Media

   # API Authentication Tokens
   IDX_TOKEN=your_actual_idx_token
   VOW_TOKEN=your_actual_vow_token

   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key

   # Sync Configuration
   BATCH_SIZE=5000
   NODE_ENV=development
   ```

3. Verify your environment configuration:
   ```bash
   npm run check-env
   ```

## Migration from Hardcoded URLs

The following hardcoded URLs have been replaced with environment variables:

### Before (Hardcoded)
- Property URLs: `https://query.ampre.ca/odata/Property`
- Media URLs: `https://query.ampre.ca/odata/Media`

### After (Environment Variables)
- `IDX_BASE_URL` and `VOW_BASE_URL` for property feeds
- `MEDIA_BASE_URL` for media feed

## Backward Compatibility

The system maintains backward compatibility:
- If `MEDIA_BASE_URL` is not set, it falls back to `MEDIA_URL`
- If neither is set, it uses the default hardcoded URL
- All existing functionality remains unchanged

## Security Notes

- Never commit your `.env` file to version control
- Keep your API tokens secure and rotate them regularly
- Use different tokens for different environments (dev/staging/production)
