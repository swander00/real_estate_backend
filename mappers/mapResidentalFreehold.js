// mappers/mapResidentalFreehold.js
export function mapResidentalFreehold(idx = {}, vow = {}) {
  return {
    LotDepth: idx.LotDepth ?? idx.LotDepth ?? null,
    LotWidth: idx.LotWidth ?? idx.LotWidth ?? null,

    LotSizeUnits: idx.LotSizeUnits ?? idx.LotSizeUnits ?? null,
    ApproximateAge: idx.ApproximateAge ?? idx.ApproximateAge ?? null,
    AdditionalMonthlyFee: idx.AdditionalMonthlyFee ?? idx.AdditionalMonthlyFee ?? null,
    LotSizeRangeAcres: idx.LotSizeRangeAcres ?? idx.LotSizeRangeAcres ?? null,

    TaxAnnualAmount: idx.TaxAnnualAmount ?? idx.TaxAnnualAmount ?? null,
    TaxYear: idx.TaxYear ?? idx.TaxYear ?? null
  };
}
