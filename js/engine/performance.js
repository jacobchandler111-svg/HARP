// Investment performance vs the market: compares the portfolio's trailing 3-year annualized return
// against a benchmark (default S&P 500 ~10%/yr) and flags underperformance. Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.performance = (function () {
  var pct = HARP.util.pct, money = HARP.util.money;

  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var p = cfg.performance || {};
    var benchmarkName = p.benchmarkName || 'S&P 500';
    var benchmark = Number(p.benchmarkReturnPct) || 0;
    var tolerance = Number(p.tolerancePct) || 0;
    var severeGap = Number(p.severeGapPct) || 0;

    var findings = [];

    // The advisor enters the portfolio's trailing 3-year annualized return. Blank => nothing to assess
    // (an empty field must NOT be read as a real 0% return, which would falsely flag underperformance).
    var raw = profile.return3yrPct;
    var provided = raw !== '' && raw != null && !isNaN(Number(raw));
    var clientReturn = provided ? Number(raw) : null;

    // Dollar opportunity cost is best-effort: prefer summed holdings, else the investable-asset buckets.
    var holdingsTotal = (profile.holdings || []).reduce(function (s, h) { return s + (Number(h.value) || 0); }, 0);
    var bucketsTotal = (Number(profile.taxable) || 0) + (Number(profile.taxDeferred) || 0) + (Number(profile.taxFree) || 0);
    var basis = holdingsTotal > 0 ? holdingsTotal : bucketsTotal;

    var result = {
      provided: provided,
      clientReturnPct: clientReturn,
      benchmarkName: benchmarkName,
      benchmarkPct: benchmark,
      gapPct: null,                 // client - benchmark (negative => trailing the market)
      status: 'unknown',            // unknown | underperform | inline | outperform
      basis: basis,
      dollarGapAnnual: null,        // estimated $/yr difference vs a market-matching portfolio
      findings: findings
    };

    if (!provided) return result;

    var gap = clientReturn - benchmark;
    result.gapPct = gap;
    var dollarGapAnnual = basis > 0 ? basis * (gap / 100) : null;
    result.dollarGapAnnual = dollarGapAnnual;

    var headline = 'Portfolio returned ' + pct(clientReturn) + '/yr; the ' + benchmarkName + ' returned ' + pct(benchmark);

    if (gap < -tolerance) {
      result.status = 'underperform';
      var detail = 'The trailing 3-year return trails the ' + benchmarkName + ' benchmark by about ' +
        pct(Math.abs(gap)) + ' per year.';
      if (dollarGapAnnual != null && dollarGapAnnual < 0) {
        detail += ' On about ' + money(basis) + ' invested, that is roughly ' + money(Math.abs(dollarGapAnnual)) +
          ' a year less than a market-matching portfolio.';
      }
      detail += ' Review whether fees, cash drag, or security selection are holding returns back, and ' +
        'consider lower-cost, broadly diversified index exposure.';
      findings.push({
        category: 'Investment performance',
        severity: gap < -severeGap ? 'risk' : 'warn',
        title: headline,
        detail: detail
      });
    } else if (gap > tolerance) {
      result.status = 'outperform';
      findings.push({
        category: 'Investment performance',
        severity: 'ok',
        title: headline,
        detail: 'The trailing 3-year return is ahead of the ' + benchmarkName + ' benchmark.'
      });
    } else {
      result.status = 'inline';
      findings.push({
        category: 'Investment performance',
        severity: 'ok',
        title: headline,
        detail: 'The trailing 3-year return is in line with the ' + benchmarkName + ' benchmark.'
      });
    }

    return result;
  }

  return { analyze: analyze };
})();
