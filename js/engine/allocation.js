// Age-based "prudent" asset allocation. The rule of thumb: roughly (base - age)% in stocks (base = 110),
// the rest in fixed income. Deviating from that guideline by more than a moderate band is a moderate
// concern; past the critical band it becomes critical — BUT direction matters:
//   • Over-weighted in stocks (more market risk than the guideline) -> critical past the critical band, any goal.
//   • Under-weighted in stocks (too much fixed income) -> critical only for a GROWTH goal; for an INCOME
//     goal it's capped at moderate (holding cash/bonds is a defensible income choice).
// Needs the client's age and the stock/fixed split (from holdings + fixed income). Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.allocation = (function () {
  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var acfg = cfg.allocation || {};
    var base = Number(acfg.base) || 110;
    var modDev = Number(acfg.moderateDeviation) || 25;
    var critDev = Number(acfg.criticalDeviation) || 50;

    var age = Number(profile.age);
    var fixedValue = Number(profile.fixedIncomeValue) || 0;
    var stockValue = (profile.holdings || []).reduce(function (s, h) { return s + (Number(h.value) || 0); }, 0);
    var portfolio = stockValue + fixedValue;

    var result = {
      age: isNaN(age) ? null : age, stockValue: stockValue, fixedValue: fixedValue, portfolio: portfolio,
      expectedStockPct: null, actualStockPct: null, deviation: null, findings: []
    };
    // Need a real age and a non-empty portfolio to judge the split.
    if (isNaN(age) || age <= 0 || portfolio <= 0) return result;

    var expectedStock = Math.max(0, Math.min(100, base - age));
    var actualStock = Math.round((stockValue / portfolio) * 100);
    var dev = actualStock - expectedStock;   // + => over-weighted stocks; - => over-weighted fixed income
    var absDev = Math.abs(dev);
    result.expectedStockPct = expectedStock;
    result.actualStockPct = actualStock;
    result.deviation = dev;

    if (absDev < modDev) return result;      // within tolerance — no concern

    var overStock = dev > 0;
    var goal = profile.goal || 'growth';
    // Critical only past the critical band, and only when over-weighted in stocks or a growth goal is
    // drastically under-weighted. Otherwise a moderate concern.
    var severity = (absDev >= critDev && (overStock || goal === 'growth')) ? 'risk' : 'warn';

    var expFixed = 100 - expectedStock;
    var guide = 'about ' + expectedStock + '% stocks / ' + expFixed + '% fixed income at age ' + age +
      ' (the ' + base + '-minus-age guideline)';
    var title, detail;
    if (overStock) {
      title = 'Overweight in stocks for age ' + age;
      detail = 'The portfolio is about ' + actualStock + '% stocks vs. ' + guide + ' — more market risk ' +
        'than the age-based guideline suggests.';
    } else {
      title = 'Underweight in stocks for age ' + age;
      detail = 'The portfolio is about ' + actualStock + '% stocks vs. ' + guide + ' — ' + (goal === 'growth'
        ? 'well short of the growth exposure the stated goal implies, and likely to lag over time.'
        : 'light on growth exposure. Defensible for an income focus, but worth a deliberate look.');
    }
    result.findings.push({ category: 'Asset allocation', severity: severity, title: title, detail: detail });
    return result;
  }

  return { analyze: analyze };
})();
