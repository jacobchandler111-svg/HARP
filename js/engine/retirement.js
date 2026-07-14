// Retirement readiness — a TRANSPARENT, deterministic projection (no Monte Carlo). Grow the portfolio to
// retirement at an expected return implied by the Riskalyze allocation, then draw an inflation-adjusted
// need through longevity and see how long it lasts. A real probability-of-success would come from
// Riskalyze's Retirement Maps if that scrape is wired; this is HARP's own estimate meanwhile.
// Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.retirement = (function () {
  // Expected annual return (%): weighted from the Riskalyze allocation; fall back to a Risk-Number mapping,
  // then a 60/40 default. Kept explicit so the assumption is auditable.
  function expectedReturnPct(profile, cfg) {
    var acr = cfg.assetClassReturns || { stocks: 7, bonds: 3, cash: 1, other: 5 };
    var alloc = (profile.risk || {}).allocation;
    if (alloc) {
      var tot = (Number(alloc.stocks) || 0) + (Number(alloc.bonds) || 0) + (Number(alloc.cash) || 0) + (Number(alloc.other) || 0);
      if (tot > 0) {
        return ((Number(alloc.stocks) || 0) * acr.stocks + (Number(alloc.bonds) || 0) * acr.bonds +
                (Number(alloc.cash) || 0) * acr.cash + (Number(alloc.other) || 0) * acr.other) / tot;
      }
    }
    var rn = Number((profile.risk || {}).portfolioNumber);
    var rr = (cfg.retirement || {}).riskReturn || { base: 2, span: 8 };
    if (isFinite(rn) && rn > 0) return rr.base + (rn / 99) * rr.span;
    return 5.5;
  }

  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var rcfg = cfg.retirement || {};
    var age = Number(profile.age);
    var value = Number(profile.portfolioValue) || 0;
    var monthly = Number(profile.monthlyDrawdown) || 0;
    var retAge = Number(cfg.retirementAge) || 65;
    var longevity = Number(rcfg.longevityAge) || 92;
    var infl = (Number(rcfg.inflationPct) || 2.5) / 100;
    var rPct = expectedReturnPct(profile, cfg);
    var r = rPct / 100;

    var result = {
      provided: false, expectedReturnPct: Math.round(rPct * 10) / 10,
      projectedAtRetirement: null, lastsToAge: null, longevityAge: longevity, funded: null, findings: []
    };
    // Needs an age, a withdrawal need, and a portfolio value to project funding.
    if (!isFinite(age) || age <= 0 || monthly <= 0 || value <= 0) return result;
    result.provided = true;

    var yearsToRet = Math.max(0, retAge - age);
    var startAge = Math.max(age, retAge);
    var bal = value * Math.pow(1 + r, yearsToRet);            // accumulate to retirement
    var need = monthly * 12 * Math.pow(1 + infl, yearsToRet); // today's need, inflated to retirement
    result.projectedAtRetirement = Math.round(bal);

    var a = startAge, lastsTo = startAge;
    while (bal > 0 && a < 120) {                               // deplete year by year in retirement
      bal = bal * (1 + r) - need;
      need *= (1 + infl);
      a++;
      if (bal > 0) lastsTo = a;
    }
    result.lastsToAge = lastsTo;
    result.funded = lastsTo >= longevity;

    var modYears = Number(rcfg.shortfallModerateYears) || 5;
    if (result.funded) {
      result.findings.push({
        category: 'Retirement', severity: 'ok', title: 'On track to fund retirement',
        detail: 'The portfolio is projected to sustain the inflation-adjusted withdrawal through age ' + lastsTo +
          ' — at or beyond the plan horizon of ' + longevity + ', assuming about ' + result.expectedReturnPct + '%/yr.'
      });
    } else {
      var shortBy = longevity - lastsTo;
      result.findings.push({
        category: 'Retirement', severity: (shortBy > modYears) ? 'risk' : 'warn',
        title: 'Retirement savings projected to fall short',
        detail: 'At the current withdrawal need, the portfolio is projected to run out around age ' + lastsTo + ' — ' +
          shortBy + ' year' + (shortBy === 1 ? '' : 's') + ' short of the plan horizon of ' + longevity +
          ' (assuming about ' + result.expectedReturnPct + '%/yr). Closing it means a higher savings rate, a later ' +
          'retirement, or a lower withdrawal.'
      });
    }
    return result;
  }

  return { analyze: analyze, expectedReturnPct: expectedReturnPct };
})();
