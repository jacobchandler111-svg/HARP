// Example household used by the "Load sample" button. Crafted to exercise every check:
// heavy Technology weighting, large embedded gains (AAPL, NVDA) flagged in both investments and tax, a
// return trailing the S&P 500, a high income on only the standard deduction, face value below both the
// future-income value and liabilities, no tax-free bucket, >$5M assets with no asset-protection trust,
// an out-of-date will, and missing estate documents.
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

  // Primary goal: growth — judged on last-year return vs. the S&P. (The income fields below are populated
  // too, so switching the goal to "Income" also demonstrates the income-vs-withdrawal shortfall check.)
  goal: 'growth',
  // Most recent full-year (2025) portfolio return — below the S&P 500's recent annualized (~23%), trails.
  yearReturnPct: 5,
  dividendPct: 1.8,
  fixedIncomeValue: 150000,   // bonds, etc.; sums into the (now computed) total portfolio value
  fixedIncomeIncome: 6000,
  monthlyDrawdown: 5000,

  // Years until retirement — drives the economic-value-of-future-income method.
  yearsToRetirement: 20,

  // Household balance sheet. Assets > $5M with no asset-protection trust triggers the estate risk;
  // $600k liabilities against $250k face value is a "significantly underinsured" red flag.
  assets: 6000000,
  liabilities: 600000,

  holdings: [
    { ticker: 'AAPL', name: 'Apple Inc.',        sector: 'Technology',          value: 180000, costBasis: 60000 },
    { ticker: 'MSFT', name: 'Microsoft Corp.',   sector: 'Technology',          value: 120000 },
    { ticker: 'NVDA', name: 'NVIDIA Corp.',      sector: 'Technology',          value: 90000, costBasis: 20000 },
    { ticker: 'VOO',  name: 'Vanguard S&P 500',  sector: 'Diversified / Fund',  value: 200000 },
    { ticker: 'JPM',  name: 'JPMorgan Chase',    sector: 'Financials',          value: 60000 },
    { ticker: 'XOM',  name: 'Exxon Mobil',       sector: 'Energy',              value: 40000 }
  ],

  insurance: {
    hasPolicies: true,
    totalFaceValue: 250000,    // below both the future-income value and the $600k liabilities
    policyAgeYears: 12         // > 10 years -> aged-policy critical (3 insurance criticals -> score 25)
  },

  legal: {
    will: true,
    willReviewedYears: 8,          // > 5 years -> high risk (out of date)
    trust: true,
    trustTypes: ['revocable'],     // no asset-protection trust -> with >$5M assets, triggers the APT risk
    trustReviewedYears: 1,
    poa: false,
    healthcare: false,
    beneficiaries: true,
    guardianship: false,
    assetInventory: false
  }
};
