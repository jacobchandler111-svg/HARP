// Investment risk alignment from a Nitrogen / Riskalyze ingest. Nitrogen scores risk on a 1-99
// "Risk Number": the client's risk TOLERANCE number (what they are willing to take) vs. their current
// PORTFOLIO's risk number (what they are actually taking). The gap between the two is the core insight
// and drives the Investments assessment — this replaced the age-based (110-minus-age) allocation check.
//   • Portfolio riskier than tolerance (over-risk): downside beyond what the client signed up for.
//     Critical once the gap passes criticalGap, for any goal.
//   • Portfolio tamer than tolerance (under-risk): likely under-invested for the client's capacity.
//     Critical only for a GROWTH goal; otherwise capped at moderate (a defensible conservative choice).
// Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.risk = (function () {
  // Coerce a form value to a number, or null when blank / non-numeric (so an unanswered field is not 0).
  function n(v) { return (v === '' || v == null || isNaN(Number(v))) ? null : Number(v); }

  // A short " Nitrogen projects a 6-month 95% range of -X% to +Y%." clause when the range is present.
  function rangeText(r) {
    if (r.rangeLowPct == null || r.rangeHighPct == null) return '';
    var lo = (r.rangeLowPct > 0 ? '+' : '') + r.rangeLowPct + '%';
    var hi = (r.rangeHighPct > 0 ? '+' : '') + r.rangeHighPct + '%';
    return ' Nitrogen projects a 6-month 95% range of ' + lo + ' to ' + hi + '.';
  }

  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var rcfg = cfg.risk || {};
    var alignedBand = Number(rcfg.alignedBand) || 10;
    var criticalGap = Number(rcfg.criticalGap) || 20;

    var r = (profile && profile.risk) || {};
    var tolerance = n(r.toleranceNumber);
    var portfolio = n(r.portfolioNumber);

    var result = {
      toleranceNumber: tolerance,
      portfolioNumber: portfolio,
      timeHorizonYears: n(r.timeHorizonYears),
      rangeLowPct: n(r.rangeLowPct), rangeHighPct: n(r.rangeHighPct),
      rangeLowAmt: n(r.rangeLowAmt), rangeHighAmt: n(r.rangeHighAmt),
      gpa: (r.gpa == null || r.gpa === '') ? null : String(r.gpa),
      gap: null, absGap: null, direction: null, aligned: null,
      // "provided" gates whether Investments counts as assessed and whether a finding is emitted:
      // both the tolerance and the portfolio Risk Number are needed to judge alignment.
      provided: (tolerance != null && portfolio != null),
      findings: []
    };
    if (!result.provided) return result;

    var gap = portfolio - tolerance;   // + => portfolio riskier than tolerance (over-risk)
    var absGap = Math.abs(gap);
    result.gap = gap;
    result.absGap = absGap;
    result.direction = gap > 0 ? 'over' : (gap < 0 ? 'under' : 'even');
    result.aligned = absGap <= alignedBand;

    if (result.aligned) {
      result.findings.push({ category: 'Investment risk alignment', severity: 'ok',
        title: 'Portfolio risk matches the client’s risk tolerance',
        detail: 'The portfolio’s Risk Number (' + portfolio + ') is in line with the client’s risk tolerance of ' +
          tolerance + ' (within ' + alignedBand + ' points).' + rangeText(result) });
      return result;
    }

    var over = gap > 0;
    var goal = profile.goal || 'growth';
    // Critical only past the critical gap, and — when the portfolio is UNDER-risk — only for a growth goal.
    var severity = (absGap > criticalGap && (over || goal === 'growth')) ? 'risk' : 'warn';
    var title, detail;
    if (over) {
      title = 'Portfolio takes more risk than the client’s tolerance';
      detail = 'The portfolio’s Risk Number (' + portfolio + ') sits ' + absGap + ' points above the client’s risk ' +
        'tolerance of ' + tolerance + ', carrying more market risk than the client indicated they are comfortable ' +
        'with. This exposes them to deeper drawdowns than they signed up for.';
    } else {
      title = 'Portfolio takes less risk than the client’s tolerance';
      detail = 'The portfolio’s Risk Number (' + portfolio + ') sits ' + absGap + ' points below the client’s risk ' +
        'tolerance of ' + tolerance + ' — ' + (goal === 'growth'
          ? 'well short of the risk the client is willing to take for their growth goal, likely leaving return on the table.'
          : 'more conservative than the client’s capacity. Defensible for an income focus, but worth a deliberate look.');
    }
    detail += rangeText(result);
    result.findings.push({ category: 'Investment risk alignment', severity: severity, title: title, detail: detail });
    return result;
  }

  return { analyze: analyze };
})();
