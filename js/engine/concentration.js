// Investment concentration: single-stock exposure and sector exposure.
// Pure module — takes holdings, returns results + findings. No DOM.
window.HARP = window.HARP || {};

HARP.concentration = (function () {
  function analyze(holdings, cfg) {
    cfg = cfg || HARP.config;
    holdings = holdings || [];

    var total = holdings.reduce(function (s, h) { return s + (Number(h.value) || 0); }, 0);
    var findings = [];

    // Normalize + sort positions largest first
    var positions = holdings.map(function (h) {
      var value = Number(h.value) || 0;
      return {
        name: h.name || h.ticker || 'Unnamed holding',
        ticker: h.ticker || '',
        sector: h.sector || 'Other',
        value: value,
        pct: total > 0 ? (value / total) * 100 : 0
      };
    }).sort(function (a, b) { return b.value - a.value; });

    // Single-stock concentration
    positions.forEach(function (p) {
      if (p.pct > cfg.singleStockConcentrationPct) {
        findings.push({
          category: 'Investment concentration',
          severity: 'risk',
          title: p.name + ' is ' + p.pct.toFixed(1) + '% of the portfolio',
          detail: 'Single-position exposure exceeds the ' + cfg.singleStockConcentrationPct +
            '% guideline. A large drop in this one holding would materially hurt the portfolio. ' +
            'Consider trimming or hedging to reduce single-name risk.'
        });
      }
    });

    // Sector exposure
    var sectorTotals = {};
    positions.forEach(function (p) {
      sectorTotals[p.sector] = (sectorTotals[p.sector] || 0) + p.value;
    });
    var sectors = Object.keys(sectorTotals).map(function (name) {
      return {
        name: name,
        value: sectorTotals[name],
        pct: total > 0 ? (sectorTotals[name] / total) * 100 : 0
      };
    }).sort(function (a, b) { return b.value - a.value; });

    sectors.forEach(function (s) {
      if (s.pct > cfg.sectorConcentrationPct) {
        findings.push({
          category: 'Sector exposure',
          severity: 'risk',
          title: s.name + ' sector is ' + s.pct.toFixed(1) + '% of the portfolio',
          detail: 'Sector exposure exceeds the ' + cfg.sectorConcentrationPct +
            '% guideline. A downturn concentrated in this sector would have an outsized effect. ' +
            'Consider diversifying across sectors.'
        });
      }
    });

    return { total: total, positions: positions, sectors: sectors, findings: findings };
  }

  return { analyze: analyze };
})();
