// Insurance adequacy. Inputs (profile.insurance): hasPolicies, totalFaceValue (payout), policyAgeYears.
// Up to three findings, each its own so the category rubric can count criticals/moderates: payout vs
// liabilities, payout vs future income (income x years to retirement), and policy age. The Insurance
// CATEGORY score comes from a (C criticals, M moderates) rubric in config and is returned as
// `categoryScore` (assessment.js uses it instead of the generic scoring). Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.insurance = (function () {
  var m = function (n) { return HARP.util.money(n); };

  // Kept for any caller still referencing it (the policy-type multi-select was removed from the UI).
  var POLICY_TYPES = [
    { key: 'life',       label: 'Life' },
    { key: 'disability', label: 'Disability' },
    { key: 'property',   label: 'Homeowners / property' },
    { key: 'umbrella',   label: 'Umbrella liability' }
  ];

  function num(v, dflt) { return v != null ? v : dflt; }

  // Total assets for the estate asset-protection threshold (used by the legal module).
  function estimatedAssets(profile) {
    var explicit = Number(profile.assets) || 0;
    if (explicit > 0) return explicit;
    var ins = profile.insurance || {};
    return (Number(profile.taxable) || 0) + (Number(profile.taxDeferred) || 0) +
           (Number(profile.taxFree) || 0) + (Number(ins.homeValue) || 0);
  }

  // Remaining working years: explicit if given, else derived from age (retire at cfg.retirementAge, ~65).
  function yearsToRetirement(profile, cfg) {
    var icfg = (cfg && cfg.insurance) || {};
    var explicit = Number(profile.yearsToRetirement);
    if (explicit > 0) return explicit;
    var age = Number(profile.age);
    if (age > 0) return Math.max(0, (Number(cfg && cfg.retirementAge) || 65) - age);
    return Number(icfg.defaultYearsToRetirement) || 0;
  }
  // Future income the household would lose: income x remaining working years (simple, undiscounted).
  function futureIncome(profile, cfg) {
    var income = Number(profile.income) || 0;
    var years = yearsToRetirement(profile, cfg);
    return income > 0 && years > 0 ? income * years : 0;
  }

  // payout vs a need: risk if it covers < band of the need, warn if short but above that, null if covered/NA.
  function coverageFinding(payout, need, band, label) {
    if (need <= 0 || payout >= need) return null;
    var ratio = payout / need, sig = ratio < band;
    return {
      category: 'Insurance',
      severity: sig ? 'risk' : 'warn',
      title: (sig ? 'Significantly underinsured' : 'Underinsured') + ' vs ' + label,
      detail: 'Total face value of ' + m(payout) + ' covers only ' + Math.round(ratio * 100) + '% of ' + label +
        ' (about ' + m(need) + ') — a shortfall of about ' + m(need - payout) + '. ' + (sig
          ? 'A serious gap; increasing coverage should be a priority.'
          : 'Consider increasing coverage to close the gap.')
    };
  }

  // Insurance CATEGORY score from the (criticals C, moderates M) rubric in config.
  function rubricScore(C, M, bands) {
    if (C >= 2) return num(bands.c2, 25);
    if (C === 1) return M >= 1 ? num(bands.c1m1, 50) : num(bands.c1, 65);
    return M >= 2 ? num(bands.m2, 65) : M === 1 ? num(bands.m1, 85) : num(bands.ok, 100);
  }

  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var ins = profile.insurance || {};
    var icfg = cfg.insurance || {};
    var band = Number(icfg.significantShortfallBand) || 0.5;
    var ageMod = Number(icfg.policyAgeModerateYears) || 7;
    var ageCrit = Number(icfg.policyAgeCriticalYears) || 10;
    var bands = icfg.categoryScore || {};

    var liabilities = Number(profile.liabilities) || 0;
    var future = futureIncome(profile, cfg);
    var hasPolicies = !!ins.hasPolicies;
    var payout = hasPolicies ? (Number(ins.totalFaceValue) || 0) : 0;
    var ageRaw = ins.policyAgeYears;
    var ageYears = (ageRaw === '' || ageRaw == null || isNaN(Number(ageRaw))) ? null : Number(ageRaw);

    var findings = [];

    // Business/entity owner without an umbrella liability policy — a moderate gap. Assessed regardless of
    // whether a personal policy is on record (so it still shows for a no-coverage household).
    if (ins.hasBusiness && !ins.hasUmbrella) {
      findings.push({ category: 'Insurance', severity: 'warn',
        title: 'Business owner without an umbrella policy',
        detail: 'The household owns a business or entity but has no umbrella liability policy. Umbrella ' +
          'coverage protects personal and business assets from liability claims that exceed standard policy ' +
          'limits — worth putting in place.' });
    }

    // No policy on record => the rubric scores this `none` (15) directly, regardless of finding counts.
    if (!hasPolicies) {
      findings.push({ category: 'Insurance', severity: 'risk', title: 'No insurance coverage on record',
        detail: 'No insurance policy is on record. With liabilities, future income, or dependents to protect, ' +
          'putting coverage in place is a priority.' });
      return { hasPolicies: false, payout: 0, liabilities: liabilities, futureIncome: future,
        policyAgeYears: ageYears, findings: findings, categoryScore: num(bands.none, 15) };
    }

    // payout vs liabilities, and payout vs future income — each its own finding.
    var fl = coverageFinding(payout, liabilities, band, 'liabilities');
    if (fl) findings.push(fl);
    var ff = coverageFinding(payout, future, band, 'future income');
    if (ff) findings.push(ff);

    // Policy age: issued / last reviewed a long time ago.
    if (ageYears != null && ageYears >= ageMod) {
      var aged = ageYears >= ageCrit;
      findings.push({ category: 'Insurance', severity: aged ? 'risk' : 'warn',
        title: aged ? 'Policy is significantly out of date' : 'Policy may be out of date',
        detail: 'The policy was issued or last reviewed about ' + ageYears + ' years ago. ' + (aged
          ? 'Coverage this old often no longer matches needs, beneficiaries, or pricing — review as a priority.'
          : 'Worth reviewing to confirm coverage and pricing are still appropriate.') });
    }

    var C = 0, M = 0;
    findings.forEach(function (f) { if (f.severity === 'risk') C++; else if (f.severity === 'warn') M++; });

    return {
      hasPolicies: true, payout: payout, liabilities: liabilities, futureIncome: future,
      policyAgeYears: ageYears, findings: findings, categoryScore: rubricScore(C, M, bands)
    };
  }

  return { analyze: analyze, estimatedAssets: estimatedAssets, futureIncome: futureIncome, POLICY_TYPES: POLICY_TYPES };
})();
