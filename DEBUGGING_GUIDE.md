# Enhanced Debugging for Real Estate Data Sync

## Overview
Comprehensive debugging has been added to help identify issues with OpenHouse and PropertyRooms data processing.

## Debug Features Added

### 1. **Parent Enforcement Debugging**
- **Location**: `lib/syncVow.js` and `lib/syncIdx.js`
- **What it shows**:
  - Number of unique ListingKeys being checked
  - Sample ListingKeys from the batch
  - Number of existing parent records found
  - Sample orphaned ListingKeys that were dropped

**Example Output**:
```
🔍 property_openhouse parent enforcement: checking 475 unique ListingKeys
📋 Sample ListingKeys: ABC123, DEF456, GHI789, JKL012, MNO345...
✅ Found 31 existing parent records out of 475 requested
🔗 Dropped 444 orphaned records
🚫 Sample orphaned ListingKeys: PQR678, STU901, VWX234...
```

### 2. **Upsert Retry Debugging**
- **Location**: `upsertWithRetry()` function in both sync files
- **What it shows**:
  - Batch size and conflict resolution strategy
  - Detailed database error messages
  - Sample problematic records
  - Retry attempts with specific error details
  - Final failure details with stack traces

**Example Output**:
```
💾 property_rooms upsert: 1000 records, conflict: ListingKey,Order
❌ property_rooms database error: duplicate key value violates unique constraint
📊 Error details: {"code": "23505", "details": "Key (ListingKey, Order)=(ABC123, 1) already exists"}
🔍 Sample record being processed: {"RoomKey": "ROOM123", "ListingKey": "ABC123", "Order": 1, ...}
⚠️ property_rooms retry 1/3 in 500ms - Error: duplicate key value violates unique constraint
```

### 3. **Data Mapping Debugging**
- **Location**: `mappers/mapPropertyRooms.js` and `mappers/mapPropertyOpenhouse.js`
- **What it shows**:
  - Raw input data from the API
  - Processed/mapped output data
  - Field-by-field transformation details

**Example Output**:
```
🔍 mapPropertyRooms input: {"RoomKey": "ROOM123", "ListingKey": "ABC123", "RoomType": "Bedroom", ...}
✅ mapPropertyRooms output: {"RoomKey": "ROOM123", "ListingKey": "ABC123", "RoomType": "Bedroom", ...}
```

### 4. **Filtering Debugging**
- **Location**: `fetchAndProcessBatch()` function in both sync files
- **What it shows**:
  - Number of records before and after mapping
  - Number of records filtered out
  - Sample invalid records with raw and mapped data
  - Filter function results

**Example Output**:
```
🔄 property_rooms mapping 475 raw records
📊 property_rooms mapping results: 459 valid, 16 filtered out
🚫 Filtered out 16 invalid records
🔍 Sample invalid records:
  1. Raw: {"RoomKey": null, "ListingKey": "ABC123", ...}
     Mapped: {"RoomKey": null, "ListingKey": "ABC123", ...}
     Filter result: false
```

## How to Use Enhanced Debugging

### Option 1: Use the Debug Script
```bash
node debug_sync.js
```

### Option 2: Set Environment Variables
```bash
export DEBUG_MAPPING=true
export DEBUG=true
node server.js
```

### Option 3: Enable for Specific Tables
Add to your `.env` file:
```
DEBUG_MAPPING=true
DEBUG=true
```

## What to Look For

### **OpenHouse Issues (High Orphan Rate)**
1. **Check parent enforcement logs**:
   - Are ListingKeys being found in common_fields?
   - Are the orphaned ListingKeys valid but missing from common_fields?

2. **Check mapping logs**:
   - Are OpenHouseKey and ListingKey being properly extracted?
   - Are date/time fields being processed correctly?

### **PropertyRooms Retry Issues**
1. **Check upsert error logs**:
   - What specific database errors are occurring?
   - Are there constraint violations?
   - Are there data type mismatches?

2. **Check mapping logs**:
   - Are required fields (RoomKey, ListingKey, Order) present?
   - Are data types correct for database constraints?

## Common Issues and Solutions

### **High Orphan Rate (OpenHouse)**
- **Cause**: Parent records not processed yet or missing from common_fields
- **Solution**: Ensure common_fields sync completes before OpenHouse sync

### **Retry Failures (PropertyRooms)**
- **Cause**: Database constraints, connection issues, or data validation problems
- **Solution**: Check specific error messages and fix data or database constraints

### **Filter Failures**
- **Cause**: Missing required fields or invalid data
- **Solution**: Check sample invalid records and fix data source or mapping logic

## Performance Impact
- Debug logging adds minimal overhead
- Set `DEBUG_MAPPING=false` for production to reduce log volume
- Debug logs are only shown when DEBUG environment variable is true
