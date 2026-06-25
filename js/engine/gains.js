// Embedded (unrealized) gains. When a holding has a cost basis and a large gain, it is both an
// investment-concentration concern and an upcoming taxable event — so it dings BOTH the investment
// and the accounting/tax domains. Cost basis is optional; holdings without one are skipped.
// Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.gains = (function () {
  var money = HARP.util.money, pct = HARP.util.pct;

  function analyze(holdings, cfg) {
    cfg = cfg || HARP.config;
    holdings = holdings || [];
    var gcfg = cfg.gains || {};
    var pctThreshold = Number(gcfg.embeddedGainPct) || 100;
    var minGain = Number(gcfg.minGainAmount) || 0;

    var flagged = [];
    holdings.forEach(function (h) {
      var value = Number(h.value) || 0;
      var basis = Number(h.costBasis);
      if (isNaN(basis) || basis <= 0) return; // cost basis absent — nothing to assess
      var gain = value - basis;
      if (gain <= 0) return;
      var gainPct = (gain / basis) * 100;
      if (gainPct < pctThreshold || gain < minGain) return;
      flagged.push({ name: h.name || h.ticker || 'a holding', gain: gain, gainPct: gainPct, value: value, basis: basis });
    });

    var findings = [];
    flagged.forEach(function (f) {
      var lead = f.name + ' shows an unrealized gain of about ' + money(f.gain) + ' (' + pct(f.gainPct) +
        ' over a cost basis of ' + money(f.basis) + ').';
      // Investment-side ding
      findings.push({ category: 'Unrealized gains', severity: 'warn',
        weight: cfg.investmentWeights && cfg.investmentWeights.moderate,
        title: 'Large embedded gain in ' + f.name,
        detail: lead + ' A concentrated low-basis position carries market risk and a built-in tax cost to ' +
          'unwind — linked to the tax flag for the same holding. Our investment team can help manage and stage the position.' });
      // Tax-side ding
      findings.push({ category: 'Accounting / tax', severity: 'warn',
        title: 'Upcoming tax event: large gain in ' + f.name,
        detail: lead + ' Selling would realize a sizable taxable capital gain. Our accounting team can help ' +
          'time and mitigate it — tax-loss harvesting, staged sales, or charitable gifting of appreciated shares.' });
    });

    return { flagged: flagged, findings: findings };
  }

  return { analyze: analyze };
})();
