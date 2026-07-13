'use strict';
// HARNESS C(node) — adversarial PORTFOLIOS through fromHandoff -> full assessment.run. Hunts for
// division-by-zero / NaN / Infinity leaking into findings or scores, and any engine throw.
const HARP = require('./load');

function handoff(holdings, pf) {
  return {
    schema_version: '1.0', harp_ready: true, client: { name: 'Portfolio Test' },
    sections: {
      investments: { portfolio: Object.assign({ risk_number: 60, risk_tolerance_number: 55 }, pf || {}), holdings: holdings },
      tax: { filing_status: 'single', gross_income: 120000, agi: 110000 }
    }
  };
}
function toProfile(fh) {
  const holdings = (fh.holdings || []).map(h => ({
    ticker: h.ticker, name: h.name, sector: (HARP.sectors && HARP.sectors.lookup(h.ticker)) || '',
    value: h.value, costBasis: h.costBasis, dividendYield: h.dividendYield, accountType: h.accountType
  }));
  const bucket = t => holdings.filter(h => h.accountType === t).reduce((s, h) => s + (Number(h.value) || 0), 0);
  return {
    name: 'Portfolio Test', goal: 'growth', filingStatus: fh.tax.filingStatus,
    income: Number(fh.tax.income) || 0, agi: Number(fh.tax.agi) || 0, totalTax: 0, dependents: 0,
    taxable: bucket('taxable'), taxDeferred: bucket('traditional'), taxFree: bucket('roth'),
    age: '', risk: fh.risk, yearReturnPct: '', fixedIncomeValue: 0, fixedIncomeIncome: 0, monthlyDrawdown: 0,
    portfolioValue: holdings.reduce((s, h) => s + (Number(h.value) || 0), 0), holdings,
    assets: 0, liabilities: 0,
    insurance: { hasPolicies: false, totalFaceValue: 0, policyAgeYears: '' },
    legal: { will: true, poa: true, healthcarePoa: true, trust: true, beneficiaries: true }
  };
}
const H = (t, v, cb, dy, at) => ({ ticker: t, name: t, market_value: v, cost_basis: cb, dividend_yield_pct: dy, account_type: at || 'taxable' });

const CASES = [
  ['all values 0 (total 0)', [H('VOO', 0, 0, 0), H('AAPL', 0, 0, 0)], null],
  ['single holding 100%', [H('AAPL', 500000, 100000, 0.5)], null],
  ['cost basis 0, has value', [H('AAPL', 100000, 0, 0)], null],
  ['negative market value', [H('AAPL', -50000, 20000, 0)], null],
  ['huge values 1e15', [H('AAPL', 1e15, 1e14, 1)], null],
  ['blank values everywhere', [H('AAPL', '', '', ''), H('VOO', '', '', '')], null],
  ['value present, costBasis blank', [H('AAPL', 100000, '', 1)], null],
  ['dividend yield 999', [H('T', 100000, 50000, 999)], null],
  ['all same ticker x5 (dupes)', [H('AAPL', 50000, 10000, 0), H('AAPL', 50000, 10000, 0), H('AAPL', 50000, 10000, 0), H('AAPL', 50000, 10000, 0), H('AAPL', 50000, 10000, 0)], null],
  ['50 holdings', Array.from({ length: 50 }, (_, i) => H('T' + i, 10000 + i, 5000, 1)), null],
  ['NaN-inducing string value', [H('AAPL', 'not-a-number', 'nope', 'x')], null],
  ['one holding, everything null', [{ ticker: 'X' }], null],
  ['costBasis > value (loss)', [H('AAPL', 40000, 90000, 0)], null],
  ['tiny total ($1)', [H('AAPL', 1, 1, 0)], null],
];

function scan(obj) { // find NaN / Infinity anywhere in the assessment output
  const bad = [];
  (function walk(v, p) {
    if (typeof v === 'number' && !isFinite(v)) bad.push(p + '=' + v);
    else if (typeof v === 'string' && /\b(NaN|Infinity|undefined|\$NaN|NaN%)\b/.test(v)) bad.push(p + ' text="' + v.slice(0, 80) + '"');
    else if (v && typeof v === 'object') for (const k in v) walk(v[k], p + '.' + k);
  })(obj, '');
  return bad;
}

let pass = 0, fail = 0;
console.log('HARNESS C(node) — adversarial portfolios -> full assessment');
console.log('-'.repeat(96));
for (const [name, holdings] of CASES) {
  let fh, a, err = null, fails = [];
  try { fh = HARP.nitrogen.fromHandoff(handoff(holdings)); a = HARP.assessment.run(toProfile(fh)); }
  catch (e) { err = e; }
  if (err) { fail++; console.log('CRASH  ✗ ' + name + ' -> ' + err.message); continue; }
  const bad = scan({ findings: a.findings, score: a.score, categories: a.categories });
  if (!isFinite(a.score.value)) fails.push('score not finite: ' + a.score.value);
  if (bad.length) fails.push('NaN/Inf/undefined leaked: ' + bad.slice(0, 4).join(' | '));
  if (fails.length) { fail++; console.log('FAIL   ✗ ' + name + ' -> ' + fails.join('; ')); }
  else { pass++; console.log('pass   ✓ ' + name + '  [score ' + a.score.value + ', ' + a.findings.length + ' findings]'); }
}
console.log('-'.repeat(96));
console.log(`HARNESS C (portfolio): ${pass} pass, ${fail} fail of ${CASES.length}`);
module.exports = { name: 'portfolio', pass, fail, total: CASES.length };
