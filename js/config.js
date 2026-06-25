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
  sectorConcentrationPct: 30,        // flag any one sector above this % of the portfolio (sector over-allocation)
  // Sectors that are diversified or non-equity — excluded from the concentration flags, since an
  // S&P 500 fund or a cash balance is not single-name or sector risk.
  nonConcentratingSectors: ['Diversified / Fund', 'Cash & Equivalents'],
  // Investment-category finding score weights (how hard each moves the Investments gauge). Concentration
  // = critical; performance / embedded-gains = moderate. Tuned so 1 critical ~ mid-yellow, 2 ~ red.
  investmentWeights: { critical: 33, moderate: 10 },

  // Investment performance: the client's most recent full-year return is compared to TWO benchmarks —
  // a fixed long-run market assumption, and the actual annualized S&P 500 return for the last 3 years.
  performance: {
    benchmarkName: 'S&P 500',
    tolerancePct: 0,              // any underperformance vs the benchmark flags
    // Single benchmark = the actual S&P 500 recent annualized return (with dividends), looked up —
    // REFRESH ANNUALLY. annualizedPct is the geometric mean: ((1.263)(1.250)(1.179))^(1/3)-1 ~= 23.0%.
    // Sources: slickcharts / First Trust / RBC.
    trailing3yr: {
      years: '2023-2025',
      annualReturnsPct: [26.3, 25.0, 17.9],
      annualizedPct: 23.0
    }
  },

  // Embedded / unrealized gains — needs a cost basis on the holding. A large low-basis position is
  // both an investment-concentration and an upcoming-tax-event concern (flagged in both domains).
  gains: {
    embeddedGainPct: 100,     // unrealized gain >= this % of cost basis (value >= ~2x basis)
    minGainAmount: 25000      // ...and only when the dollar gain is at least this material
  },

  // Insurance adequacy as a single "insurance gap": total face value (payout) vs liabilities and vs
  // future income (income x years to retirement). The gap level sets a score weight on one finding.
  insurance: {
    significantShortfallBand: 0.5,   // payout below half a need (need >= ~2x payout) => critical, else moderate
    defaultYearsToRetirement: 20,    // remaining working years assumed when not provided
    gapDeductions: { none: 75, critical: 52, moderate: 30 }  // score weight by gap level (Insurance gauge ~25 / 48 / 70 / 100)
  },

  // Tax-bucket diversification
  tax: {
    bucketConcentrationPct: 85       // flag if one tax treatment exceeds this % of investable assets
  },

  // Accounting / 1040
  accounting: {
    highEffectiveRatePct: 25,        // effective tax rate above this prompts a tax-efficiency note
    highIncomeThreshold: 150000,     // gross income at/above this + only the standard deduction => possible missed savings
    // IRS standard deduction by filing status (tax year 2025, OBBBA-adjusted). Refresh each tax year.
    standardDeductions: {
      'Single': 15750,
      'Married filing jointly': 31500,
      'Married filing separately': 15750,
      'Head of household': 23625
    }
  },

  // Legal / estate
  legal: {
    assetProtectionTrustThreshold: 5000000,  // assets above this with no asset-protection trust => liability risk
    reviewModerateYears: 3,                   // a document not reviewed in over 3 years => moderate concern (warn)
    reviewHighRiskYears: 5                     // not reviewed in over 5 years => high risk
  },

  // Overall score deductions (out of 100)
  score: { perRisk: 15, perWarn: 6 }
};
