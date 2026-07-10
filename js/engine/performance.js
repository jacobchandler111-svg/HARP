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
    // Only judged for a growth goal (income households are handled by the income module).
    if (profile.goal !== 'growth') return result;

    // Weight the benchmark by the stock allocation: the equity sleeve is expected to track the S&P and
    // fixed income contributes ~0, so a 70%-stock portfolio is compared to 70% of the S&P's ~10% (= 7%).
    var fixedValue = Number(profile.fixedIncomeValue) || 0;
    var stockValue = (profile.holdings || []).reduce(function (s, h) { return s + (Number(h.value) || 0); }, 0);
    var portfolio = stockValue + fixedValue;
    if (portfolio <= 0 || stockValue <= 0) return result;   // no equity sleeve to judge
    var stockPct = (stockValue / portfolio) * 100;
    var weighted = (stockPct / 100) * benchmark;
    result.stockPct = Math.round(stockPct);
    result.weightedBenchmarkPct = weighted;

    var gap = clientReturn - weighted;
    result.gapPct = gap;
    var mix = Math.round(stockPct) + '% in stocks × the ' + benchmarkName + '’s ~' + pct(benchmark);

    if (gap < -tolerance) {
      result.status = 'underperform';
      findings.push({ category: 'Investment performance', severity: 'warn',
        title: 'Trailing the ' + benchmarkName,
        detail: 'The ' + periodLabel + ' return of ' + pct(clientReturn) + ' trailed the stock-weighted benchmark of ' +
          pct(weighted) + ' (' + mix + ') by ' + pct(-gap) + '. With a growth goal, the equity sleeve has room to ' +
          'work harder — our advisors can help.' });
    } else {
      result.status = 'meets';
      findings.push({ category: 'Investment performance', severity: 'ok',
        title: periodLabel + ' return kept pace with the market',
        detail: 'The ' + periodLabel + ' return of ' + pct(clientReturn) + ' met or beat the stock-weighted benchmark of ' +
          pct(weighted) + ' (' + mix + ') by ' + pct(gap) + '.' });
    }

    return result;
  }

  return { analyze: analyze };
})();
