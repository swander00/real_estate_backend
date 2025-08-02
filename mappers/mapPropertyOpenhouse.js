// mappers/mapPropertyOpenhouse.js

export function mapPropertyOpenhouse(item = {}) {
  return {
    ListingKey:               item.ListingKey ?? null,
    OpenHouseId:              item.OpenHouseId ?? null,
    OpenHouseKey:             item.OpenHouseKey ?? null,
    OpenHouseDate:            item.OpenHouseDate ? new Date(item.OpenHouseDate) : null,
    OpenHouseStartTime:       item.OpenHouseStartTime ? new Date(item.OpenHouseStartTime) : null,
    OpenHouseEndTime:         item.OpenHouseEndTime ? new Date(item.OpenHouseEndTime) : null,
    OpenHouseStatus:          item.OpenHouseStatus ?? null,
    OpenHouseType:            item.OpenHouseType ?? null,
    OriginalEntryTimestamp:   item.OriginalEntryTimestamp
                                ? new Date(item.OriginalEntryTimestamp)
                                : null,
    ModificationTimestamp:    item.ModificationTimestamp
                                ? new Date(item.ModificationTimestamp)
                                : null
  };
}
