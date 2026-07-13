'use strict';
// HARP ingest/engine stress harness — throws adversarial handoffs at HARP.nitrogen.fromHandoff and
// the full HARP.assessment.run (loaded via test/load.js; the engines are pure, no DOM needed).
const HARP = require('./load');
console.log('='.repeat(90));

// ---- a valid baseline handoff we mutate per case ----
function base() {
  return {
    schema_version: '1.0', harp_ready: true, client: { name: 'Baseline Household' },
    sections: {
      investments: {
        portfolio: {
          risk_number: 64, risk_tolerance_number: 53, total_value: 500000,
          range_6mo_pct: { low: -13.38, high: 25.42 }, riskalyze_gpa: 3.5, allocation_pct: {}
        },
        holdings: [
          { ticker: 'VOO', name: 'Vanguard 500', market_value: 100000, cost_basis: 60000, dividend_yield_pct: 1.3, account_type: 'taxable' },
          { ticker: 'AAPL', name: 'Apple', market_value: 80000, cost_basis: 20000, dividend_yield_pct: 0.5, account_type: 'roth ira' }
        ]
      },
      tax: { filing_status: 'married', gross_income: 250000, agi: 230000 }
    }
  };
}
// map fromHandoff output into the profile shape assessment.run expects (mirrors the UI fill+readProfile)
function toProfile(fh) {
  const holdings = (fh.holdings || []).map(h => ({
    ticker: h.ticker, name: h.name, sector: (HARP.sectors && HARP.sectors.lookup(h.ticker)) || h.sector || '',
    value: h.value, costBasis: h.costBasis, dividendYield: h.dividendYield, accountType: h.accountType
  }));
  const bucket = t => holdings.filter(h => h.accountType === t).reduce((s, h) => s + (Number(h.value) || 0), 0);
  return {
    name: (fh.client && fh.client.name) || '', goal: 'growth',
    filingStatus: fh.tax.filingStatus, income: Number(fh.tax.income) || 0, agi: Number(fh.tax.agi) || 0,
    totalTax: 0, dependents: 0,
    taxable: bucket('taxable'), taxDeferred: bucket('traditional'), taxFree: bucket('roth'),
    age: '', risk: fh.risk, yearReturnPct: '', fixedIncomeValue: 0, fixedIncomeIncome: 0, monthlyDrawdown: 0,
    portfolioValue: holdings.reduce((s, h) => s + (Number(h.value) || 0), 0), holdings,
    assets: 0, liabilities: 0,
    insurance: { hasPolicies: false, totalFaceValue: 0, policyAgeYears: '' },
    legal: { will: false, poa: false, healthcarePoa: false, trust: false, beneficiaries: false }
  };
}

// ---- cases: {name, mutate(h), expect(fh, err) -> [] of failure strings} ----
const num = (fh, k) => fh.risk[k];
const C = [
  ['baseline valid', h => h, fh => fh.holdings.length === 2 && num(fh, 'portfolioNumber') === 64 && num(fh, 'toleranceNumber') === 53 ? [] : ['expected 2 holdings / 64 / 53, got ' + fh.holdings.length + '/' + num(fh, 'portfolioNumber') + '/' + num(fh, 'toleranceNumber')]],
  ['holdings = {} (object)', h => { h.sections.investments.holdings = {}; return h; }, fh => Array.isArray(fh.holdings) ? [] : ['holdings not an array']],
  ['holdings = "oops" (string)', h => { h.sections.investments.holdings = 'oops'; return h; }, fh => Array.isArray(fh.holdings) ? [] : ['holdings not an array']],
  ['holdings = null', h => { h.sections.investments.holdings = null; return h; }, fh => fh.holdings.length === 0 ? [] : ['expected 0 holdings']],
  ['holdings missing', h => { delete h.sections.investments.holdings; return h; }, fh => fh.holdings.length === 0 ? [] : ['expected 0 holdings']],
  ['holdings has null entry', h => { h.sections.investments.holdings = [null, { ticker: 'AAPL', market_value: 5000 }]; return h; }, fh => fh.holdings.length === 1 && fh.holdings[0].ticker === 'AAPL' ? [] : ['expected 1 clean holding, got ' + JSON.stringify(fh.holdings)]],
  ['holdings has string entry', h => { h.sections.investments.holdings = ['VOO', { ticker: 'AAPL', market_value: 5000 }]; return h; }, fh => fh.holdings.length === 1 ? [] : ['expected the string entry dropped, got ' + fh.holdings.length]],
  ['risk_number = "64" (string)', h => { h.sections.investments.portfolio.risk_number = '64'; return h; }, fh => num(fh, 'portfolioNumber') === 64 ? [] : ['expected 64, got ' + num(fh, 'portfolioNumber')]],
  ['risk_number = 150 (over range)', h => { h.sections.investments.portfolio.risk_number = 150; return h; }, fh => (num(fh, 'portfolioNumber') === '' || num(fh, 'portfolioNumber') == null) ? [] : ['expected blank/null for out-of-range, got ' + num(fh, 'portfolioNumber')]],
  ['risk_number = 0', h => { h.sections.investments.portfolio.risk_number = 0; return h; }, fh => (num(fh, 'portfolioNumber') === '' || num(fh, 'portfolioNumber') == null) ? [] : ['expected blank for 0, got ' + num(fh, 'portfolioNumber')]],
  ['risk_number = -5', h => { h.sections.investments.portfolio.risk_number = -5; return h; }, fh => (num(fh, 'portfolioNumber') === '' || num(fh, 'portfolioNumber') == null) ? [] : ['expected blank for -5, got ' + num(fh, 'portfolioNumber')]],
  ['risk_number = true (boolean)', h => { h.sections.investments.portfolio.risk_number = true; return h; }, fh => (num(fh, 'portfolioNumber') === '' || num(fh, 'portfolioNumber') == null) ? [] : ['expected blank for boolean, got ' + num(fh, 'portfolioNumber')]],
  ['risk_number = 64.7 (float)', h => { h.sections.investments.portfolio.risk_number = 64.7; return h; }, fh => num(fh, 'portfolioNumber') === 65 ? [] : ['expected rounded 65, got ' + num(fh, 'portfolioNumber')]],
  ['tolerance = null (import-only)', h => { h.sections.investments.portfolio.risk_tolerance_number = null; return h; }, fh => (num(fh, 'toleranceNumber') === '' || num(fh, 'toleranceNumber') == null) ? [] : ['expected blank tolerance, got ' + num(fh, 'toleranceNumber')]],
  ['market_value = "1,234" (comma str)', h => { h.sections.investments.holdings[0].market_value = '1,234'; return h; }, fh => Number(fh.holdings[0].value) === 1234 ? [] : ['expected 1234 from comma-string, got ' + fh.holdings[0].value]],
  ['market_value = "$100,000"', h => { h.sections.investments.holdings[0].market_value = '$100,000'; return h; }, fh => Number(fh.holdings[0].value) === 100000 ? [] : ['expected 100000 from $-string, got ' + fh.holdings[0].value]],
  ['market_value = null', h => { h.sections.investments.holdings[0].market_value = null; return h; }, fh => (fh.holdings[0].value === '' || fh.holdings[0].value == null) ? [] : ['expected blank value, got ' + fh.holdings[0].value]],
  ['duplicate tickers', h => { h.sections.investments.holdings = [h.sections.investments.holdings[0], JSON.parse(JSON.stringify(h.sections.investments.holdings[0]))]; return h; }, fh => fh.holdings.length === 2 ? [] : ['expected 2, got ' + fh.holdings.length]],
  ['unicode + long name', h => { h.sections.investments.holdings[0].name = 'Ünïcøde ' + 'x'.repeat(300); return h; }, fh => typeof fh.holdings[0].name === 'string' ? [] : ['name not string']],
  ['account_type variants', h => { h.sections.investments.holdings[0].account_type = '401k'; h.sections.investments.holdings[1].account_type = 'HSA(unknown)'; return h; }, fh => fh.holdings[0].accountType === 'traditional' && fh.holdings[1].accountType === 'taxable' ? [] : ['expected traditional + taxable(default), got ' + fh.holdings[0].accountType + '/' + fh.holdings[1].accountType]],
  ['sections = {} ', h => { h.sections = {}; return h; }, fh => Array.isArray(fh.holdings) && fh.holdings.length === 0 ? [] : ['expected empty holdings']],
  ['portfolio missing', h => { delete h.sections.investments.portfolio; return h; }, fh => (num(fh, 'portfolioNumber') === '' || num(fh, 'portfolioNumber') == null) ? [] : ['expected blank portfolioNumber']],
  ['range_6mo_pct = "bad" (string)', h => { h.sections.investments.portfolio.range_6mo_pct = 'bad'; return h; }, fh => (fh.risk.rangeLowPct === '' || fh.risk.rangeLowPct == null) ? [] : ['expected blank range']],
  ['extra unknown keys', h => { h.sections.investments.portfolio.wat = { a: 1 }; h.bogus = [1, 2, 3]; return h; }, fh => num(fh, 'portfolioNumber') === 64 ? [] : ['baseline broke with extra keys']],
  ['tax missing', h => { delete h.sections.tax; return h; }, fh => (fh.tax.income === '' || fh.tax.income == null) ? [] : ['expected blank income']],
  ['gross_income = "250,000"', h => { h.sections.tax.gross_income = '250,000'; return h; }, fh => Number(fh.tax.income) === 250000 ? [] : ['expected 250000 from comma-string, got ' + fh.tax.income]],
];

let pass = 0, fail = 0, crashes = 0;
console.log('HARNESS A — fromHandoff robustness (+ full assessment.run no-throw)');
console.log('-'.repeat(90));
for (const [name, mutate, expect] of C) {
  let fh, err = null, asmErr = null, fails = [];
  try { fh = HARP.nitrogen.fromHandoff(mutate(base())); }
  catch (e) { err = e; }
  if (err) { crashes++; fail++; console.log('CRASH  ✗ ' + name + '  -> fromHandoff threw: ' + err.message); continue; }
  // also confirm the full engine doesn't throw on this ingest
  try { HARP.assessment.run(toProfile(fh)); }
  catch (e) { asmErr = e; }
  fails = expect(fh, err) || [];
  if (asmErr) fails.push('assessment.run threw: ' + asmErr.message);
  if (fails.length) { fail++; console.log('FAIL   ✗ ' + name + '  -> ' + fails.join('; ')); }
  else { pass++; console.log('pass   ✓ ' + name); }
}
console.log('-'.repeat(90));
console.log(`HARNESS A (ingest): ${pass} pass, ${fail} fail (${crashes} crashes) of ${C.length}`);
module.exports = { name: 'ingest', pass, fail, total: C.length };
