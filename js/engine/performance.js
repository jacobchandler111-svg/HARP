// Investment performance. The client's most recent full-year return is compared to TWO benchmarks: a
// fixed long-run market assumption, and the actual annualized S&P 500 return for the last 3 years (a
// background constant in config). Underperforming EITHER flags it. Pure module — no DOM.
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
    var assumed = Number(p.assumedMarketReturnPct) || 0;
    var t3cfg = p.trailing3yr || {};
    var trailing3yr = Number(t3cfg.annualizedPct) || 0;
    var trailing3yrYears = t3cfg.years || '';
    var tolerance = Number(p.tolerancePct) || 0;
    var severe = Number(p.severeGapPct) || 0;
    var periodLabel = String(new Date().getFullYear() - 1); // most recent full year

    var findings = [];
    var clientReturn = clientFrom(profile);
    var provided = clientReturn != null;

    var result = {
      provided: provided,
      clientReturnPct: clientReturn,
      periodLabel: periodLabel,
      benchmarkName: benchmarkName,
      assumedMarketPct: assumed,
      trailing3yrPct: trailing3yr,
      trailing3yrYears: trailing3yrYears,
      gapAssumedPct: null,
      gap3yrPct: null,
      status: 'unknown',            // unknown | meets | underperform
      findings: findings
    };
    if (!provided) return result;

    var gapAssumed = clientReturn - assumed;   // negative => below the assumed market
    var gap3yr = clientReturn - trailing3yr;   // negative => below the 3-year annualized
    result.gapAssumedPct = gapAssumed;
    result.gap3yrPct = gap3yr;

    var belowAssumed = gapAssumed < -tolerance;
    var below3yr = gap3yr < -tolerance;

    if (!belowAssumed && !below3yr) {
      result.status = 'meets';
      findings.push({ category: 'Investment performance', severity: 'ok',
        title: periodLabel + ' return of ' + pct(clientReturn) + ' matched or beat the market',
        detail: 'At or above both the assumed ' + pct(assumed) + ' market return and the ' + benchmarkName + ' ' +
          trailing3yrYears + ' annualized return of ' + pct(trailing3yr) + '.' });
      return result;
    }

    result.status = 'underperform';
    // Severity is driven by how far below the assumed long-run market the client is; trailing only the
    // (exceptionally high) 3-year figure is a moderate "could be doing better".
    var severity = gapAssumed <= -severe ? 'risk' : 'warn';

    var bits = [];
    if (belowAssumed) bits.push('the assumed ' + pct(assumed) + ' market return (by ' + pct(Math.abs(gapAssumed)) + ')');
    if (below3yr) bits.push('the ' + benchmarkName + ' ' + trailing3yrYears + ' annualized ' + pct(trailing3yr) +
      ' (by ' + pct(Math.abs(gap3yr)) + ')');

    findings.push({
      category: 'Investment performance',
      severity: severity,
      title: periodLabel + ' return of ' + pct(clientReturn) + ' trails the market',
      detail: 'The portfolio is below ' + bits.join(' and ') + '. ' + (severity === 'risk'
        ? 'A sizable shortfall versus a normal market year — review fees, cash drag, and security selection, and consider lower-cost index exposure.'
        : 'There was room to do better — review whether fees, cash drag, or security selection are holding returns back.')
    });

    return result;
  }

  return { analyze: analyze };
})();
