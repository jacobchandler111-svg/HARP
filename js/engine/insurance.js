// Insurance adequacy. v0 covers life insurance: estimate need from income + dependents and
// compare to current coverage to flag under- or over-insurance.
window.HARP = window.HARP || {};

HARP.insurance = (function () {
  // Estimated life-insurance need (simple income-multiple method).
  function lifeNeed(income, dependents, cfg) {
    var ins = cfg.insurance;
    var depAddon = Math.min(ins.maxDependentMultiple, (Number(dependents) || 0) * ins.perDependentMultiple);
    return Math.max(0, (Number(income) || 0) * (ins.baseIncomeMultiple + depAddon));
  }

  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var m = HARP.util.money;
    var findings = [];

    var income = Number(profile.income) || 0;
    var coverage = Number(profile.lifeCoverage) || 0;
    var need = lifeNeed(income, profile.dependents, cfg);
    var result = { need: need, coverage: coverage, gap: need - coverage, status: 'adequate' };

    if (income <= 0) {
      result.status = 'unknown';
      findings.push({
        category: 'Insurance',
        severity: 'info',
        title: 'Income not provided',
        detail: 'Enter annual income to estimate the household’s life-insurance need.'
      });
      return { result: result, findings: findings };
    }

    if (coverage < need * cfg.insurance.underinsuredBand) {
      result.status = 'underinsured';
      findings.push({
        category: 'Insurance',
        severity: 'risk',
        title: 'Potentially underinsured (life)',
        detail: 'Estimated need is about ' + m(need) + ', but current coverage is ' + m(coverage) +
          ' — a gap of about ' + m(need - coverage) + '. Consider increasing coverage.'
      });
    } else if (coverage > need * cfg.insurance.overinsuredBand) {
      result.status = 'overinsured';
      findings.push({
        category: 'Insurance',
        severity: 'warn',
        title: 'Possibly over-insured (life)',
        detail: 'Current coverage (' + m(coverage) + ') is well above the estimated need (about ' +
          m(need) + '). Review whether premiums could be reduced.'
      });
    } else {
      findings.push({
        category: 'Insurance',
        severity: 'ok',
        title: 'Life coverage looks adequate',
        detail: 'Coverage of ' + m(coverage) + ' is in line with the estimated need (about ' + m(need) + ').'
      });
    }

    return { result: result, findings: findings };
  }

  return { analyze: analyze, lifeNeed: lifeNeed };
})();
