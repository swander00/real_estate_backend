/**
 * propertyClassifiers.js
 * 
 * Utilities for classifying and standardizing property characteristics.
 */

import { cleanSingleValue, cleanArrayValue } from './valueCleaners.js';

/**
 * Maps property subtypes to standardized values
 * @param {string} rawValue - Raw property subtype
 * @returns {string} - Standardized property subtype
 */
export function mapPropertySubType(rawValue) {
  const cleaned = cleanSingleValue(rawValue);
  if (!cleaned) return "Other";

  const mapping = {
    // Freehold Houses
    "Detached": "Detached",
    "Semi-Detached": "Semi-Detached",
    "Att/Row/Townhouse": "Townhouse (Row)",
    "Link": "Link House",
    "Farm": "Rural / Farm",
    "Rural Residential": "Rural / Farm",

    // Condo Living
    "Condo Apartment": "Condo Apartment",
    "Co-op Apartment": "Condo Apartment",
    "Co-Ownership Apartment": "Condo Apartment",
    "Condo Townhouse": "Condo Townhouse",
    "Detached Condo": "Detached Condo",
    "Semi-Detached Condo": "Semi-Detached Condo",
    "Common Element Condo": "Specialty Condos",
    "Leasehold Condo": "Specialty Condos",
    "Vacant Land Condo": "Specialty Condos",

    // Multi-Unit
    "Duplex": "Duplex",
    "Triplex": "Triplex",
    "Fourplex": "Multiplex",
    "Multiplex": "Multiplex",
    "Store W Apt/Office": "Multiplex",

    // Recreational
    "Cottage": "Cottage",
    "MobileTrailer": "Mobile / Manufactured Home",
    "Modular Home": "Mobile / Manufactured Home",

    // Special Use
    "Vacant Land": "Vacant Land",
    "Parking Space": "Parking / Locker",
    "Locker": "Parking / Locker",
    "Room": "Individual Units",
    "Upper Level": "Individual Units",
    "Lower Level": "Individual Units",
    "Timeshare": "Timeshare",
    "Other": "Other"
  };

  return mapping[cleaned] || "Other";
}

/**
 * Maps architectural styles to standardized values
 * @param {string} rawValue - Raw architectural style
 * @returns {string} - Standardized architectural style
 */
export function mapArchitecturalStyle(rawValue) {
  const cleaned = cleanSingleValue(rawValue);
  if (!cleaned) return "Unknown";

  const map = {
    // Stories
    "1 1/2 Storey": "1 Storey",
    "1 Storey/Apt": "1 Storey",
    "2-Storey": "2 Storey",
    "2 1/2 Storey": "2 Storey",
    "3-Storey": "3 Storey",

    // Bungalow types
    "Bungalow": "Bungalow",
    "Bungalow-Raised": "Bungalow",
    "Bungaloft": "Bungalow",

    // Backsplit
    "Backsplit 3": "Backsplit",
    "Backsplit 4": "Backsplit",
    "Backsplit 5": "Backsplit",

    // Sidesplit
    "Sidesplit": "Sidesplit",
    "Sidesplit 3": "Sidesplit",
    "Sidesplit 4": "Sidesplit",
    "Sidesplit 5": "Sidesplit",

    // Other direct
    "Apartment": "Apartment",
    "Stacked Townhouse": "Stacked Townhouse",
    "Loft": "Loft / Studio",
    "Bachelor/Studio": "Loft / Studio",
    "Chalet": "Modern",
    "Contemporary": "Modern",
    "Garden House": "Modern",
    "Log": "Custom",
    "Multi-Level": "Custom",
    "Other": "Other",
    "Unknown": "Unknown"
  };

  return map[cleaned] || "Unknown";
}

/**
 * Normalizes MLS status values with fallback to transaction type
 * @param {string} mlsStatus - MLS status
 * @param {string} transactionType - Transaction type for fallback
 * @returns {string} - Normalized status
 */
export function normalizeMlsStatus(mlsStatus, transactionType) {
  const raw = cleanSingleValue(mlsStatus);
  if (!raw || raw.toLowerCase() === "new") {
    return cleanSingleValue(transactionType) || "Unknown";
  }
  return raw;
}

/**
 * Parses basement information into type and entrance arrays
 * @param {*} rawValue - Raw basement data
 * @returns {Object} - Object with basement and entrances arrays
 */
export function parseBasementInfo(rawValue) {
  const basementTypes = [
    "Apartment",
    "Crawl Space",
    "Development Potential",
    "Exposed Rock",
    "Finished",
    "Full",
    "Half",
    "Other",
    "Partial Basement",
    "Partially Finished",
    "Unfinished",
    "Unknown",
    "null"
  ];

  const basementEntrances = ["Walk-Out", "Walk-Up", "Separate Entrance"];
  
  const entries = cleanArrayValue(rawValue);
  const basement = [];
  const entrances = [];

  entries.forEach((item) => {
    if (!item || item.toLowerCase() === 'none' || item.toLowerCase() === 'unknown') return;
    
    basementTypes.forEach((type) => {
      if (item.toLowerCase().includes(type.toLowerCase())) {
        basement.push(type);
      }
    });
    basementEntrances.forEach((entry) => {
      if (item.toLowerCase().includes(entry.toLowerCase())) {
        entrances.push(entry);
      }
    });
  });

  return {
    basement: basement.length > 0 ? [...new Set(basement)] : null,
    entrances: entrances.length > 0 ? [...new Set(entrances)] : null
  };
}