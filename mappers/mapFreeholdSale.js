// mappers/mapFreeholdSale.js
export function mapFreeholdSale(idx = {}, vow = {}) {
  return {
    LotDepth: vow.LotDepth ?? idx.LotDepth ?? null,
    LotWidth: vow.LotWidth ?? idx.LotWidth ?? null,

    ParcelOfTiedLand: vow.ParcelOfTiedLand ?? idx.ParcelOfTiedLand ?? null,
    LotSizeUnits: vow.LotSizeUnits ?? idx.LotSizeUnits ?? null,
    ApproximateAge: vow.ApproximateAge ?? idx.ApproximateAge ?? null,
    AdditionalMonthlyFee: vow.AdditionalMonthlyFee ?? idx.AdditionalMonthlyFee ?? null,

    TaxAnnualAmount: vow.TaxAnnualAmount ?? idx.TaxAnnualAmount ?? null,
    TaxYear: vow.TaxYear ?? idx.TaxYear ?? null
  };
}
