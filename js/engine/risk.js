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

  // Risk Number (1-99) -> plain band label (Conservative / Moderate / Aggressive), matching the questionnaire.
  function band(num, cfg) {
    var bands = (cfg && cfg.risk && cfg.risk.bands) || [[33, 'Conservative'], [66, 'Moderate'], [99, 'Aggressive']];
    for (var i = 0; i < bands.length; i++) if (num <= bands[i][0]) return bands[i][1];
    return bands[bands.length - 1][1];
  }

  // A short " Nitrogen projects a 6-month 95% range of -X% to +Y%." clause when the range is present.
  function rangeText(r) {
    if (r.rangeLowPct == null || r.rangeHighPct == null) return '';
    var lo = (r.rangeLowPct > 0 ? '+' : '') + r.rangeLowPct + '%';
    var hi = (r.rangeHighPct > 0 ? '+' : '') + r.rangeHighPct + '%';
    return ' Nitrogen projects a 6-month 95% range of ' + lo + ' to ' + hi + '.';
  }

  // Investments = the Riskalyze story: (1) tolerance-vs-portfolio ALIGNMENT (the headline), plus two
  // supporting Riskalyze data points — (2) the portfolio GPA (quality) and (3) the expense ratio (cost).
  // No HARP re-calculation of the holdings; these are Riskalyze's own outputs.
  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var rcfg = cfg.risk || {};
    var rz = cfg.riskalyze || {};
    var alignedBand = Number(rcfg.alignedBand) || 10;
    var criticalGap = Number(rcfg.criticalGap) || 20;

    var r = (profile && profile.risk) || {};
    var tolerance = n(r.toleranceNumber);
    var portfolio = n(r.portfolioNumber);

    var result = {
      toleranceNumber: tolerance,
      portfolioNumber: portfolio,
      toleranceBand: tolerance != null ? band(tolerance, cfg) : null,
      portfolioBand: portfolio != null ? band(portfolio, cfg) : null,
      timeHorizonYears: n(r.timeHorizonYears),
      rangeLowPct: n(r.rangeLowPct), rangeHighPct: n(r.rangeHighPct),
      rangeLowAmt: n(r.rangeLowAmt), rangeHighAmt: n(r.rangeHighAmt),
      gpa: (r.gpa == null || r.gpa === '') ? null : String(r.gpa).toUpperCase(),
      expenseRatio: n(r.expenseRatio),
      gap: null, absGap: null, direction: null, aligned: null,
      // "provided" gates the ALIGNMENT finding (needs both Risk Numbers). GPA/cost signals are
      // independent and fire whenever Riskalyze supplied them.
      provided: (tolerance != null && portfolio != null),
      findings: []
    };

    // 1 · Alignment — the headline: does the portfolio's risk match the client's stated tolerance?
    if (result.provided) {
      var gap = portfolio - tolerance;   // + => portfolio riskier than tolerance (over-risk)
      var absGap = Math.abs(gap);
      result.gap = gap;
      result.absGap = absGap;
      result.direction = gap > 0 ? 'over' : (gap < 0 ? 'under' : 'even');
      result.aligned = absGap <= alignedBand;
      var tb = result.toleranceBand, pb = result.portfolioBand;

      if (result.aligned) {
        result.findings.push({ category: 'Investment risk alignment', severity: 'ok',
          title: 'Portfolio risk matches the client’s risk tolerance',
          detail: 'The portfolio’s Risk Number (' + portfolio + ', ' + pb + ') is in line with the client’s risk ' +
            'tolerance of ' + tolerance + ' (' + tb + '), within ' + alignedBand + ' points.' + rangeText(result) });
      } else {
        var over = gap > 0;
        var goal = profile.goal || 'growth';
        // Critical only past the critical gap, and — when UNDER-risk — only for a growth goal.
        var severity = (absGap > criticalGap && (over || goal === 'growth')) ? 'risk' : 'warn';
        var lead = 'The questionnaire places this client as ' + tb + ' (tolerance ' + tolerance +
          '), but their portfolio is ' + pb + ' (Risk Number ' + portfolio + ') — ' + absGap + ' points ';
        var title, detail;
        if (over) {
          title = 'Portfolio takes more risk than the client’s tolerance';
          detail = lead + 'above their stated comfort, exposing them to deeper drawdowns than they signed up for.';
        } else {
          title = 'Portfolio takes less risk than the client’s tolerance';
          detail = lead + 'below their capacity' + (goal === 'growth'
            ? ', likely leaving growth on the table for a client willing to take more.'
            : '. Defensible for an income focus, but worth a deliberate look.');
        }
        detail += rangeText(result);
        result.findings.push({ category: 'Investment risk alignment', severity: severity, title: title, detail: detail });
      }
    }

    // 2 · Riskalyze GPA — the portfolio's risk-adjusted quality grade (independent of tolerance).
    if (result.gpa) {
      var g = result.gpa.charAt(0);
      var sev = (rz.gpaCritical || []).indexOf(g) >= 0 ? 'risk'
              : (rz.gpaModerate || []).indexOf(g) >= 0 ? 'warn' : 'ok';
      var qDetail = sev === 'ok'
        ? 'Riskalyze grades this portfolio ' + g + ' — strong risk-adjusted quality.'
        : sev === 'warn'
          ? 'Riskalyze grades this portfolio ' + g + ' — middling risk-adjusted quality; there may be room to improve the risk/return trade-off.'
          : 'Riskalyze grades this portfolio ' + g + ' — weak risk-adjusted quality: the holdings are taking on risk that is not being rewarded.';
      result.findings.push({ category: 'Investment quality', severity: sev, title: 'Riskalyze portfolio grade: ' + g, detail: qDetail });
    }

    // 3 · Expense ratio — a Riskalyze cost signal (independent of tolerance).
    if (result.expenseRatio != null) {
      var e = result.expenseRatio;
      if (e >= Number(rz.expenseCriticalPct)) {
        result.findings.push({ category: 'Investment cost', severity: 'risk', title: 'High portfolio cost',
          detail: 'The blended expense ratio is ' + e + '% — high; fees at this level are a meaningful, compounding drag on returns.' });
      } else if (e >= Number(rz.expenseModeratePct)) {
        result.findings.push({ category: 'Investment cost', severity: 'warn', title: 'Elevated portfolio cost',
          detail: 'The blended expense ratio is ' + e + '% — above a low-cost benchmark; cheaper share classes or funds are worth reviewing.' });
      } else {
        result.findings.push({ category: 'Investment cost', severity: 'ok', title: 'Low-cost portfolio',
          detail: 'The blended expense ratio is ' + e + '% — a low-cost portfolio; fees are not a material drag.' });
      }
    }

    return result;
  }

  return { analyze: analyze, band: band };
})();
