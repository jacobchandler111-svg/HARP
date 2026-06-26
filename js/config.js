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

  // Insurance adequacy: total face value (payout) vs liabilities and vs future income (income x years to
  // retirement), plus policy age. Each is its own finding; the CATEGORY score uses the (C,M) rubric below.
  insurance: {
    significantShortfallBand: 0.5,   // payout covering < half a need => critical, else moderate (liabilities & future income)
    defaultYearsToRetirement: 20,    // remaining working years assumed when not provided
    policyAgeModerateYears: 7,        // policy issued / last reviewed >= this (and < critical) => moderate
    policyAgeCriticalYears: 10,       // >= this => critical
    // Insurance CATEGORY score by (criticals C, moderates M); overrides the generic per-finding scoring.
    categoryScore: { none: 15, c2: 25, c1m1: 50, c1: 65, m2: 65, m1: 85, ok: 100 }
  },

  // Tax-bucket diversification
  tax: {
    bucketConcentrationPct: 85       // flag if one tax treatment exceeds this % of investable assets
  },

  // Accounting / 1040
  accounting: {
    highEffectiveRatePct: 25,        // effective tax rate above this prompts a tax-efficiency note
    // IRS standard deduction by filing status (tax year 2025, OBBBA-adjusted). Refresh each tax year.
    standardDeductions: {
      'Single': 15750,
      'Married filing jointly': 31500,
      'Married filing separately': 15750,
      'Head of household': 23625
    },
    // "In a high bracket on only the standard deduction" severity: flag at/above the moderate bracket,
    // critical at/above the critical bracket. The bracket is read off AGI (no tax is calculated).
    bracketModerateMin: 24,
    bracketCriticalMin: 35,
    lowAgiModerateBand: 1.1,         // AGI below the standard deduction => critical; up to this x standard => moderate
    // 2025 federal marginal brackets by filing status: [AGI lower bound, rate %]. Refresh each tax year.
    taxBrackets: {
      'Single':                    [[0,10],[11925,12],[48475,22],[103350,24],[197300,32],[250525,35],[626350,37]],
      'Married filing jointly':    [[0,10],[23850,12],[96950,22],[206700,24],[394600,32],[501050,35],[751600,37]],
      'Married filing separately': [[0,10],[11925,12],[48475,22],[103350,24],[197300,32],[250525,35],[375800,37]],
      'Head of household':         [[0,10],[17000,12],[64850,22],[103350,24],[197300,32],[250500,35],[626350,37]]
    }
  },

  // Legal / estate
  legal: {
    assetProtectionTrustThreshold: 5000000,  // assets above this with no asset-protection trust => liability risk
    reviewModerateYears: 3,                   // a document not reviewed in over 3 years => moderate concern (warn)
    reviewHighRiskYears: 5                     // not reviewed in over 5 years => high risk
  },

  // Overall score deductions (out of 100)
  score: { perRisk: 15, perWarn: 6 },

  // Per-category diminishing score: the first critical/moderate costs the most, each additional one less,
  // so a gauge isn't tanked by pile-on. Investments/legal: 1 critical ~67, 2 ~44, 3 ~21, 2 crit + 1 mod ~34,
  // 1 moderate ~90. Tax (gentler): 1 critical => 60, 2 => 45; 1 moderate => 85.
  categoryScoreScheme: {
    investments: { firstCritical: 33, addlCritical: 23, firstModerate: 10, addlModerate: 8 },
    legal:       { firstCritical: 33, addlCritical: 23, firstModerate: 10, addlModerate: 8 },
    tax:         { firstCritical: 40, addlCritical: 15, firstModerate: 15, addlModerate: 8 }
  }
};
