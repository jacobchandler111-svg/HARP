// Orchestrates every engine module into a single assessment, an overall score, and
// per-category sub-scores (used for the dashboard circles on the preview page).
window.HARP = window.HARP || {};

HARP.assessment = (function () {
  // Maps the finding `category` strings each engine emits into the four display domains.
  // Investments is now driven by the Riskalyze data points (alignment / quality / cost), not HARP's
  // own holdings calculators — concentration + embedded-gains were retired (see run() below).
  var CATEGORIES = [
    { key: 'investments', label: 'Investments', match: ['Investment risk alignment', 'Investment quality', 'Investment cost', 'Investment performance', 'Investment income'] },
    { key: 'retirement',  label: 'Retirement',  match: ['Retirement'] },
    { key: 'insurance',   label: 'Insurance',   match: ['Insurance'] },
    { key: 'tax',         label: 'Tax',         match: ['Tax diversification', 'Accounting / tax'] },
    { key: 'legal',       label: 'Legal',       match: ['Legal / estate'] }
  ];

  function run(profile) {
    var cfg = HARP.config;

    var accounting = HARP.accounting.analyze(profile, cfg);
    var concentration = HARP.concentration.analyze(profile.holdings || [], cfg);  // still computed for the report's portfolio-value line; its findings are NOT surfaced (retired)
    var risk = HARP.risk.analyze(profile, cfg);   // Nitrogen risk-alignment + Riskalyze quality/cost signals — the Investments story
    var retirement = HARP.retirement.analyze(profile, cfg);   // retirement readiness projection (from allocation + age + withdrawal)
    var gains = HARP.gains.analyze(profile.holdings || [], cfg);
    var performance = HARP.performance.analyze(profile, cfg);
    var income = HARP.income.analyze(profile, cfg);
    var insurance = HARP.insurance.analyze(profile, cfg);
    var tax = HARP.tax.analyze(profile, cfg);
    var legal = HARP.legal.analyze(profile, cfg);

    // Investments findings come from the Riskalyze-driven risk module only. concentration + embedded-gains
    // (HARP's own holdings calculators) are intentionally EXCLUDED — the portfolio is Riskalyze's job now.
    var findings = [].concat(
      accounting.findings, risk.findings, retirement.findings, performance.findings, income.findings, insurance.findings, tax.findings, legal.findings
    );

    var counts = countSeverities(findings);

    return {
      profile: profile,
      accounting: accounting,
      concentration: concentration,
      risk: risk,
      retirement: retirement,
      gains: gains,
      performance: performance,
      income: income,
      insurance: insurance,
      tax: tax,
      legal: legal,
      findings: findings,
      counts: counts,
      score: scoreFromFindings(findings, cfg),
      categories: categoryScores(findings, cfg, { insurance: insurance.categoryScore })
    };
  }

  function countSeverities(findings) {
    var counts = { risk: 0, warn: 0, ok: 0, info: 0 };
    findings.forEach(function (f) { counts[f.severity] = (counts[f.severity] || 0) + 1; });
    return counts;
  }

  // `overrides` lets a module supply a category's score directly (e.g. insurance's (C,M) rubric), bypassing
  // the generic/diminishing scoring for that category.
  function categoryScores(findings, cfg, overrides) {
    overrides = overrides || {};
    return CATEGORIES.map(function (c) {
      var own = findings.filter(function (f) { return c.match.indexOf(f.category) >= 0; });
      var counts = countSeverities(own);
      var s;
      if (overrides[c.key] != null) {
        s = bandFor(overrides[c.key]);
      } else {
        var scheme = (cfg.categoryScoreScheme || {})[c.key];
        s = scheme ? scoreDiminishing(own, scheme) : scoreFromFindings(own, cfg);
      }
      return { key: c.key, label: c.label, score: s.value, band: s.band, counts: counts };
    });
  }

  // Transparent 0-100 score: start at 100 and deduct per finding by severity. A finding may carry an
  // explicit `weight` to override the default deduction — used where a single issue should move the
  // needle hard (e.g. an insurance gap).
  function scoreFromFindings(findings, cfg) {
    var deduction = 0;
    findings.forEach(function (f) {
      if (f.severity === 'risk') deduction += (f.weight != null ? f.weight : cfg.score.perRisk);
      else if (f.severity === 'warn') deduction += (f.weight != null ? f.weight : cfg.score.perWarn);
    });
    return bandFor(Math.max(0, Math.min(100, 100 - deduction)));
  }
  // Diminishing per-category score: the first critical/moderate costs the most, each additional one less,
  // so a category isn't tanked by piling-on findings (e.g. tax). Severity counts, not per-finding weights.
  function scoreDiminishing(findings, scheme) {
    var crit = 0, mod = 0, d = 0;
    findings.forEach(function (f) {
      if (f.severity === 'risk') { d += (crit === 0 ? scheme.firstCritical : scheme.addlCritical); crit++; }
      else if (f.severity === 'warn') { d += (mod === 0 ? scheme.firstModerate : scheme.addlModerate); mod++; }
    });
    return bandFor(Math.max(0, Math.min(100, 100 - d)));
  }
  function bandFor(value) {
    var band =
      value >= 80 ? 'Healthy' :
      value >= 60 ? 'Some attention needed' :
      value >= 40 ? 'Several gaps' :
                    'Significant gaps';
    return { value: value, band: band };
  }

  return { run: run, CATEGORIES: CATEGORIES };
})();
