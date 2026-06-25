// Investment performance. The client's most recent full-year return is compared to a single benchmark:
// the actual annualized S&P 500 return for the recent years (a background constant in config). Trailing
// it is flagged gently. Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.performance = (function () {
  var pct = HARP.util.pct;

  // Primary input is the single most-recent-year return; fall back to legacy fields for older saved profiles.
  function clientFrom(profile) {
    var raw = profile.yearReturnPct;
    if (raw === '' || raw == null || isNaN(Number(raw))) {
      var ar = profile.annualReturns;
      if (ar && ar.length) { var last = ar[ar.length - 1]; raw = last && last.pct; }
      else raw = profile.return3yrPct;
    }
    if (raw === '' || raw == null || isNaN(Number(raw))) return null;
    return Number(raw);
  }

  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var p = cfg.performance || {};
    var benchmarkName = p.benchmarkName || 'S&P 500';
    var benchmark = Number((p.trailing3yr || {}).annualizedPct) || 0;
    var tolerance = Number(p.tolerancePct) || 0;
    var periodLabel = String(new Date().getFullYear() - 1); // most recent full year

    var findings = [];
    var clientReturn = clientFrom(profile);
    var provided = clientReturn != null;

    var result = {
      provided: provided,
      clientReturnPct: clientReturn,
      periodLabel: periodLabel,
      benchmarkName: benchmarkName,
      benchmarkPct: benchmark,
      gapPct: null,
      status: 'unknown',          // unknown | meets | underperform
      findings: findings
    };
    if (!provided) return result;

    var gap = clientReturn - benchmark;
    result.gapPct = gap;

    if (gap < -tolerance) {
      result.status = 'underperform';
      var lead = clientReturn > 0 ? 'The portfolio has been making money, but its ' : 'The ';
      findings.push({ category: 'Investment performance', severity: 'warn',
        title: 'Returns are trailing the S&P 500',
        detail: lead + periodLabel + ' return of ' + pct(clientReturn) + ' trailed the ' + benchmarkName +
          '’s recent performance. There may be room to do better — an area we may be able to help with.' });
    } else {
      result.status = 'meets';
      findings.push({ category: 'Investment performance', severity: 'ok',
        title: periodLabel + ' return kept pace with the market',
        detail: 'At or above the ' + benchmarkName + '’s recent performance.' });
    }

    return result;
  }

  return { analyze: analyze };
})();
