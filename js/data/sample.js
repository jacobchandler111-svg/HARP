// Example household used by the "Load sample" button. Crafted to exercise every check:
// heavy Technology weighting (sector + single-stock flags), a large life-insurance gap,
// no tax-free bucket, and two missing estate documents.
window.HARP = window.HARP || {};

HARP.sample = {
  name: 'Sample Household',
  income: 150000,
  dependents: 2,
  lifeCoverage: 250000,

  // Accounts & tax (investable assets by tax treatment)
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

  legal: {
    will: true,
    poa: false,
    healthcare: false,
    beneficiaries: true,
    trust: false
  }
};
