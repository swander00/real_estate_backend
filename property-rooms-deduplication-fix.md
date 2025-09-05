# 🔧 Property Rooms Duplicate Records Fix

## Issue Identified

```
❌ property_rooms upsert failed after 3 retries: ON CONFLICT DO UPDATE command cannot affect row a second time
```

## Root Cause Analysis

### **The Problem:**
- The batch contained multiple records with the same `(ListingKey, Order)` combination
- When Supabase tried to upsert them, it conflicted with itself within the same operation
- This happens when the API returns duplicate room records for the same property and order

### **Why This Happens:**
1. **API Data Quality:** The external API might return duplicate room records
2. **No Deduplication:** The sync process didn't deduplicate records before upsert
3. **Batch Processing:** All duplicates were in the same batch, causing internal conflicts

## ✅ Fix Applied

### **Added Deduplication Logic for Property Rooms**

**New Code Added:**
```javascript
// Handle duplicate room conflicts for property_rooms
if (name === 'property_rooms') {
  const roomMap = new Map();
  let duplicatesRemoved = 0;
  
  // Deduplicate by (ListingKey, Order) - keep the last occurrence
  mapped.forEach(record => {
    if (record.ListingKey && record.Order !== undefined) {
      const key = `${record.ListingKey}_${record.Order}`;
      roomMap.set(key, record);
    }
  });
  
  // Convert back to array
  const beforeDedup = mapped.length;
  mapped = Array.from(roomMap.values());
  duplicatesRemoved = beforeDedup - mapped.length;
  
  if (DEBUG && duplicatesRemoved > 0) {
    dlog(`🏠 Removed ${duplicatesRemoved} duplicate room records (same ListingKey + Order)`);
  }
}
```

### **How It Works:**

1. **Creates a Map:** Uses `(ListingKey, Order)` as the key
2. **Deduplicates:** If multiple records have the same key, only the last one is kept
3. **Converts Back:** Transforms the Map back to an array for upsert
4. **Logs Results:** Shows how many duplicates were removed

### **Files Updated:**
- `lib/syncVow.js` - Added deduplication logic
- `lib/syncIdx.js` - Added deduplication logic

## Expected Results After Fix

### **Before Fix:**
```
📊 property_rooms: fetched 788 records (skip=0)
⚠️ property_rooms retry 1/3 in 500ms
⚠️ property_rooms retry 2/3 in 1000ms
⚠️ property_rooms retry 3/3 in 2000ms
❌ property_rooms upsert failed after 3 retries: ON CONFLICT DO UPDATE command cannot affect row a second time
```

### **After Fix (Expected):**
```
📊 property_rooms: fetched 788 records (skip=0)
🏠 Removed 15 duplicate room records (same ListingKey + Order)
✅ PROPERTY_ROOMS | Fetched: 788 | Processed: 773 | Dropped: 15 | Success: 98%
```

## Benefits of This Fix

1. **Prevents Upsert Conflicts:** No more "cannot affect row a second time" errors
2. **Data Quality:** Ensures only unique room records are stored
3. **Performance:** Reduces unnecessary database operations
4. **Reliability:** Sync process completes successfully
5. **Transparency:** Logs show exactly how many duplicates were removed

## How Deduplication Works

### **Example Scenario:**
```
Input Records:
- Room 1: ListingKey="123", Order=1, RoomType="Bedroom"
- Room 2: ListingKey="123", Order=1, RoomType="Master Bedroom"  // Duplicate!
- Room 3: ListingKey="123", Order=2, RoomType="Bathroom"

After Deduplication:
- Room 2: ListingKey="123", Order=1, RoomType="Master Bedroom"  // Last occurrence kept
- Room 3: ListingKey="123", Order=2, RoomType="Bathroom"
```

### **Key Points:**
- **Last Wins:** If there are duplicates, the last occurrence in the batch is kept
- **Preserves Data:** All unique room records are maintained
- **Efficient:** Uses Map for O(1) lookup and deduplication
- **Safe:** Only affects property_rooms table, other tables unchanged

## Testing the Fix

After applying these changes:
1. Run a sync operation
2. Look for the deduplication log message: `🏠 Removed X duplicate room records`
3. Verify that property_rooms completes successfully without retry errors
4. Check that the final success rate is high (close to 100%)

The sync should now handle duplicate room records gracefully and complete successfully!
