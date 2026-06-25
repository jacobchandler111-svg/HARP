// Orchestrates every engine module into a single assessment + overall score.
window.HARP = window.HARP || {};

HARP.assessment = (function () {
  function run(profile) {
    var cfg = HARP.config;

    var concentration = HARP.concentration.analyze(profile.holdings || [], cfg);
    var insurance = HARP.insurance.analyze(profile, cfg);
    var tax = HARP.tax.analyze(profile, cfg);
    var legal = HARP.legal.analyze(profile);

    var findings = [].concat(
      concentration.findings,
      insurance.findings,
      tax.findings,
      legal.findings
    );

    var counts = { risk: 0, warn: 0, ok: 0, info: 0 };
    findings.forEach(function (f) { counts[f.severity] = (counts[f.severity] || 0) + 1; });

    return {
      profile: profile,
      concentration: concentration,
      insurance: insurance,
      tax: tax,
      legal: legal,
      findings: findings,
      counts: counts,
      score: scoreFrom(counts, cfg)
    };
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

  return { run: run };
})();
