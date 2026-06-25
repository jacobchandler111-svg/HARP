// Tax diversification across taxable / tax-deferred / tax-free buckets.
window.HARP = window.HARP || {};

HARP.tax = (function () {
  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var findings = [];

    var buckets = [
      { key: 'taxable',  label: 'Taxable (brokerage)',      value: Number(profile.taxable) || 0 },
      { key: 'deferred', label: 'Tax-deferred (401k/IRA)',  value: Number(profile.taxDeferred) || 0 },
      { key: 'free',     label: 'Tax-free (Roth/HSA)',      value: Number(profile.taxFree) || 0 }
    ];
    var total = buckets.reduce(function (s, b) { return s + b.value; }, 0);

    if (total <= 0) {
      return { buckets: buckets, total: 0, findings: findings };
    }

    buckets.forEach(function (b) { b.pct = (b.value / total) * 100; });

    // Over-concentration in any single tax treatment
    buckets.forEach(function (b) {
      if (b.pct > cfg.tax.bucketConcentrationPct) {
        findings.push({
          category: 'Tax diversification',
          severity: 'warn',
          title: b.label + ' holds ' + b.pct.toFixed(0) + '% of investable assets',
          detail: 'Heavy concentration in one tax treatment limits flexibility. Spreading assets ' +
            'across taxable, tax-deferred, and tax-free buckets improves control over taxes in retirement.'
        });
      }
    });

    // No tax-free bucket at all
    var free = buckets.filter(function (b) { return b.key === 'free'; })[0];
    if (free && free.value === 0) {
      findings.push({
        category: 'Tax diversification',
        severity: 'info',
        title: 'No tax-free (Roth/HSA) assets',
        detail: 'Consider whether Roth or HSA contributions fit the plan to build a tax-free bucket.'
      });
    }

    return { buckets: buckets, total: total, findings: findings };
  }

  return { analyze: analyze };
})();
