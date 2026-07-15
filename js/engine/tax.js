// Tax health — driven by the BrookHaven Tax Strategy Calculator (Seth Weiland's), NOT by HARP re-deriving
// anything from a 1040 and NOT by tax-bucket diversification (both retired). This mirrors Investments:
// just as the portfolio verdict comes from Nitrogen's Risk Number, the tax verdict comes from the
// calculator's own numbers. HARP PRESENTS and SCORES them; it does not recompute the tax.
//
// The health signal is the UNREALIZED-SAVINGS RATIO: identified annual savings ÷ current projected tax.
// A client currently paying a tax bill that the calculator shows is largely reducible is, today, tax-
// inefficient — a real, scored gap — with the calculator's strategies as the attached plan to close it.
// Implement the strategies and the savings (and the ding) shrink. No plan present => nothing to assess
// (the report shows the Tax dial as "information needed", not a false 100).
window.HARP = window.HARP || {};

HARP.tax = (function () {
  var money = function (n) { return HARP.util.money(n); };
  function pct(n) { return (Math.round(Number(n) * 10) / 10) + '%'; }
  function fin(n) { return typeof n === 'number' && isFinite(n); }

  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var tcfg = cfg.tax || {};
    var plan = profile.taxPlan || null;
    var findings = [];

    // Nothing from the tax lane (and no manual figures) => not assessed. hasPlan:false + categoryScore:null
    // lets the report treat Tax as a gap-tolerant "information needed" section instead of scoring it.
    var currentTax = plan && fin(plan.currentTax) ? plan.currentTax : null;
    var income = plan && fin(plan.income) ? plan.income : (Number(profile.income) || 0);
    if (!plan || (currentTax == null && !(income > 0))) {
      return { hasPlan: false, findings: findings, categoryScore: null };
    }

    var afterTax = fin(plan.afterTax) ? plan.afterTax : null;
    var savings = fin(plan.savings) ? plan.savings
      : (currentTax != null && afterTax != null ? Math.max(0, currentTax - afterTax) : 0);
    var effNow = fin(plan.effectiveRatePct) ? plan.effectiveRatePct : null;
    var effAfter = fin(plan.effectiveRateAfterPct) ? plan.effectiveRateAfterPct : null;
    var marginal = fin(plan.marginalPct) ? plan.marginalPct : null;
    var strategies = Array.isArray(plan.strategies) ? plan.strategies : [];
    var savingsRatio = (currentTax > 0 && savings > 0) ? savings / currentTax : 0;

    // Headline finding: what they're on track to pay, and how much of it the plan can remove. Severity is
    // set by the size of the unrealized opportunity, so it drives BOTH the key-risks list and the score.
    var critBand = Number(tcfg.savingsCriticalRatio) || 0.30;
    var modBand = Number(tcfg.savingsModerateRatio) || 0.10;
    if (savings > 0 && currentTax != null) {
      var sev = savingsRatio >= critBand ? 'risk' : savingsRatio >= modBand ? 'warn' : 'ok';
      findings.push({
        category: 'Tax planning', severity: sev,
        title: money(savings) + '/yr in potential tax savings identified',
        detail: 'The client is projected to pay ' + money(currentTax) +
          (effNow != null ? ' (' + pct(effNow) + ' effective rate)' : '') + ' in tax. The BrookHaven Tax ' +
          'Strategy Calculator identifies ' + money(savings) + ' in potential annual savings' +
          (afterTax != null ? ', which would bring the projected tax to ' + money(afterTax) : '') +
          (effAfter != null ? ' (' + pct(effAfter) + ' effective)' : '') + '. This does not mean the ' +
          'client is in a tax-liability or problem situation — it is money being left on the table, and ' +
          (sev === 'risk' ? 'a large amount of it: our planning strategies are built to help capture it, and it is well worth prioritizing.'
           : sev === 'warn' ? 'a meaningful amount: our strategies can help capture it.'
           : 'only a modest amount remains — the plan is already fairly efficient.')
      });
    } else if (currentTax != null) {
      findings.push({
        category: 'Tax planning', severity: 'ok',
        title: 'Tax plan appears efficient',
        detail: 'Projected tax is ' + money(currentTax) +
          (effNow != null ? ' (' + pct(effNow) + ' effective rate)' : '') +
          '. The calculator did not identify material additional savings.'
      });
    }

    // High marginal bracket — context, not a scored ding (info). Explains WHY planning has leverage here.
    if (marginal != null && marginal >= (Number(tcfg.highMarginalPct) || 32)) {
      findings.push({
        category: 'Tax planning', severity: 'info',
        title: 'In the ' + Math.round(marginal) + '% federal marginal bracket',
        detail: 'At this income each additional dollar of ordinary income is taxed at about ' +
          Math.round(marginal) + '%, so deduction, deferral, entity, and Roth-conversion timing decisions ' +
          'carry outsized value.'
      });
    }

    // CATEGORY score from the savings ratio (like insurance's rubric — a direct override, not finding pile-up):
    // 100 when nothing is reducible, sliding down as more of the tax bill is shown to be recoverable.
    var span = Number(tcfg.savingsScoreSpan) || 70;
    var categoryScore = Math.max(0, Math.round(100 - Math.min(1, savingsRatio) * span));

    return {
      hasPlan: true,
      filingStatus: plan.filingStatus || profile.filingStatus || '',
      state: plan.state || '',
      income: income,
      agi: fin(plan.agi) ? plan.agi : (Number(profile.agi) || null),
      taxableIncome: fin(plan.taxableIncome) ? plan.taxableIncome : null,
      currentTax: currentTax, afterTax: afterTax, savings: savings,
      effectiveRatePct: effNow, effectiveRateAfterPct: effAfter, marginalPct: marginal,
      roiMultiple: fin(plan.roiMultiple) ? plan.roiMultiple : null,
      savingsRatio: savingsRatio, strategies: strategies,
      findings: findings, categoryScore: categoryScore
    };
  }

  return { analyze: analyze };
})();
