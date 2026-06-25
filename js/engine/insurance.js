// Insurance adequacy. The household reports whether they have policies, which types, and the total
// face value; underinsurance is checked two ways — against the economic value of future income
// (human life value) and against liabilities (needs-based). Pure module — no DOM.
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

  // Total assets for the estate asset-protection threshold. Prefers an explicit total when the advisor
  // provides one, else estimates from the account buckets + home value.
  function estimatedAssets(profile) {
    var explicit = Number(profile.assets) || 0;
    if (explicit > 0) return explicit;
    var ins = profile.insurance || {};
    return (Number(profile.taxable) || 0) + (Number(profile.taxDeferred) || 0) +
           (Number(profile.taxFree) || 0) + (Number(ins.homeValue) || 0);
  }

  // Economic value of future income (human life value): present value of level income earned until
  // retirement, discounted at a real rate.
  function economicValueOfIncome(income, years, ratePct) {
    income = Number(income) || 0;
    years = Number(years) || 0;
    if (income <= 0 || years <= 0) return 0;
    var r = (Number(ratePct) || 0) / 100;
    if (r <= 0) return income * years;
    return income * (1 - Math.pow(1 + r, -years)) / r;
  }

  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var ins = profile.insurance || {};
    var icfg = cfg.insurance || {};
    var band = Number(icfg.significantShortfallBand) || 0.5;
    var income = Number(profile.income) || 0;
    var dependents = Number(profile.dependents) || 0;
    var liabilities = Number(profile.liabilities) || 0;
    var findings = [];

    var hasPolicies = !!ins.hasPolicies;
    var policyTypes = (ins.policyTypes || []).slice();
    var face = hasPolicies ? (Number(ins.totalFaceValue) || 0) : 0;

    // Economic value of future income (computed regardless, so callers can display it).
    var imeth = icfg.incomeMethod || {};
    var years = Number(profile.yearsToRetirement) || Number(imeth.defaultYearsToRetirement) || 0;
    var hlv = economicValueOfIncome(income, years, imeth.discountRatePct);

    var result = {
      hasPolicies: hasPolicies, policyTypes: policyTypes, totalFaceValue: face,
      economicValueOfIncome: hlv, liabilities: liabilities, findings: findings
    };

    // No coverage at all, where coverage clearly matters.
    if (!hasPolicies || face <= 0) {
      if (income > 0 || liabilities > 0 || dependents > 0) {
        findings.push({ category: 'Insurance', severity: 'risk', title: 'No insurance coverage on record',
          detail: 'No policies (or zero face value) are recorded, but the household has income, dependents, ' +
            'or liabilities that typically warrant coverage. Review insurance needs.' });
      }
      return result;
    }

    // Method 1 — economic value of future income (human life value).
    if (hlv > 0) {
      if (face >= hlv) {
        findings.push({ category: 'Insurance', severity: 'ok', title: 'Coverage meets future-income value',
          detail: 'Face value of ' + m(face) + ' meets the economic value of about ' + years +
            ' years of future income (about ' + m(hlv) + ').' });
      } else {
        var r1 = face / hlv, sig1 = r1 < band;
        findings.push({ category: 'Insurance', severity: sig1 ? 'risk' : 'warn',
          title: (sig1 ? 'Significantly underinsured' : 'Slightly underinsured') + ' vs future income',
          detail: 'Face value of ' + m(face) + ' covers only ' + Math.round(r1 * 100) + '% of the economic value of ' +
            'future income (about ' + m(hlv) + ', ~' + years + ' years of income) — a shortfall of about ' +
            m(hlv - face) + '. ' + (sig1
              ? 'A material income-replacement gap; raising coverage should be a priority.'
              : 'Consider increasing coverage to better replace future income.') });
      }
    }

    // Method 2 — needs-based (cover the liabilities the household would leave behind).
    if (liabilities > 0) {
      if (face >= liabilities) {
        findings.push({ category: 'Insurance', severity: 'ok', title: 'Coverage covers liabilities',
          detail: 'Face value of ' + m(face) + ' covers the ' + m(liabilities) + ' in total liabilities.' });
      } else {
        var r2 = face / liabilities, sig2 = r2 < band;
        findings.push({ category: 'Insurance', severity: sig2 ? 'risk' : 'warn',
          title: (sig2 ? 'Significantly underinsured' : 'Slightly underinsured') + ' vs liabilities',
          detail: 'Face value of ' + m(face) + ' covers only ' + Math.round(r2 * 100) + '% of ' + m(liabilities) +
            ' in liabilities — a shortfall of about ' + m(liabilities - face) + '. ' + (sig2
              ? 'The household could be left with substantial uncovered debt; raising coverage is a priority.'
              : 'Consider raising coverage so it fully covers outstanding liabilities.') });
      }
    }

    // A life-coverage gap when there are dependents but no life policy is listed.
    if (dependents > 0 && policyTypes.indexOf('life') < 0) {
      findings.push({ category: 'Insurance', severity: 'warn', title: 'No life policy listed despite dependents',
        detail: 'There are dependents but no life policy is among the selected types. Confirm whether life ' +
          'coverage is in place.' });
    }

    return result;
  }

  return { analyze: analyze, estimatedAssets: estimatedAssets, economicValueOfIncome: economicValueOfIncome, POLICY_TYPES: POLICY_TYPES };
})();
