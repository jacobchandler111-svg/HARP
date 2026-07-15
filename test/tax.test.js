'use strict';
// Tax engine — calculator-driven scoring + gap-tolerance. Run: node test/tax.test.js
const HARP = require('./load.js');
let pass = 0, fail = 0;
function ok(name, cond, extra) { (cond ? pass++ : fail++); console.log((cond ? 'pass  ✓ ' : 'FAIL  ✗ ') + name + (extra ? '  [' + extra + ']' : '')); }

// Tim: current 129,109; after 25,754; savings 103,355 -> ratio ~0.80 -> big gap, low score.
const timTax = HARP.nitrogen.fromTaxHandoff({
  sections: { tax: {
    filing_status: 'Married Filing Jointly', state: 'GA', gross_income: 535000, agi: 535000,
    taxable_income: 502800, marginal_bracket_pct: 32, effective_rate_pct: 24.1,
    current_projected_tax: 129109, tax_after_strategies: 25754, total_annual_savings: 103355,
    effective_rate_after_pct: 4.8, roi_multiple: 18.5,
    strategies: [
      { code: 'T2', name: 'Backdoor Roth IRA', net_annual_savings: 71469, status: 'interested' },
      { code: 'C5', name: 'Qualified Opportunity Zone (QOZ)', net_annual_savings: 26300, status: 'interested' }
    ]
  } }
});
ok('fromTaxHandoff carries the plan', !!timTax.plan && timTax.plan.currentTax === 129109 && timTax.plan.strategies.length === 2);
ok('normalizes filing status', timTax.filingStatus === 'Married filing jointly', timTax.filingStatus);

const tim = HARP.tax.analyze({ taxPlan: timTax.plan });
ok('Tim: hasPlan', tim.hasPlan === true);
ok('Tim: big savings -> risk headline', tim.findings.some(f => f.severity === 'risk' && /unclaimed/.test(f.title)));
ok('Tim: marginal-bracket note', tim.findings.some(f => f.severity === 'info' && /marginal bracket/.test(f.title)));
ok('Tim: low category score (overpaying)', tim.categoryScore < 50, 'score ' + tim.categoryScore);

// Efficient client: tiny savings -> healthy score, no risk finding.
const eff = HARP.tax.analyze({ taxPlan: { currentTax: 40000, afterTax: 38500, savings: 1500, effectiveRatePct: 12, effectiveRateAfterPct: 11.6, marginalPct: 22, strategies: [] } });
ok('Efficient: high score', eff.categoryScore >= 90, 'score ' + eff.categoryScore);
ok('Efficient: no critical finding', !eff.findings.some(f => f.severity === 'risk'));

// Moderate opportunity: ~18% reducible -> warn, mid score.
const mod = HARP.tax.analyze({ taxPlan: { currentTax: 100000, afterTax: 82000, savings: 18000, effectiveRatePct: 20, strategies: [] } });
ok('Moderate: warn headline', mod.findings.some(f => f.severity === 'warn'), 'score ' + mod.categoryScore);

// Gap-tolerance: no plan at all -> not assessed, no false score.
const none = HARP.tax.analyze({});
ok('No plan: hasPlan false', none.hasPlan === false);
ok('No plan: categoryScore null (gap)', none.categoryScore === null);
ok('No plan: no findings', none.findings.length === 0);

// Full assessment wiring: Tim's plan drives the tax category dial + surfaces the tax finding.
const asmt = HARP.assessment.run({ taxPlan: timTax.plan, holdings: [], insurance: {}, legal: {} });
const taxCat = asmt.categories.find(c => c.key === 'tax');
ok('assessment: tax category scored from plan', taxCat && taxCat.score === tim.categoryScore, 'cat ' + (taxCat && taxCat.score));
ok('assessment: tax finding present in findings', asmt.findings.some(f => f.category === 'Tax planning'));
ok('assessment: accounting findings NOT surfaced (retired)', !asmt.findings.some(f => f.category === 'Accounting / tax'));

console.log('-'.repeat(96));
console.log('HARNESS D (tax): ' + pass + ' pass, ' + fail + ' fail of ' + (pass + fail));
module.exports = { name: 'tax', pass, fail, total: pass + fail };
if (require.main === module) process.exit(fail ? 1 : 0);
