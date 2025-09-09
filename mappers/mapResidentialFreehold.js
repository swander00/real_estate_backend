// mappers/mapResidentialFreehold.js

// Import helpers from new utility files
import { cleanSingleValue } from '../utils/dataCleaners.js';
import { cleanTimestamp, buildLotSize } from '../utils/formatters.js';

export function mapResidentialFreehold(idx = {}, vow = {}) {
  const get = (field) => vow[field] ?? idx[field] ?? null;

  // Use the buildLotSize helper function
  const LotSize = buildLotSize(get('LotWidth'), get('LotDepth'), get('LotSizeUnits'));

  // For upserts: use existing timestamps if available, otherwise let DB defaults handle it
  const now = new Date().toISOString();
  const existingCreatedAt = get('CreatedAt');

  return {
    ListingKey:                 cleanSingleValue(get('ListingKey')),
    LotSize:                    LotSize,
    ApproximateAge:             get('ApproximateAge'),
    AdditionalMonthlyFee:       get('AdditionalMonthlyFee'),
    TaxAnnualAmount:            get('TaxAnnualAmount'),
    TaxYear:                    get('TaxYear'),
    ModificationTimestamp:      cleanTimestamp(get('ModificationTimestamp')),
    SystemModificationTimestamp: cleanTimestamp(get('SystemModificationTimestamp')),
    OriginalEntryTimestamp:     cleanTimestamp(get('OriginalEntryTimestamp')),
    CreatedAt:                  existingCreatedAt || now,
    UpdatedAt:                  now
  };
}