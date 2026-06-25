// 1040 / accounting inputs. Provides income & dependents to the other engines and surfaces a
// light tax-efficiency observation. Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.accounting = (function () {
  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var findings = [];

    var income = Number(profile.income) || 0;
    var agi = Number(profile.agi) || 0;
    var totalTax = Number(profile.totalTax) || 0;
    var dependents = Number(profile.dependents) || 0;
    var filingStatus = profile.filingStatus || '';

    var effectiveTaxRate = (income > 0 && totalTax > 0) ? (totalTax / income) * 100 : null;

    if (effectiveTaxRate != null) {
      var high = effectiveTaxRate > cfg.accounting.highEffectiveRatePct;
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

    return {
      income: income,
      agi: agi,
      totalTax: totalTax,
      dependents: dependents,
      filingStatus: filingStatus,
      effectiveTaxRate: effectiveTaxRate,
      findings: findings
    };
  }

  return { analyze: analyze };
})();
