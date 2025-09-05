# 🔧 Property Rooms Constraint Violation Fix

## Issue Identified

```
❌ property_rooms upsert failed after 3 retries: duplicate key value violates unique constraint "uk_property_rooms_listing_order"
```

## Root Cause Analysis

### **1. Mismatch Between Conflict Resolution and Database Constraint**

**Table Configuration (Before Fix):**
```javascript
{
  name: 'property_rooms',
  conflictKeys: 'RoomKey',  // ❌ Wrong conflict resolution
  // ...
}
```

**Database Constraint:**
```sql
UNIQUE ("ListingKey", "Order")  -- ✅ Actual unique constraint
```

**The Problem:**
- Supabase upsert was using `RoomKey` for conflict resolution
- But the database constraint is on `("ListingKey", "Order")`
- When multiple rooms have the same `ListingKey` and `Order` but different `RoomKey`, it violates the unique constraint

### **2. Null Order Values**

**Potential Issue:**
- `Order` field could be `null` from the API
- `null` values in unique constraints can cause unexpected behavior
- Multiple `null` values might be treated as duplicates

## ✅ Fixes Applied

### **1. Updated Conflict Resolution Strategy**

**Before:**
```javascript
conflictKeys: 'RoomKey'
```

**After:**
```javascript
conflictKeys: 'ListingKey,Order'
```

**Result:** Now matches the actual database constraint `UNIQUE ("ListingKey", "Order")`

### **2. Fixed Null Order Values**

**Before:**
```javascript
Order: item.Order,  // Could be null
```

**After:**
```javascript
Order: item.Order || 0,  // Default to 0 if no order specified
```

**Result:** Ensures `Order` always has a value, preventing constraint violations

### **3. Files Updated**

1. **`lib/syncVow.js`** - Updated conflict resolution
2. **`lib/syncIdx.js`** - Updated conflict resolution  
3. **`mappers/mapPropertyRooms.js`** - Fixed null Order values

## Expected Results After Fix

### **Before Fix:**
```
📊 property_rooms: fetched 826 records (skip=0)
⚠️ property_rooms retry 1/3 in 500ms
⚠️ property_rooms retry 2/3 in 1000ms
⚠️ property_rooms retry 3/3 in 2000ms
❌ property_rooms upsert failed after 3 retries: duplicate key value violates unique constraint
```

### **After Fix (Expected):**
```
📊 property_rooms: fetched 826 records (skip=0)
✅ PROPERTY_ROOMS | Fetched: 826 | Processed: 826 | Dropped: 0 | Success: 100%
```

## How the Fix Works

1. **Proper Conflict Resolution:** Supabase now uses `("ListingKey", "Order")` for upsert conflicts, matching the database constraint
2. **No Null Values:** All rooms now have a valid `Order` value (defaults to 0)
3. **Consistent Behavior:** Upsert operations will now properly handle duplicates by updating existing records instead of trying to insert duplicates

## Database Constraint Logic

The unique constraint `UNIQUE ("ListingKey", "Order")` ensures:
- Each property (`ListingKey`) can have only one room with a specific order number
- If a room with the same `ListingKey` and `Order` already exists, the upsert will update it
- If it's a new combination, it will be inserted

This is the correct behavior for room ordering within properties.

## Testing the Fix

After applying these changes:
1. Run a sync operation
2. Verify that `property_rooms` no longer shows constraint violations
3. Check that rooms are properly ordered within each property
4. Confirm that duplicate rooms (same ListingKey + Order) are updated rather than causing errors

The sync should now complete successfully without the constraint violation errors!
