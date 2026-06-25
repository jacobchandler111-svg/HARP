// Renders the assessment as either the INTERNAL working view or the CLIENT-ready report.
window.HARP = window.HARP || {};
HARP.ui = HARP.ui || {};

HARP.ui.report = (function () {
  var esc = HARP.util.escape, money = HARP.util.money, pct = HARP.util.pct;
  var SEV_ORDER = { risk: 0, warn: 1, info: 2, ok: 3 };
  var SEV_LABEL = { risk: 'Risk', warn: 'Watch', info: 'Note', ok: 'OK' };
  var STATUS_LABEL = {
    adequate: 'Adequate', underinsured: 'Underinsured', overinsured: 'Over-insured',
    missing: 'Not on record', unknown: 'Needs income'
  };

  function today() {
    return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function findingHtml(f) {
    return '<div class="finding ' + f.severity + '">' +
      '<div class="fcat">' + esc(f.category) + '</div>' +
      '<div><span class="badge ' + f.severity + '">' + SEV_LABEL[f.severity] + '</span>' +
      '<span class="ftitle">' + esc(f.title) + '</span></div>' +
      '<div class="fdetail">' + esc(f.detail) + '</div></div>';
  }
  function barCell(p) {
    var w = Math.max(2, Math.min(100, p));
    return '<td class="bar-cell"><div class="bar-track"><div class="bar" style="width:' + w + '%"></div></div></td>';
  }
  function recommendationsHtml(a, includeOk) {
    var list = a.findings.slice()
      .filter(function (f) { return includeOk || f.severity !== 'ok'; })
      .sort(function (x, y) { return SEV_ORDER[x.severity] - SEV_ORDER[y.severity]; });
    if (!list.length) return '<p class="placeholder">No findings — looks healthy across the board.</p>';
    return list.map(findingHtml).join('');
  }
  function accountingHtml(a) {
    var ac = a.accounting, rows = '';
    if (ac.filingStatus) rows += '<tr><td>Filing status</td><td class="num">' + esc(ac.filingStatus) + '</td></tr>';
    if (ac.income) rows += '<tr><td>Annual gross income</td><td class="num">' + money(ac.income) + '</td></tr>';
    if (ac.agi) rows += '<tr><td>AGI</td><td class="num">' + money(ac.agi) + '</td></tr>';
    if (ac.totalTax) rows += '<tr><td>Total tax</td><td class="num">' + money(ac.totalTax) + '</td></tr>';
    if (ac.effectiveTaxRate != null) rows += '<tr><td>Effective tax rate</td><td class="num">' + ac.effectiveTaxRate.toFixed(1) + '%</td></tr>';
    return rows ? '<h3>Accounting summary</h3><table class="data"><tbody>' + rows + '</tbody></table>' : '';
  }
  function investmentsHtml(a) {
    if (a.concentration.total <= 0) return '';
    var h = '<h3>Investment exposure</h3>';
    h += '<table class="data"><thead><tr><th>Holding</th><th>Sector</th><th class="num">Value</th><th class="num">% of portfolio</th><th></th></tr></thead><tbody>';
    a.concentration.positions.forEach(function (p) {
      h += '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.sector) + '</td><td class="num">' + money(p.value) +
        '</td><td class="num">' + pct(p.pct) + '</td>' + barCell(p.pct) + '</tr>';
    });
    h += '</tbody></table>';
    h += '<table class="data"><thead><tr><th>Sector</th><th class="num">Value</th><th class="num">% of portfolio</th><th></th></tr></thead><tbody>';
    a.concentration.sectors.forEach(function (s) {
      h += '<tr><td>' + esc(s.name) + '</td><td class="num">' + money(s.value) +
        '</td><td class="num">' + pct(s.pct) + '</td>' + barCell(s.pct) + '</tr>';
    });
    h += '</tbody></table>';
    return h;
  }
  function insuranceHtml(a) {
    if (!a.insurance.policies.length) return '';
    var h = '<h3>Insurance</h3><table class="data"><thead><tr><th>Policy</th><th>Status</th><th class="num">Coverage</th><th class="num">Recommended</th></tr></thead><tbody>';
    a.insurance.policies.forEach(function (p) {
      var coverage = p.has ? (p.type === 'disability' ? money(p.monthlyBenefit) + '/mo' : money(p.coverage)) : '—';
      var rec = p.type === 'disability' ? money(p.recommendedMonthly) + '/mo' : money(p.recommended);
      h += '<tr><td>' + esc(p.label) + '</td><td>' + (STATUS_LABEL[p.status] || p.status) +
        '</td><td class="num">' + coverage + '</td><td class="num">' + rec + '</td></tr>';
    });
    h += '</tbody></table>';
    return h;
  }
  function taxHtml(a) {
    if (a.tax.total <= 0) return '';
    var h = '<h3>Tax diversification</h3><table class="data"><thead><tr><th>Bucket</th><th class="num">Value</th><th class="num">Share</th></tr></thead><tbody>';
    a.tax.buckets.forEach(function (b) {
      h += '<tr><td>' + esc(b.label) + '</td><td class="num">' + money(b.value) + '</td><td class="num">' + pct(b.pct || 0) + '</td></tr>';
    });
    h += '</tbody></table>';
    return h;
  }
  function legalHtml(a) {
    var h = '<h3>Legal / estate readiness</h3>';
    a.legal.items.forEach(function (item) {
      h += '<div class="checkrow"><span class="' + (item.has ? 'yes' : 'no') + '">' + (item.has ? '✓' : '✗') + '</span>' +
        '<span>' + esc(item.label) + (item.optional ? ' <span class="opt">(optional)</span>' : '') + '</span></div>';
    });
    return h;
  }
  function headBlock(a, subtitle) {
    return '<div class="report-head"><div><h2>' + (esc(a.profile.name) || 'Health &amp; Risk Profile') + '</h2>' +
      '<div class="report-meta">' + subtitle + ' · ' + today() + '</div></div>' +
      '<div class="score"><div class="num">' + a.score.value + '</div><div class="band">' + esc(a.score.band) + '</div></div></div>';
  }
  function bodyBlock(a) {
    return accountingHtml(a) + investmentsHtml(a) + insuranceHtml(a) + taxHtml(a) + legalHtml(a);
  }

  function renderInternal(a) {
    var h = '<div class="report-toolbar no-print">' +
      '<span class="mode-tag internal">Internal draft</span>' +
      '<button type="button" class="primary" id="accept-btn">Accept &amp; generate client report →</button></div>';
    h += '<div class="report internal">';
    h += headBlock(a, 'Internal working analysis');
    h += '<div class="report-meta">' + a.counts.risk + ' risk · ' + a.counts.warn + ' watch · ' +
      a.counts.info + ' note · ' + a.counts.ok + ' ok</div>';
    h += '<h3>Recommendations &amp; observations</h3>' + recommendationsHtml(a, true);
    h += bodyBlock(a);
    h += '<div class="disclaimer">' + esc(HARP.config.branding.disclaimer) + ' Generated ' + today() + '.</div>';
    h += '</div>';
    return h;
  }

  function renderClient(a) {
    var b = HARP.config.branding;
    var logo = b.logoUrl ? '<img src="' + esc(b.logoUrl) + '" alt="' + esc(b.firmName) + '" class="firm-logo" />'
      : '<span class="firm-name">' + esc(b.firmName) + '</span>';

    var h = '<div class="report-toolbar no-print">' +
      '<span class="mode-tag client">Client-ready</span>' +
      '<button type="button" id="back-internal">← Back to internal</button>' +
      '<button type="button" class="primary" id="print-btn">Print / Save as PDF</button></div>';
    h += '<div class="report client">';
    h += '<div class="client-banner">' + logo + '<span class="firm-tag">' + esc(b.tagline) + '</span></div>';
    h += headBlock(a, 'Health &amp; Risk Profile');
    h += '<h3>Our recommendations</h3>' + recommendationsHtml(a, false);
    h += bodyBlock(a);
    var contact = [b.firmName, b.contact.phone, b.contact.email, b.contact.website].filter(Boolean).map(esc).join(' · ');
    h += '<div class="branded-footer"><div class="firm-contact">' + contact + '</div>' +
      '<div class="disclaimer">' + esc(b.disclaimer) + ' Generated ' + today() + '.</div></div>';
    h += '</div>';
    return h;
  }

  function render(a, mode) {
    var el = document.getElementById('report');
    el.classList.add('has-report');
    el.innerHTML = (mode === 'client') ? renderClient(a) : renderInternal(a);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return { render: render };
})();
