// mappers/mapPropertyOpenhouse.js - Maps to property_openhouse table

export function mapPropertyOpenhouse(item) {
  return {
    // === PRIMARY IDENTIFIERS ===
    OpenHouseKey:           item.OpenHouseKey,       // Primary key for open house record
    ListingKey:             item.ListingKey,         // Listing Key
    
    // === OPEN HOUSE DETAILS ===
    OpenHouseDate:          item.OpenHouseDate,         // Open house date
    OpenHouseStartTime:     item.OpenHouseStartTime,    // Start time
    OpenHouseEndTime:       item.OpenHouseEndTime,      // End time
    OpenHouseType:          item.OpenHouseType,         // Public, Broker, etc.
    OpenHouseStatus:        item.OpenHouseStatus,       // Active, Canceled, etc.

    // === TIMESTAMPS ===
    ModificationTimestamp:  item.ModificationTimestamp  // Last modification timestamp
  };
}
