// Example household used by the "Load sample" button. Crafted to exercise every check:
// heavy Technology weighting, a large life-insurance gap, missing disability + umbrella,
// low dwelling coverage, no tax-free bucket, and missing estate documents.
window.HARP = window.HARP || {};

HARP.sample = {
  name: 'Sample Household',

  // 1040 / accounting
  filingStatus: 'Married filing jointly',
  income: 150000,
  agi: 138000,
  totalTax: 24000,
  dependents: 2,

  // Account balances by tax treatment
  taxable: 400000,
  taxDeferred: 600000,
  taxFree: 0,

  holdings: [
    { ticker: 'AAPL', name: 'Apple Inc.',        sector: 'Technology',          value: 180000 },
    { ticker: 'MSFT', name: 'Microsoft Corp.',   sector: 'Technology',          value: 120000 },
    { ticker: 'NVDA', name: 'NVIDIA Corp.',      sector: 'Technology',          value: 90000 },
    { ticker: 'VOO',  name: 'Vanguard S&P 500',  sector: 'Diversified / Fund',  value: 200000 },
    { ticker: 'JPM',  name: 'JPMorgan Chase',    sector: 'Financials',          value: 60000 },
    { ticker: 'XOM',  name: 'Exxon Mobil',       sector: 'Energy',              value: 40000 }
  ],

  insurance: {
    employed: true,
    ownsHome: true,
    homeValue: 450000,
    life: { has: true, coverage: 250000 },
    disability: { has: false, monthlyBenefit: 0 },
    property: { has: true, dwellingCoverage: 300000 },
    umbrella: { has: false, coverage: 0 }
  },

  legal: {
    will: true,
    poa: false,
    healthcare: false,
    beneficiaries: true,
    guardianship: false,
    trust: false,
    assetInventory: false
  }
};
