// Embedded (unrealized) gains, assessed CUMULATIVELY across the portfolio: gains and losses net against
// each other, so a big loss in one holding can cancel a gain in another. When at least one holding has a
// LARGE individual gain (over embeddedGainPct of its cost basis) and the portfolio's NET embedded gain is
// positive, one consolidated moderate flag is raised — a real unrealized tax exposure worth a strategy.
// Cost basis is optional; holdings without one don't contribute. Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.gains = (function () {
  var money = HARP.util.money;
  function naturalJoin(arr) {
    if (arr.length <= 1) return arr.join('');
    if (arr.length === 2) return arr[0] + ' and ' + arr[1];
    return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
  }

  function analyze(holdings, cfg) {
    cfg = cfg || HARP.config;
    holdings = holdings || [];
    var gcfg = cfg.gains || {};
    var pctThreshold = Number(gcfg.embeddedGainPct) || 50;   // "large" = gain over this % of cost, per stock
    var minGain = Number(gcfg.minGainAmount) || 0;           // ...and at least this many dollars

    var netGain = 0, large = [];
    holdings.forEach(function (h) {
      if ((h.accountType || 'taxable') !== 'taxable') return; // gains only trigger tax in a taxable account
      var value = Number(h.value) || 0;
      var basis = Number(h.costBasis);
      if (isNaN(basis) || basis <= 0) return;                // no cost basis -> can't assess this holding
      var gain = value - basis;                              // may be negative (a loss) — it nets in
      netGain += gain;
      var gainPct = (gain / basis) * 100;
      if (gain >= minGain && gainPct > pctThreshold) large.push(h.ticker || h.name || 'a holding');
    });

    var findings = [];
    // One consolidated flag: a large individual gain AND a positive net embedded gain across the portfolio
    // (if losses elsewhere offset the gains, there's no aggregate tax exposure to raise).
    if (large.length && netGain > 0) {
      findings.push({
        category: 'Unrealized gains', severity: 'warn',
        title: 'Large embedded gains (' + large.join(', ') + ')',
        detail: naturalJoin(large) + (large.length > 1 ? ' carry' : ' carries') + ' large unrealized gains ' +
          '(each over ' + pctThreshold + '% above cost). Across the portfolio there is about ' + money(netGain) +
          ' in net embedded gains — selling could trigger a sizable capital-gains tax bill. Worth a tax ' +
          'strategy (staged sales, loss harvesting, or gifting appreciated shares) before making changes.'
      });
    }

    return { netGain: netGain, large: large, findings: findings };
  }

  return { analyze: analyze };
})();
