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

  // Tax-treatment buckets are now derived from each holding's account type (+ the fixed-income account).

  // Primary goal: growth. (The income fields below are populated too, so switching the goal to "Income"
  // demonstrates the income-vs-withdrawal shortfall check.) The return isn't compared to the market here
  // because this portfolio isn't 100% stock (it has fixed income).
  goal: 'growth',
  age: 45,                    // used for insurance years-to-retirement (the 110-age allocation check is retired)

  // Risk profile (Nitrogen / Riskalyze). The portfolio Risk Number (78) sits well above the client's
  // risk tolerance (55) — a 23-point over-risk gap (past the 20-point critical threshold), so the
  // Investments assessment raises a CRITICAL risk-alignment finding. The 6-month 95% range is context.
  risk: {
    toleranceNumber: 55,
    portfolioNumber: 78,
    timeHorizonYears: 20,
    rangeLowPct: -18,
    rangeHighPct: 24,
    rangeLowAmt: 138600,
    rangeHighAmt: 184800,
    gpa: 'B'
  },

  yearReturnPct: 5,
  fixedIncomeValue: 150000,   // bonds, etc.; sums into the (now computed) total portfolio value
  fixedIncomeAccount: 'traditional',   // held in a tax-deferred account
  fixedIncomeIncome: 6000,
  monthlyDrawdown: 5000,


  // Household balance sheet. Assets > $5M with no asset-protection trust triggers the estate risk;
  // $600k liabilities against $250k face value is a "significantly underinsured" red flag.
  assets: 6000000,
  liabilities: 600000,

  holdings: [
    { ticker: 'AAPL', name: 'Apple Inc.',        sector: 'Technology',          value: 180000, costBasis: 60000, dividendYield: 0.5,  accountType: 'taxable' },
    { ticker: 'MSFT', name: 'Microsoft Corp.',   sector: 'Technology',          value: 120000,                    dividendYield: 0.8,  accountType: 'taxable' },
    { ticker: 'NVDA', name: 'NVIDIA Corp.',      sector: 'Technology',          value: 90000,  costBasis: 20000,  dividendYield: 0.03, accountType: 'taxable' },
    { ticker: 'VOO',  name: 'Vanguard S&P 500',  sector: 'Diversified / Fund',  value: 200000,                    dividendYield: 1.3,  accountType: 'traditional' },
    { ticker: 'JPM',  name: 'JPMorgan Chase',    sector: 'Financials',          value: 60000,                     dividendYield: 2.4,  accountType: 'roth' },
    { ticker: 'XOM',  name: 'Exxon Mobil',       sector: 'Energy',              value: 40000,                     dividendYield: 3.5 }
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
