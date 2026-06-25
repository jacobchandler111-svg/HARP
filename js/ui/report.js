// Renders the Brookhaven-branded one-pager shown on the preview page and printed as the
// client deliverable: gauge circles (overall + per category) and a key-risks list.
window.HARP = window.HARP || {};
HARP.ui = HARP.ui || {};

HARP.ui.report = (function () {
  var esc = HARP.util.escape, money = HARP.util.money;
  var SEV_ORDER = { risk: 0, warn: 1, info: 2, ok: 3 };
  var SEV_LABEL = { risk: 'Risk', warn: 'Watch', info: 'Note', ok: 'OK' };

  function today() {
    return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Color the gauge by health band (1 = bad/red, 100 = great/green).
  function bandColor(score) {
    return score >= 80 ? 'var(--ok)' : score >= 60 ? '#c79200' : score >= 40 ? '#d2691e' : 'var(--risk)';
  }

  // SVG donut gauge for a 0-100 score.
  function gauge(score, size, label) {
    score = Math.max(0, Math.min(100, Math.round(score)));
    var stroke = size < 100 ? 9 : 13;
    var r = (size / 2) - (stroke / 2) - 2;
    var circ = 2 * Math.PI * r;
    var offset = circ * (1 - score / 100);
    var color = bandColor(score);
    var fontSize = size < 100 ? 20 : 38;
    var cx = size / 2;
    return '<svg class="gauge" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size +
        '" role="img" aria-label="' + esc(label || '') + ' score ' + score + ' out of 100">' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke +
        '" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) +
        '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/>' +
      '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="gauge-num" ' +
        'style="font-size:' + fontSize + 'px;fill:' + color + '">' + score + '</text>' +
      '</svg>';
  }

  function header(a) {
    var b = HARP.config.branding;
    var logo = b.logoUrl
      ? '<img class="firm-logo" src="' + esc(b.logoUrl) + '" alt="' + esc(b.firmName) + '" />'
      : '<span class="firm-name">' + esc(b.firmName) + '</span>';
    return '<div class="op-header">' +
      '<div class="op-firm">' + logo + '<span class="op-firm-tag">' + esc(b.tagline) + '</span></div>' +
      '<div class="op-meta"><div class="op-title">Health &amp; Risk Profile</div>' +
      '<div class="op-prepared">Prepared for <strong>' + (esc(a.profile.name) || 'Client') + '</strong> · ' + today() + '</div></div>' +
      '</div>';
  }

  function keyFigures(a) {
    var bits = [];
    if (a.concentration.total > 0) bits.push('Portfolio ' + money(a.concentration.total));
    if (a.accounting.income > 0) bits.push('Income ' + money(a.accounting.income));
    if (a.tax.total > 0) bits.push('Investable assets ' + money(a.tax.total));
    return bits.length ? '<div class="op-figures">' + bits.map(esc).join(' &nbsp;·&nbsp; ') + '</div>' : '';
  }

  function scores(a) {
    var cats = a.categories.map(function (c) {
      return '<div class="op-cat">' + gauge(c.score, 84, c.label) +
        '<div class="op-cat-label">' + esc(c.label) + '</div></div>';
    }).join('');
    return '<div class="op-scores">' +
      '<div class="op-overall">' + gauge(a.score.value, 150, 'Overall') +
        '<div class="op-overall-label">Overall health</div><div class="op-band">' + esc(a.score.band) + '</div></div>' +
      '<div class="op-cats">' + cats + '</div>' +
      '</div>';
  }

  function findingHtml(f) {
    return '<div class="op-finding ' + f.severity + '">' +
      '<div class="op-fhead"><span class="badge ' + f.severity + '">' + SEV_LABEL[f.severity] + '</span>' +
      '<span class="op-ftitle">' + esc(f.title) + '</span></div>' +
      '<div class="op-fdetail">' + esc(f.detail) + '</div></div>';
  }

  function risks(a) {
    var list = a.findings.slice()
      .filter(function (f) { return f.severity !== 'ok'; })
      .sort(function (x, y) { return SEV_ORDER[x.severity] - SEV_ORDER[y.severity]; });
    var body = list.length
      ? list.map(findingHtml).join('')
      : '<p class="op-clean">No material risks identified — this household is in strong shape.</p>';
    return '<div class="op-risks"><h3>Key risks &amp; recommendations</h3>' + body + '</div>';
  }

  function footer() {
    var b = HARP.config.branding;
    var contact = [b.firmName, b.contact.phone, b.contact.email, b.contact.website]
      .filter(Boolean).map(esc).join(' · ');
    return '<div class="op-footer"><div class="op-contact">' + contact + '</div>' +
      '<div class="op-disc">' + esc(b.disclaimer) + '</div></div>';
  }

  function render(a) {
    document.getElementById('report').innerHTML =
      header(a) + keyFigures(a) + scores(a) + risks(a) + footer();
  }

  return { render: render, gauge: gauge };
})();
