// 1040 / accounting inputs. Provides income & dependents to the other engines and surfaces a couple of
// light tax observations (effective rate; high earner on only the standard deduction). Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.accounting = (function () {
  var m = function (n) { return HARP.util.money(n); };

  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var acfg = cfg.accounting || {};
    var findings = [];

    var income = Number(profile.income) || 0;
    var agi = Number(profile.agi) || 0;
    var totalTax = Number(profile.totalTax) || 0;
    var dependents = Number(profile.dependents) || 0;
    var filingStatus = profile.filingStatus || '';
    var businessIncome = Number(profile.businessIncome) || 0; // from a scanned return (Phase 2); 0 until then
    var standardDeduction = (acfg.standardDeductions || {})[filingStatus] || 0;

    var effectiveTaxRate = (income > 0 && totalTax > 0) ? (totalTax / income) * 100 : null;

    if (effectiveTaxRate != null) {
      var high = effectiveTaxRate > acfg.highEffectiveRatePct;
      findings.push({
        category: 'Accounting / tax',
        severity: high ? 'warn' : 'info',
        title: 'Effective tax rate is about ' + effectiveTaxRate.toFixed(1) + '%',
        detail: high
          ? 'A relatively high effective rate. Worth reviewing tax-efficiency strategies — asset ' +
            'location, tax-loss harvesting, Roth conversions, or deduction planning.'
          : 'Shown for reference, based on total tax over gross income.'
      });
    }

    // High earner who appears to take only the standard deduction — possible missed tax savings. Inferred
    // from deductions-to-AGI (income - agi) being no more than the standard deduction. Business income escalates.
    if (standardDeduction > 0 && income >= (acfg.highIncomeThreshold || Infinity) &&
        agi > 0 && (income - agi) <= standardDeduction) {
      var hasBusiness = businessIncome > 0;
      findings.push({
        category: 'Accounting / tax',
        severity: hasBusiness ? 'risk' : 'warn',
        title: hasBusiness ? 'Business income but only the standard deduction' : 'High income on only the standard deduction',
        detail: 'Gross income of ' + m(income) + ' but it looks like only the ' + filingStatus + ' standard deduction (' +
          m(standardDeduction) + ') is being used. ' + (hasBusiness
            ? 'With business income on the return, relying on the standard deduction likely leaves significant deductions unclaimed — our accounting team should review.'
            : 'A high earner on just the standard deduction may be missing tax savings — worth a review with our accounting team.')
      });
    }

    return {
      income: income,
      agi: agi,
      totalTax: totalTax,
      dependents: dependents,
      filingStatus: filingStatus,
      effectiveTaxRate: effectiveTaxRate,
      standardDeduction: standardDeduction,
      findings: findings
    };
  }

  return { analyze: analyze };
})();
