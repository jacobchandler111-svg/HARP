// Investment concentration: single-stock and sector exposure. Each is consolidated into ONE finding
// that lists every position/sector over the guideline — a critical "specific-stock" or "concentrated
// sector" risk. Pure module — takes holdings, returns results + findings. No DOM.
window.HARP = window.HARP || {};

HARP.concentration = (function () {
  function naturalJoin(arr) {
    if (arr.length <= 1) return arr[0] || '';
    if (arr.length === 2) return arr[0] + ' and ' + arr[1];
    return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
  }

  function analyze(holdings, cfg) {
    cfg = cfg || HARP.config;
    holdings = holdings || [];
    var skip = cfg.nonConcentratingSectors || [];
    var critWeight = cfg.investmentWeights && cfg.investmentWeights.critical;

    var total = holdings.reduce(function (s, h) { return s + (Number(h.value) || 0); }, 0);
    var findings = [];

    // Normalize + sort positions largest first.
    var positions = holdings.map(function (h) {
      var value = Number(h.value) || 0;
      return {
        // Prefer an explicit name; else look the company up from the ticker (the form may only capture
        // the ticker now); else fall back to the ticker itself.
        name: h.name || (HARP.sectors && HARP.sectors.nameOf(h.ticker)) || h.ticker || 'Unnamed holding',
        ticker: h.ticker || '',
        sector: h.sector || 'Other',
        value: value,
        pct: total > 0 ? (value / total) * 100 : 0
      };
    }).sort(function (a, b) { return b.value - a.value; });

    // ---- Single-stock concentration — one consolidated finding listing every over-guideline name ----
    var stockPct = cfg.singleStockConcentrationPct;
    var overStocks = positions.filter(function (p) { return skip.indexOf(p.sector) < 0 && p.pct > stockPct; });
    if (overStocks.length) {
      var sNames = overStocks.map(function (p) { return p.name; });
      var sNamesPct = overStocks.map(function (p) { return p.name + ' (' + p.pct.toFixed(1) + '%)'; });
      var multi = overStocks.length > 1;
      findings.push({
        category: 'Investment concentration',
        severity: 'risk',
        weight: critWeight,
        title: multi
          ? naturalJoin(sNames) + ' each exceed ' + stockPct + '% of the portfolio'
          : overStocks[0].name + ' is ' + overStocks[0].pct.toFixed(1) + '% of the portfolio',
        detail: naturalJoin(sNamesPct) + ' ' + (multi ? 'each hold' : 'holds') + ' more than the ' + stockPct +
          '% single-stock guideline. A drop in ' + (multi ? 'any of these' : 'it') +
          ' could adversely affect the portfolio. Consider trimming or hedging to reduce single-name risk.'
      });
    }

    // ---- Sector exposure — one consolidated finding ----
    var sectorTotals = {};
    positions.forEach(function (p) { sectorTotals[p.sector] = (sectorTotals[p.sector] || 0) + p.value; });
    var sectors = Object.keys(sectorTotals).map(function (name) {
      return { name: name, value: sectorTotals[name], pct: total > 0 ? (sectorTotals[name] / total) * 100 : 0 };
    }).sort(function (a, b) { return b.value - a.value; });

    var sectorPct = cfg.sectorConcentrationPct;
    var overSectors = sectors.filter(function (s) { return skip.indexOf(s.name) < 0 && s.pct > sectorPct; });
    if (overSectors.length) {
      var secNamesPct = overSectors.map(function (s) { return s.name + ' (' + s.pct.toFixed(1) + '%)'; });
      var multiSec = overSectors.length > 1;
      findings.push({
        category: 'Sector exposure',
        severity: 'risk',
        weight: critWeight,
        title: multiSec
          ? naturalJoin(overSectors.map(function (s) { return s.name; })) + ' each exceed ' + sectorPct + '% of the portfolio'
          : overSectors[0].name + ' is ' + overSectors[0].pct.toFixed(1) + '% of the portfolio',
        detail: naturalJoin(secNamesPct) + ' ' + (multiSec ? 'each exceed' : 'exceeds') + ' the ' + sectorPct +
          '% sector guideline. A downturn concentrated there would have an outsized effect. Consider diversifying across sectors.'
      });
    }

    return { total: total, positions: positions, sectors: sectors, findings: findings };
  }

  return { analyze: analyze };
})();
