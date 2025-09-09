/**
 * propertyMappers.js
 *
 * MLS-specific normalization and mapping.
 */
import { cleanSingleValue, cleanArrayValue } from './dataCleaners.js';

export function mapPropertySubType(raw) {
  const c = cleanSingleValue(raw);
  if (!c) return "Other";
  const map = {
    "Detached": "Detached",
    "Semi-Detached": "Semi-Detached",
    "Att/Row/Townhouse": "Townhouse",
    "Condo Apartment": "Condo Apartment",
    "Condo Townhouse": "Condo Townhouse",
    "Duplex": "Duplex",
    "Triplex": "Triplex",
    "Other": "Other",
  };
  return map[c] || "Other";
}

export function mapArchitecturalStyle(raw) {
  const c = cleanSingleValue(raw);
  if (!c) return "Unknown";
  const map = {
    "1 1/2 Storey": "1 Storey",
    "2-Storey": "2 Storey",
    "Bungalow": "Bungalow",
    "Backsplit 3": "Backsplit",
    "Apartment": "Apartment",
    "Loft": "Loft / Studio",
    "Other": "Other",
  };
  return map[c] || "Unknown";
}

export function normalizeMlsStatus(status, transactionType) {
  const s = cleanSingleValue(status);
  if (!s || s.toLowerCase() === "new") return cleanSingleValue(transactionType) || "Unknown";
  return s;
}

export function parseBasementInfo(raw) {
  const entries = cleanArrayValue(raw).map(e => e.toLowerCase());
  const types = ["Apartment", "Finished", "Full", "Partial", "Unfinished"];
  const entrances = ["Walk-Out", "Walk-Up", "Separate Entrance"];

  return {
    basement: types.filter(t => entries.some(e => e.includes(t.toLowerCase()))).join(', ') || null,
    entrances: entrances.filter(t => entries.some(e => e.includes(t.toLowerCase()))).join(', ') || null,
  };
}
