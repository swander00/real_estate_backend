# Setting Up Residential Lease Sync

## Issue Identified
The `residential_lease` table is not syncing because the required environment variables are missing:
- `VOW_LEASE_URL` 
- `IDX_LEASE_URL`

## What Was Fixed
1. ✅ **Updated environment templates** to include all missing URL variables
2. ✅ **Updated validation scripts** to recognize the new variables
3. ✅ **Created residential_lease table schema** (`recreate-residential-lease-table.sql`)

## What You Need To Do

### 1. Add Environment Variables
Add these to your `.env` file:

```bash
# IDX Lease URL (replace with your actual IDX lease endpoint)
IDX_LEASE_URL=https://your-idx-api.com/lease-endpoint

# VOW Lease URL (replace with your actual VOW lease endpoint)  
VOW_LEASE_URL=https://your-vow-api.com/lease-endpoint
```

### 2. Create the Database Table
Run the SQL script in your Supabase SQL editor:
```bash
# Execute this file in Supabase SQL editor
recreate-residential-lease-table.sql
```

### 3. Verify Your API Endpoints
Make sure your IDX and VOW APIs actually provide lease data at these endpoints:
- Check if `IDX_LEASE_URL` returns lease property data
- Check if `VOW_LEASE_URL` returns lease property data

### 4. Test the Sync
After setting up the URLs and creating the table:
1. Run a sync operation
2. Check the logs for: `📊 residential_lease: fetched X records`
3. Verify data appears in the `residential_lease` table

## Expected Behavior After Fix
- Sync process will no longer show: `❌ residential_lease: No URL configured`
- Dashboard will show progress for `residential_lease` table
- Data will be populated in the `residential_lease` table according to your mapper

## Troubleshooting
If lease data still doesn't sync:
1. Verify the API endpoints return data in the expected format
2. Check that the lease properties have valid `ListingKey` values
3. Ensure the lease properties exist in `common_fields` first (since `enforceParent: true`)
