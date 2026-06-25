// HARP configuration — the single source of truth for the methodology.
// These are deliberate STARTING POINTS, not professional standards. Tune freely.
window.HARP = window.HARP || {};

HARP.config = {
  // Investment concentration
  singleStockConcentrationPct: 10,   // flag any one holding above this % of the portfolio
  sectorConcentrationPct: 30,        // flag any one sector above this % of the portfolio

  // Life-insurance need = income * (base + per-dependent), capped
  insurance: {
    baseIncomeMultiple: 10,          // e.g. 10x income as a baseline need
    perDependentMultiple: 1,         // +1x income per dependent
    maxDependentMultiple: 5,         // cap the dependent add-on
    underinsuredBand: 0.8,           // coverage below need*band => underinsured
    overinsuredBand: 1.5             // coverage above need*band => possibly over-insured
  },

  // Tax-bucket diversification
  tax: {
    bucketConcentrationPct: 85       // flag if one tax treatment exceeds this % of investable assets
  },

  // Overall score deductions (out of 100)
  score: {
    perRisk: 15,
    perWarn: 6
  }
};
