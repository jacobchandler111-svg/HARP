// 1040 / accounting inputs. Provides income & dependents to other engines and surfaces light tax
// observations (effective rate; and a high earner on only the standard deduction, where the severity
// scales with the AGI's federal tax bracket). No taxes are calculated. Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.accounting = (function () {
  var m = function (n) { return HARP.util.money(n); };

  // Marginal federal bracket the AGI falls into (rate %), from the config table; null if unknown.
  // (Read off AGI per product direction — no tax is calculated.)
  function marginalBracket(agi, filingStatus, acfg) {
    var table = (acfg.taxBrackets || {})[filingStatus];
    if (!table || !(agi > 0)) return null;
    var rate = table[0][1];
    for (var i = 0; i < table.length; i++) {
      if (agi >= table[i][0]) rate = table[i][1];
      else break;
    }
    return rate;
  }

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
    var bracket = marginalBracket(agi, filingStatus, acfg);

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

    // A higher earner (by federal bracket on AGI) is worth a tax-planning review — severity scales with the
    // bracket: top brackets => critical, otherwise moderate. The standard-deduction observation
    // (income - agi <= standard) is added as context, NOT a gate, so high earners always surface.
    if (bracket != null && bracket >= (acfg.bracketModerateMin || 24)) {
      var critical = bracket >= (acfg.bracketCriticalMin || 35) || businessIncome > 0;
      var onlyStandard = standardDeduction > 0 && agi > 0 && (income - agi) <= standardDeduction;
      findings.push({
        category: 'Accounting / tax',
        severity: critical ? 'risk' : 'warn',
        title: critical ? 'High income — a tax-strategy review is recommended' : 'Higher earner — tax planning may help',
        detail: 'AGI of ' + m(agi) + ' falls in the ' + bracket + '% federal bracket (' + filingStatus + '). ' +
          (critical
            ? 'At this income, a proactive tax-strategy overview — deductions, retirement / entity structuring, charitable planning — is well worth a look with our team.'
            : 'As a higher earner, a review with our tax team could surface deductions or other planning opportunities.') +
          (onlyStandard ? ' It also looks like only the standard deduction (' + m(standardDeduction) + ') is being used.' : '') +
          (businessIncome > 0 ? ' Business income on the return makes unclaimed deductions especially likely.' : '')
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
      taxBracket: bracket,
      findings: findings
    };
  }

  return { analyze: analyze };
})();
