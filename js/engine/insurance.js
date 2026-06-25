// Insurance adequacy as a single "insurance gap". The total policy face value (payout) is checked against
// two needs — the household's liabilities, and its future income (income x remaining working years). The
// worse shortfall sets ONE consolidated finding, whose score weight drives the Insurance gauge:
//   no coverage => ~25, significantly underinsured => ~48, underinsured => ~70, covered => ~100.
// Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.insurance = (function () {
  var m = function (n) { return HARP.util.money(n); };

  // Options for the "what policies do you have?" multi-select.
  var POLICY_TYPES = [
    { key: 'life',       label: 'Life' },
    { key: 'disability', label: 'Disability' },
    { key: 'property',   label: 'Homeowners / property' },
    { key: 'umbrella',   label: 'Umbrella liability' }
  ];

  // Total assets for the estate asset-protection threshold (used by the legal module). Prefers an explicit
  // total, else estimates from the account buckets + home value.
  function estimatedAssets(profile) {
    var explicit = Number(profile.assets) || 0;
    if (explicit > 0) return explicit;
    var ins = profile.insurance || {};
    return (Number(profile.taxable) || 0) + (Number(profile.taxDeferred) || 0) +
           (Number(profile.taxFree) || 0) + (Number(ins.homeValue) || 0);
  }

  // Future income the household would lose: income x remaining working years (simple, undiscounted).
  function futureIncome(profile, cfg) {
    var icfg = (cfg && cfg.insurance) || {};
    var income = Number(profile.income) || 0;
    var years = Number(profile.yearsToRetirement) || Number(icfg.defaultYearsToRetirement) || 0;
    return income > 0 && years > 0 ? income * years : 0;
  }

  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var ins = profile.insurance || {};
    var icfg = cfg.insurance || {};
    var band = Number(icfg.significantShortfallBand) || 0.5;
    var w = icfg.gapDeductions || { none: 75, critical: 52, moderate: 30 };

    var dependents = Number(profile.dependents) || 0;
    var liabilities = Number(profile.liabilities) || 0;
    var future = futureIncome(profile, cfg);

    var hasPolicies = !!ins.hasPolicies;
    var policyTypes = (ins.policyTypes || []).slice();
    var payout = hasPolicies ? (Number(ins.totalFaceValue) || 0) : 0;

    var findings = [];
    var result = {
      hasPolicies: hasPolicies, policyTypes: policyTypes, payout: payout,
      liabilities: liabilities, futureIncome: future, gapLevel: 'covered', findings: findings
    };

    var needsCoverage = liabilities > 0 || future > 0 || dependents > 0;

    // No policy at all, where coverage matters => critical insurance gap.
    if (!hasPolicies || payout <= 0) {
      if (!needsCoverage) return result; // nothing to insure against
      result.gapLevel = 'none';
      findings.push({ category: 'Insurance', severity: 'risk', weight: w.none,
        title: 'You are underinsured — no coverage on record',
        detail: 'No insurance policy is recorded, but the household has ' +
          (liabilities > 0 ? m(liabilities) + ' in liabilities and ' : '') + 'future income or dependents to protect. ' +
          'Putting coverage in place is a priority.' });
      return result;
    }

    // Coverage ratios vs each need (Infinity when a need does not apply); the worst drives the result.
    var liabRatio = liabilities > 0 ? payout / liabilities : Infinity;
    var incRatio = future > 0 ? payout / future : Infinity;
    var worst = Math.min(liabRatio, incRatio);

    if (worst >= 1) {
      result.gapLevel = 'covered';
      findings.push({ category: 'Insurance', severity: 'ok',
        title: 'Insurance coverage looks adequate',
        detail: 'Total face value of ' + m(payout) + ' covers both liabilities and future income.' });
      return result;
    }

    var shorts = [];
    if (liabRatio < 1) shorts.push(m(liabilities) + ' in liabilities');
    if (incRatio < 1) shorts.push('about ' + m(future) + ' of future income');
    var critical = worst <= band; // need is at least ~2x the payout on some axis
    result.gapLevel = critical ? 'critical' : 'moderate';

    findings.push({
      category: 'Insurance',
      severity: critical ? 'risk' : 'warn',
      weight: critical ? w.critical : w.moderate,
      title: critical ? 'You are significantly underinsured' : 'You are underinsured',
      detail: 'Total face value of ' + m(payout) + ' falls short of ' + shorts.join(' and ') + '. ' + (critical
        ? 'Coverage is less than half of the need — a serious gap. Increasing coverage should be a priority.'
        : 'Coverage falls short but covers more than half the need. Consider increasing it to close the gap.')
    });

    return result;
  }

  return { analyze: analyze, estimatedAssets: estimatedAssets, futureIncome: futureIncome, POLICY_TYPES: POLICY_TYPES };
})();
