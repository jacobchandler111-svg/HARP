// HARP configuration — the single source of truth for the methodology + branding.
// Thresholds are deliberate STARTING POINTS, not professional standards. Tune freely.
window.HARP = window.HARP || {};

HARP.config = {
  // Firm branding shown on the client-facing report. Replace with real Brookhaven assets.
  branding: {
    firmName: 'Brookhaven',
    tagline: 'Wealth & Risk Advisory',
    contact: { phone: '', email: '', website: '', address: '' },
    logoUrl: '', // path to a logo (SVG/PNG) once provided; falls back to the firm name
    colors: { primary: '#0b3a8a', accent: '#1f6feb' },
    disclaimer: 'This report is informational only and does not constitute financial, tax, legal, ' +
      'or insurance advice. Figures are based on the inputs provided and on configurable assumptions. ' +
      'Please consult the appropriate licensed professional before acting.'
  },

  // Investment concentration
  singleStockConcentrationPct: 20,   // flag any one stock above this % of the portfolio (single-name risk)
  sectorConcentrationPct: 25,        // flag any one sector above this % of the portfolio (sector over-allocation)
  // Sectors that are diversified or non-equity — excluded from the concentration flags, since an
  // S&P 500 fund or a cash balance is not single-name or sector risk.
  nonConcentratingSectors: ['Diversified / Fund', 'Cash & Equivalents'],

  // Investment performance vs the market (trailing 3-year, annualized)
  performance: {
    benchmarkName: 'S&P 500',
    benchmarkReturnPct: 10,   // trailing ~3-year average annual return for the benchmark (tunable; ~10-11% historically)
    tolerancePct: 1,          // within this many points of the benchmark counts as "in line with the market"
    severeGapPct: 4           // trailing the benchmark by more than this flags as a risk, not just a watch item
  },

  // Insurance adequacy, by policy type
  insurance: {
    life: {
      baseIncomeMultiple: 10,        // baseline need ~ 10x income
      perDependentMultiple: 1,       // +1x income per dependent
      maxDependentMultiple: 5,       // cap the dependent add-on
      underinsuredBand: 0.8,         // coverage below need*band => underinsured
      overinsuredBand: 1.5           // coverage above need*band => possibly over-insured
    },
    disability: {
      targetReplacementPct: 60,      // benefit should replace ~60% of gross income
      underinsuredBand: 0.8
    },
    property: {
      dwellingCoverageBand: 0.8      // dwelling coverage should be >= 80% of home value
    },
    umbrella: {
      recommendAboveAssets: 500000,  // recommend umbrella once estimated assets exceed this
      minCoverageBand: 1.0           // umbrella should be >= ~1x estimated assets
    },
    // Life face amount vs total liabilities — sliding-scale severity
    liabilityCoverage: {
      significantShortfallBand: 0.5  // face covering < 50% of liabilities => significantly under (risk); 50-99% => slightly under (warn)
    }
  },

  // Tax-bucket diversification
  tax: {
    bucketConcentrationPct: 85       // flag if one tax treatment exceeds this % of investable assets
  },

  // Accounting / 1040
  accounting: {
    highEffectiveRatePct: 25         // effective tax rate above this prompts a tax-efficiency note
  },

  // Legal / estate
  legal: {
    assetProtectionTrustThreshold: 5000000,  // assets above this with no asset-protection trust => liability risk
    reviewStaleYears: 5                       // a will/trust not reviewed within this many years => flagged as stale
  },

  // Overall score deductions (out of 100)
  score: { perRisk: 15, perWarn: 6 }
};
