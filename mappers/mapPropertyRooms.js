// mappers/mapPropertyRooms.js

export function mapPropertyRooms(idx) {
  const clean = (v) =>
    v === undefined || v === null
      ? null
      : Array.isArray(v)
      ? (v.length ? String(v[0]).trim() : null)
      : String(v).trim();

  const cleanArray = (v) => {
    if (!v) return null;
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
    return String(v)
      .split(/[|;,/]/g)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const cleanNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const cleanInt = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };

  const cleanDate = (v) => {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  // Required fields
  const RoomKey = clean(idx.RoomKey);
  const ListingKey = clean(idx.ListingKey);
  let Order = cleanInt(idx.Order);

  // Fallback for missing Order
  if (Order === null && RoomKey) {
    let hash = 0;
    for (let i = 0; i < RoomKey.length; i++) {
      hash = (hash * 31 + RoomKey.charCodeAt(i)) | 0;
    }
    Order = Math.abs(hash % 1000) + 1000;
  }

  return {
    RoomKey,
    ListingKey,
    ModificationTimestamp: cleanDate(idx.ModificationTimestamp),
    Order,
    RoomType: clean(idx.RoomType),
    RoomLevel: clean(idx.RoomLevel),
    RoomDimensions: clean(idx.RoomDimensions),
    RoomFeature1: clean(idx.RoomFeature1),
    RoomFeature2: clean(idx.RoomFeature2),
    RoomFeature3: clean(idx.RoomFeature3),
    RoomFeatures: cleanArray(idx.RoomFeatures),
    RoomDescription: clean(idx.RoomDescription),
    RoomArea: cleanNum(idx.RoomArea),
    RoomAreaSource: clean(idx.RoomAreaSource),
    RoomAreaUnits: clean(idx.RoomAreaUnits),
    RoomLength: cleanNum(idx.RoomLength),
    RoomLengthWidthSource: clean(idx.RoomLengthWidthSource),
    RoomLengthWidthUnits: clean(idx.RoomLengthWidthUnits),
    RoomStatus: clean(idx.RoomStatus),
    RoomWidth: cleanNum(idx.RoomWidth),
  };
}
