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
  singleStockConcentrationPct: 10,   // flag any one holding above this % of the portfolio
  sectorConcentrationPct: 30,        // flag any one sector above this % of the portfolio

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

  // Overall score deductions (out of 100)
  score: { perRisk: 15, perWarn: 6 }
};
