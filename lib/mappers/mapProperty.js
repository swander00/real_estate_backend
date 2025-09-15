// lib/mapProperty.js
const logger = require('../utils/logger');

function mapProperty(raw) {
  try {
    return {
      // Primary key
      ListingKey: raw.ListingKey,

      // Financials
      ListPrice: raw.ListPrice,
      ClosePrice: raw.ClosePrice,

      // Statuses
      MlsStatus: raw.MlsStatus,
      ContractStatus: raw.ContractStatus,
      StandardStatus: raw.StandardStatus,
      TransactionType: raw.TransactionType,

      // Property classification
      PropertyType: raw.PropertyType,
      PropertySubType: raw.PropertySubType,
      ArchitecturalStyle: Array.isArray(raw.ArchitecturalStyle) ? raw.ArchitecturalStyle : raw.ArchitecturalStyle ? [raw.ArchitecturalStyle] : [],

      // Address fields
      UnparsedAddress: raw.UnparsedAddress,
      StreetNumber: raw.StreetNumber,
      StreetName: raw.StreetName,
      StreetSuffix: raw.StreetSuffix,
      City: raw.City,
      StateOrProvince: raw.StateOrProvince,
      PostalCode: raw.PostalCode,
      CountyOrParish: raw.CountyOrParish,
      CityRegion: raw.CityRegion,
      UnitNumber: raw.UnitNumber,

      // Property details
      KitchensAboveGrade: safeInt(raw.KitchensAboveGrade),
      BedroomsAboveGrade: safeInt(raw.BedroomsAboveGrade),
      BedroomsBelowGrade: safeInt(raw.BedroomsBelowGrade),
      BathroomsTotalInteger: safeInt(raw.BathroomsTotalInteger),
      KitchensBelowGrade: safeInt(raw.KitchensBelowGrade),
      KitchensTotal: safeInt(raw.KitchensTotal),
      DenFamilyRoomYN: safeBool(raw.DenFamilyRoomYN),

      // Descriptions
      PublicRemarks: raw.PublicRemarks,
      PossessionDetails: raw.PossessionDetails,

      // Change tracking timestamps
      PhotosChangeTimestamp: safeDate(raw.PhotosChangeTimestamp),
      MediaChangeTimestamp: safeDate(raw.MediaChangeTimestamp),
      ModificationTimestamp: safeDate(raw.ModificationTimestamp),
      SystemModificationTimestamp: safeDate(raw.SystemModificationTimestamp),
      OriginalEntryTimestamp: safeDate(raw.OriginalEntryTimestamp),
      SoldConditionalEntryTimestamp: safeDate(raw.SoldConditionalEntryTimestamp),
      SoldEntryTimestamp: safeDate(raw.SoldEntryTimestamp),
      SuspendedEntryTimestamp: safeDate(raw.SuspendedEntryTimestamp),
      TerminatedEntryTimestamp: safeDate(raw.TerminatedEntryTimestamp),

      // Lifecycle dates
      CloseDate: safeDate(raw.CloseDate),
      ConditionalExpiryDate: safeDate(raw.ConditionalExpiryDate),
      PurchaseContractDate: safeDate(raw.PurchaseContractDate),
      SuspendedDate: safeDate(raw.SuspendedDate),
      TerminatedDate: safeDate(raw.TerminatedDate),
      UnavailableDate: safeDate(raw.UnavailableDate),

      // Features & attributes
      Cooling: normalizeArray(raw.Cooling),
      Sewer: normalizeArray(raw.Sewer),
      Basement: normalizeArray(raw.Basement),
      BasementEntrance: raw.BasementEntrance,
      ExteriorFeatures: normalizeArray(raw.ExteriorFeatures),
      InteriorFeatures: normalizeArray(raw.InteriorFeatures),
      PoolFeatures: normalizeArray(raw.PoolFeatures),
      PropertyFeatures: normalizeArray(raw.PropertyFeatures),
      HeatType: raw.HeatType,
      FireplaceYN: safeBool(raw.FireplaceYN),
      LivingAreaRange: raw.LivingAreaRange,
      WaterfrontYN: safeBool(raw.WaterfrontYN),
      PossessionType: raw.PossessionType,

      // Parking
      CoveredSpaces: safeInt(raw.CoveredSpaces),
      ParkingSpaces: safeInt(raw.ParkingSpaces),
      ParkingTotal: safeInt(raw.ParkingTotal),

      // Open House
      OpenHouseDate: safeDate(raw.OpenHouseDate),
      OpenHouseStartTime: safeDate(raw.OpenHouseStartTime),
      OpenHouseEndTime: safeDate(raw.OpenHouseEndTime),
      OpenHouseStatus: raw.OpenHouseStatus,
      OpenHouseDateTime: safeDate(raw.OpenHouseDateTime),

      // Rooms
      RoomDescription: raw.RoomDescription,
      RoomLength: safeNumeric(raw.RoomLength),
      RoomWidth: safeNumeric(raw.RoomWidth),
      RoomLengthWidthUnits: raw.RoomLengthWidthUnits,
      RoomDimensions: raw.RoomDimensions,
      RoomFeature1: raw.RoomFeature1,
      RoomFeature2: raw.RoomFeature2,
      RoomFeature3: raw.RoomFeature3,
      RoomFeatures: normalizeArray(raw.RoomFeatures),
      RoomLevel: raw.RoomLevel,
      RoomType: raw.RoomType,

      // Condo / association
      AssociationAmenities: normalizeArray(raw.AssociationAmenities),
      Locker: raw.Locker,
      BalconyType: raw.BalconyType,
      PetsAllowed: normalizeArray(raw.PetsAllowed),
      AssociationFee: raw.AssociationFee,
      AssociationFeeIncludes: normalizeArray(raw.AssociationFeeIncludes),

      // Lot / size
      LotSize: raw.LotSize,
      ApproximateAge: raw.ApproximateAge,
      AdditionalMonthlyFee: raw.AdditionalMonthlyFee,

      // Taxes
      TaxAnnualAmount: raw.TaxAnnualAmount,
      TaxYear: safeInt(raw.TaxYear),

      // Lease / rent
      Furnished: raw.Furnished,
      RentIncludes: normalizeArray(raw.RentIncludes),

      // Sync metadata
      CreatedAt: raw.CreatedAt || new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error mapping property:', {
      ListingKey: raw?.ListingKey,
      error: error.message
    });
    throw error;
  }
}

// Helper utilities
function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function safeInt(value) {
  return value !== null && value !== undefined ? parseInt(value, 10) : null;
}

function safeNumeric(value) {
  return value !== null && value !== undefined ? Number(value) : null;
}

function safeBool(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true' || value === 'Y';
}

function safeDate(value) {
  return value ? new Date(value).toISOString() : null;
}

function validateProperty(property) {
  if (!property.ListingKey) throw new Error('Missing required field: ListingKey');
  return true;
}

module.exports = {
  mapProperty,
  validateProperty
};
