'use strict';
// HARNESS B — HARP.risk.analyze edge cases (boundaries, directions, goals, missing/garbage numbers).
const HARP = require('./load');
const cfg = HARP.config;
console.log('config.risk:', JSON.stringify(cfg.risk));
console.log('HARNESS B — risk-alignment engine');
console.log('-'.repeat(96));

function analyze(tol, port, goal, extra) {
  const risk = Object.assign({ toleranceNumber: tol, portfolioNumber: port }, extra || {});
  return HARP.risk.analyze({ goal: goal, risk: risk }, cfg);
}
// each: [name, tol, port, goal, expect{provided,aligned,direction,severity,titleWord}]
const CASES = [
  ['even 50/50', 50, 50, 'growth', { provided: true, aligned: true, direction: 'even', severity: 'ok', word: 'matches' }],
  ['within band 50/60 (gap 10)', 50, 60, 'growth', { provided: true, aligned: true, direction: 'over', severity: 'ok', word: 'matches' }],
  ['just over 50/61 (gap 11)', 50, 61, 'growth', { provided: true, aligned: false, direction: 'over', severity: 'warn', word: 'more risk' }],
  ['at critical 50/70 (gap 20)', 50, 70, 'growth', { provided: true, aligned: false, direction: 'over', severity: 'warn', word: 'more risk' }],
  ['past critical 50/71 (gap 21)', 50, 71, 'growth', { provided: true, aligned: false, direction: 'over', severity: 'risk', word: 'more risk' }],
  ['under band 61/50 (gap -11)', 61, 50, 'growth', { provided: true, aligned: false, direction: 'under', severity: 'warn', word: 'less risk' }],
  ['under crit GROWTH 75/50', 75, 50, 'growth', { provided: true, aligned: false, direction: 'under', severity: 'risk', word: 'less risk' }],
  ['under crit INCOME 75/50', 75, 50, 'income', { provided: true, aligned: false, direction: 'under', severity: 'warn', word: 'less risk' }],
  ['extreme over 1/99', 1, 99, 'growth', { provided: true, aligned: false, direction: 'over', severity: 'risk', word: 'more risk' }],
  ['extreme under 99/1 growth', 99, 1, 'growth', { provided: true, aligned: false, direction: 'under', severity: 'risk', word: 'less risk' }],
  ['portfolio missing', 50, '', 'growth', { provided: false }],
  ['tolerance missing', '', 60, 'growth', { provided: false }],
  ['both missing', '', '', 'growth', { provided: false }],
  ['string numbers "50"/"60"', '50', '60', 'growth', { provided: true, aligned: true, direction: 'over', severity: 'ok', word: 'matches' }],
  ['NaN portfolio', 50, NaN, 'growth', { provided: false }],
  ['no goal set (default) under crit', 75, 50, undefined, { provided: true, aligned: false, direction: 'under', severity: 'risk', word: 'less risk' }],
];

let pass = 0, fail = 0;
for (const [name, tol, port, goal, ex] of CASES) {
  let r, err = null, fails = [];
  try { r = analyze(tol, port, goal, { rangeLowPct: -13.38, rangeHighPct: 25.42 }); }
  catch (e) { err = e; }
  if (err) { fail++; console.log('CRASH  ✗ ' + name + ' -> ' + err.message); continue; }
  if (r.provided !== ex.provided) fails.push('provided ' + r.provided + '≠' + ex.provided);
  if (ex.provided) {
    if (r.aligned !== ex.aligned) fails.push('aligned ' + r.aligned + '≠' + ex.aligned);
    if (r.direction !== ex.direction) fails.push('direction ' + r.direction + '≠' + ex.direction);
    const sev = (r.findings[0] || {}).severity, title = (r.findings[0] || {}).title || '';
    if (sev !== ex.severity) fails.push('severity ' + sev + '≠' + ex.severity);
    if (ex.word && title.toLowerCase().indexOf(ex.word) < 0) fails.push('title missing "' + ex.word + '" (got "' + title + '")');
    // range clause should appear whenever a finding is emitted and a range is present
    if (r.findings.length && (r.findings[0].detail || '').indexOf('Nitrogen projects') < 0) fails.push('range clause missing from detail');
  } else {
    if (r.findings.length !== 0) fails.push('expected no findings when not provided, got ' + r.findings.length);
  }
  if (fails.length) { fail++; console.log('FAIL   ✗ ' + name + ' -> ' + fails.join('; ')); }
  else { pass++; console.log('pass   ✓ ' + name + '  [gap ' + r.gap + ', ' + (r.findings[0] ? r.findings[0].severity : '—') + ']'); }
}
console.log('-'.repeat(96));
console.log(`HARNESS B (risk): ${pass} pass, ${fail} fail of ${CASES.length}`);
module.exports = { name: 'risk', pass, fail, total: CASES.length };
