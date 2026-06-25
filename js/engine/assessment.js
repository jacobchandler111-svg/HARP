// Orchestrates every engine module into a single assessment, an overall score, and
// per-category sub-scores (used for the dashboard circles on the preview page).
window.HARP = window.HARP || {};

HARP.assessment = (function () {
  // Maps the finding `category` strings each engine emits into the four display domains.
  var CATEGORIES = [
    { key: 'investments', label: 'Investments', match: ['Investment concentration', 'Sector exposure', 'Investment performance'] },
    { key: 'insurance',   label: 'Insurance',   match: ['Insurance'] },
    { key: 'tax',         label: 'Tax',         match: ['Tax diversification', 'Accounting / tax'] },
    { key: 'legal',       label: 'Legal',       match: ['Legal / estate'] }
  ];

  function run(profile) {
    var cfg = HARP.config;

    var accounting = HARP.accounting.analyze(profile, cfg);
    var concentration = HARP.concentration.analyze(profile.holdings || [], cfg);
    var performance = HARP.performance.analyze(profile, cfg);
    var insurance = HARP.insurance.analyze(profile, cfg);
    var tax = HARP.tax.analyze(profile, cfg);
    var legal = HARP.legal.analyze(profile);

    var findings = [].concat(
      accounting.findings, concentration.findings, performance.findings, insurance.findings, tax.findings, legal.findings
    );

    var counts = countSeverities(findings);

    return {
      profile: profile,
      accounting: accounting,
      concentration: concentration,
      performance: performance,
      insurance: insurance,
      tax: tax,
      legal: legal,
      findings: findings,
      counts: counts,
      score: scoreFrom(counts, cfg),
      categories: categoryScores(findings, cfg)
    };
  }

  function countSeverities(findings) {
    var counts = { risk: 0, warn: 0, ok: 0, info: 0 };
    findings.forEach(function (f) { counts[f.severity] = (counts[f.severity] || 0) + 1; });
    return counts;
  }

  function categoryScores(findings, cfg) {
    return CATEGORIES.map(function (c) {
      var own = findings.filter(function (f) { return c.match.indexOf(f.category) >= 0; });
      var counts = countSeverities(own);
      var s = scoreFrom(counts, cfg);
      return { key: c.key, label: c.label, score: s.value, band: s.band, counts: counts };
    });
  }

  // Transparent 0-100 score: start at 100, deduct per finding by severity.
  function scoreFrom(counts, cfg) {
    var value = 100 - (counts.risk * cfg.score.perRisk) - (counts.warn * cfg.score.perWarn);
    value = Math.max(0, Math.min(100, value));
    var band =
      value >= 80 ? 'Healthy' :
      value >= 60 ? 'Some attention needed' :
      value >= 40 ? 'Several gaps' :
                    'Significant gaps';
    return { value: value, band: band };
  }

  return { run: run, CATEGORIES: CATEGORIES };
})();
