// Income analysis for income-goal households: does the portfolio's income (stock dividends + income
// from fixed income) cover the planned withdrawals? A shortfall is flagged as a risk; a surplus is a
// clean pass. Also reports the stock vs fixed-income split. Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.income = (function () {
  var m = function (n) { return HARP.util.money(n); };

  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var goal = profile.goal || 'growth';
    // Compute the split from source data so the engine doesn't depend on the UI's derived portfolioValue.
    var fixedValue = Number(profile.fixedIncomeValue) || 0;
    var holdings = profile.holdings || [];
    var stockValue = holdings.reduce(function (s, h) { return s + (Number(h.value) || 0); }, 0);
    var portfolio = stockValue + fixedValue;
    var fixedIncomeIncome = Number(profile.fixedIncomeIncome) || 0;
    var monthlyDraw = Number(profile.monthlyDrawdown) || 0;

    // Stock dividends are backed into from each holding's own yield: sum(value x yield%).
    var stockDividends = holdings.reduce(function (s, h) {
      return s + (Number(h.value) || 0) * ((Number(h.dividendYield) || 0) / 100);
    }, 0);
    var annualIncome = stockDividends + fixedIncomeIncome;
    var annualDraw = monthlyDraw * 12;
    var net = annualIncome - annualDraw;

    var stockPct = portfolio > 0 ? Math.round((stockValue / portfolio) * 100) : null;
    var fixedPct = portfolio > 0 ? Math.round((fixedValue / portfolio) * 100) : null;

    var findings = [];
    // Only income-goal households with a withdrawal need are judged on income vs. draw.
    if (goal === 'income' && annualDraw > 0) {
      if (net < 0) {
        findings.push({
          category: 'Investment income', severity: 'risk',
          title: 'Portfolio income falls short of withdrawals',
          detail: 'Estimated portfolio income of ' + m(annualIncome) + '/yr (dividends ' + m(stockDividends) +
            ' + fixed income ' + m(fixedIncomeIncome) + ') does not cover planned withdrawals of ' + m(annualDraw) +
            '/yr — a shortfall of about ' + m(-net) + '/yr (' + m(monthlyDraw) + '/mo). This gap needs to be ' +
            'addressed: drawing down principal, adjusting spending, or repositioning the portfolio for more income.'
        });
      } else {
        findings.push({
          category: 'Investment income', severity: 'ok',
          title: 'Portfolio income covers withdrawals',
          detail: 'Estimated portfolio income of ' + m(annualIncome) + '/yr covers planned withdrawals of ' +
            m(annualDraw) + '/yr, with a surplus of about ' + m(net) + '/yr.'
        });
      }
    }

    return {
      goal: goal, stockValue: stockValue, fixedValue: fixedValue, stockPct: stockPct, fixedPct: fixedPct,
      stockDividends: stockDividends, annualIncome: annualIncome, annualDraw: annualDraw, net: net,
      findings: findings
    };
  }

  return { analyze: analyze };
})();
