// Insurance adequacy across policy types: life, disability, property (homeowners), umbrella.
// Evaluates the policies a household HAS and flags recommended coverage they are MISSING.
// Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.insurance = (function () {
  var m = function (n) { return HARP.util.money(n); };

  function lifeNeed(income, dependents, life) {
    var depAddon = Math.min(life.maxDependentMultiple, (Number(dependents) || 0) * life.perDependentMultiple);
    return Math.max(0, (Number(income) || 0) * (life.baseIncomeMultiple + depAddon));
  }

  // Total assets for umbrella sizing and the estate asset-protection threshold. Prefers an explicit
  // total when the advisor provides one, else estimates from the account buckets + home value.
  function estimatedAssets(profile) {
    var explicit = Number(profile.assets) || 0;
    if (explicit > 0) return explicit;
    var ins = profile.insurance || {};
    return (Number(profile.taxable) || 0) + (Number(profile.taxDeferred) || 0) +
           (Number(profile.taxFree) || 0) + (Number(ins.homeValue) || 0);
  }

  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var ins = profile.insurance || {};
    var income = Number(profile.income) || 0;
    var dependents = Number(profile.dependents) || 0;
    var findings = [];
    var policies = [];

    // ---- Life ----
    (function () {
      var p = ins.life || {};
      var need = lifeNeed(income, dependents, cfg.insurance.life);
      var coverage = Number(p.coverage) || 0;
      var row = { type: 'life', label: 'Life', has: !!p.has, recommended: need, coverage: coverage, gap: need - coverage, status: 'adequate' };

      if (!p.has) {
        if (dependents > 0 || income > 0) {
          row.status = 'missing';
          findings.push({ category: 'Insurance', severity: dependents > 0 ? 'risk' : 'warn',
            title: 'No life insurance on record',
            detail: 'Estimated need is about ' + m(need) +
              (dependents > 0 ? ', and there are dependents who rely on this income.' : '.') + ' Consider coverage.' });
        }
      } else if (income <= 0) {
        row.status = 'unknown';
        findings.push({ category: 'Insurance', severity: 'info', title: 'Income needed to assess life coverage',
          detail: 'Enter income in the 1040 / Accounting section to estimate life-insurance need.' });
      } else if (coverage < need * cfg.insurance.life.underinsuredBand) {
        row.status = 'underinsured';
        findings.push({ category: 'Insurance', severity: 'risk', title: 'Potentially underinsured (life)',
          detail: 'Estimated need is about ' + m(need) + ', but coverage is ' + m(coverage) +
            ' — a gap of about ' + m(need - coverage) + '. Consider increasing coverage.' });
      } else if (coverage > need * cfg.insurance.life.overinsuredBand) {
        row.status = 'overinsured';
        findings.push({ category: 'Insurance', severity: 'warn', title: 'Possibly over-insured (life)',
          detail: 'Coverage (' + m(coverage) + ') is well above the estimated need (about ' + m(need) +
            '). Review whether premiums could be reduced.' });
      } else {
        findings.push({ category: 'Insurance', severity: 'ok', title: 'Life coverage looks adequate',
          detail: 'Coverage of ' + m(coverage) + ' is in line with the estimated need (about ' + m(need) + ').' });
      }
      policies.push(row);
    })();

    // ---- Liabilities covered by life face amount (sliding scale) ----
    (function () {
      var liabilities = Number(profile.liabilities) || 0;
      if (liabilities <= 0) return; // nothing to assess without a liabilities figure
      var face = (ins.life && ins.life.has) ? (Number(ins.life.coverage) || 0) : 0;
      if (face >= liabilities) {
        findings.push({ category: 'Insurance', severity: 'ok', title: 'Liabilities are covered by life coverage',
          detail: 'Life face amount of ' + m(face) + ' covers the ' + m(liabilities) + ' in total liabilities.' });
        return;
      }
      var ratio = face / liabilities;
      var shortfall = liabilities - face;
      var band = (cfg.insurance.liabilityCoverage && cfg.insurance.liabilityCoverage.significantShortfallBand) || 0.5;
      var significant = ratio < band;
      findings.push({
        category: 'Insurance',
        severity: significant ? 'risk' : 'warn',
        title: (significant ? 'Significantly underinsured' : 'Slightly underinsured') + ' — liabilities exceed life coverage',
        detail: 'Life face amount of ' + m(face) + ' covers only ' + Math.round(ratio * 100) + '% of ' + m(liabilities) +
          ' in liabilities — a shortfall of about ' + m(shortfall) + '. ' +
          (significant
            ? 'If the insured died today, the household could be left with substantial uncovered debt. Raising coverage to at least cover liabilities is a priority.'
            : 'Consider raising coverage so the face amount fully covers outstanding liabilities.')
      });
    })();

    // ---- Disability (only relevant with earned income) ----
    (function () {
      var p = ins.disability || {};
      var employed = ins.employed !== false; // default true unless explicitly set false
      if (!employed || income <= 0) return;
      var neededMonthly = income * (cfg.insurance.disability.targetReplacementPct / 100) / 12;
      var benefit = Number(p.monthlyBenefit) || 0;
      var row = { type: 'disability', label: 'Disability', has: !!p.has, recommendedMonthly: neededMonthly, monthlyBenefit: benefit, status: 'adequate' };

      if (!p.has) {
        row.status = 'missing';
        findings.push({ category: 'Insurance', severity: 'warn', title: 'No disability insurance on record',
          detail: 'Earned income is exposed. A benefit replacing about ' + cfg.insurance.disability.targetReplacementPct +
            '% of income (~' + m(neededMonthly) + '/mo) is a common target.' });
      } else if (benefit < neededMonthly * cfg.insurance.disability.underinsuredBand) {
        row.status = 'underinsured';
        findings.push({ category: 'Insurance', severity: 'warn', title: 'Disability benefit may be low',
          detail: 'Monthly benefit (' + m(benefit) + ') is below the ~' + m(neededMonthly) + '/mo target (' +
            cfg.insurance.disability.targetReplacementPct + '% of income).' });
      } else {
        findings.push({ category: 'Insurance', severity: 'ok', title: 'Disability coverage looks adequate',
          detail: 'Monthly benefit of ' + m(benefit) + ' meets the ~' + m(neededMonthly) + '/mo target.' });
      }
      policies.push(row);
    })();

    // ---- Property / homeowners (only if a home is owned) ----
    (function () {
      var p = ins.property || {};
      if (!ins.ownsHome) return;
      var homeValue = Number(ins.homeValue) || 0;
      var recommended = homeValue * cfg.insurance.property.dwellingCoverageBand;
      var coverage = Number(p.dwellingCoverage) || 0;
      var row = { type: 'property', label: 'Homeowners / property', has: !!p.has, recommended: recommended, coverage: coverage, status: 'adequate' };

      if (!p.has) {
        row.status = 'missing';
        findings.push({ category: 'Insurance', severity: 'risk', title: 'No homeowners / property insurance on record',
          detail: 'A home is owned but no property policy is recorded. Dwelling coverage of at least about ' +
            m(recommended) + ' is typical.' });
      } else if (homeValue > 0 && coverage < recommended) {
        row.status = 'underinsured';
        findings.push({ category: 'Insurance', severity: 'warn', title: 'Dwelling coverage may be low',
          detail: 'Coverage (' + m(coverage) + ') is below about ' + m(recommended) + ' (' +
            Math.round(cfg.insurance.property.dwellingCoverageBand * 100) + '% of home value).' });
      } else {
        findings.push({ category: 'Insurance', severity: 'ok', title: 'Property coverage looks adequate',
          detail: 'Dwelling coverage of ' + m(coverage) + ' looks reasonable for the home value provided.' });
      }
      policies.push(row);
    })();

    // ---- Umbrella (only once assets are meaningful) ----
    (function () {
      var p = ins.umbrella || {};
      var assets = estimatedAssets(profile);
      if (assets < cfg.insurance.umbrella.recommendAboveAssets) return;
      var recommended = assets * cfg.insurance.umbrella.minCoverageBand;
      var coverage = Number(p.coverage) || 0;
      var row = { type: 'umbrella', label: 'Umbrella liability', has: !!p.has, recommended: recommended, coverage: coverage, status: 'adequate' };

      if (!p.has) {
        row.status = 'missing';
        findings.push({ category: 'Insurance', severity: 'warn', title: 'No umbrella liability coverage on record',
          detail: 'Estimated assets of about ' + m(assets) + ' may warrant umbrella coverage of about ' +
            m(recommended) + ' to protect against liability claims.' });
      } else if (coverage < recommended) {
        row.status = 'underinsured';
        findings.push({ category: 'Insurance', severity: 'warn', title: 'Umbrella coverage may be low',
          detail: 'Coverage (' + m(coverage) + ') is below the ~' + m(recommended) + ' suggested by estimated assets.' });
      } else {
        findings.push({ category: 'Insurance', severity: 'ok', title: 'Umbrella coverage looks adequate',
          detail: 'Umbrella coverage of ' + m(coverage) + ' is in line with estimated assets.' });
      }
      policies.push(row);
    })();

    return { policies: policies, findings: findings };
  }

  return { analyze: analyze, lifeNeed: lifeNeed, estimatedAssets: estimatedAssets };
})();
