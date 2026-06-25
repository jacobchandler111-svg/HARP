// Sector reference data.
//
// This module is the "data seam" (see docs/ARCHITECTURE.md): today it holds a small bundled
// ticker->sector map. If we later add a live market-data source (behind a backend proxy), ONLY
// this file changes — callers just use HARP.sectors.lookup(ticker).
window.HARP = window.HARP || {};

HARP.sectors = {
  // Canonical sector list (GICS-style, simplified). Drives dropdowns and exposure grouping.
  list: [
    'Technology',
    'Financials',
    'Health Care',
    'Consumer Discretionary',
    'Consumer Staples',
    'Energy',
    'Industrials',
    'Materials',
    'Utilities',
    'Real Estate',
    'Communication Services',
    'Diversified / Fund',
    'Cash & Equivalents',
    'Other'
  ],

  // Starter ticker -> sector map. Intentionally small. Unknown tickers fall back to manual
  // sector selection in the UI.
  byTicker: {
    AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', AVGO: 'Technology',
    GOOGL: 'Communication Services', META: 'Communication Services', DIS: 'Communication Services',
    AMZN: 'Consumer Discretionary', TSLA: 'Consumer Discretionary', HD: 'Consumer Discretionary',
    JPM: 'Financials', BAC: 'Financials', BRK_B: 'Financials', V: 'Financials', MA: 'Financials',
    JNJ: 'Health Care', UNH: 'Health Care', PFE: 'Health Care', LLY: 'Health Care',
    XOM: 'Energy', CVX: 'Energy',
    PG: 'Consumer Staples', KO: 'Consumer Staples', PEP: 'Consumer Staples', WMT: 'Consumer Staples',
    SPY: 'Diversified / Fund', VOO: 'Diversified / Fund', VTI: 'Diversified / Fund', QQQ: 'Diversified / Fund'
  },

  // Look up a sector by ticker; returns null if unknown. Normalizes case and . / - separators.
  lookup: function (ticker) {
    if (!ticker) return null;
    var key = String(ticker).trim().toUpperCase().replace(/[.\-]/g, '_');
    return this.byTicker[key] || null;
  }
};
