// Renders the Brookhaven-branded one-pager shown on the preview page and printed as the
// client deliverable: gauge circles (overall + per category) and a key-risks list.
window.HARP = window.HARP || {};
HARP.ui = HARP.ui || {};

HARP.ui.report = (function () {
  var esc = HARP.util.escape, money = HARP.util.money;
  var SEV_ORDER = { risk: 0, warn: 1, info: 2, ok: 3 };
  var SEV_LABEL = { risk: 'Critical', warn: 'Moderate', info: 'Note', ok: 'OK' };

  function today() {
    return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Static color zones (same scale on every gauge): red 0-40, yellow 40-80, green 80-100.
  var ZONE_RED = '#d9453a', ZONE_YELLOW = '#f2c20e', ZONE_GREEN = '#34a853';

  // Point on a circle for a 0-100 score: 0 at top (12 o'clock), clockwise (50 -> 6 o'clock).
  function ptOn(cx, rad, s) {
    var th = (s / 100) * 2 * Math.PI;
    return { x: cx + rad * Math.sin(th), y: cx - rad * Math.cos(th) };
  }
  function zoneArc(cx, r, stroke, s1, s2, color) {
    var p1 = ptOn(cx, r, s1), p2 = ptOn(cx, r, s2);
    var large = (s2 - s1) > 50 ? 1 : 0;
    return '<path fill="none" stroke="' + color + '" stroke-width="' + stroke + '" d="M ' +
      p1.x.toFixed(2) + ' ' + p1.y.toFixed(2) + ' A ' + r.toFixed(2) + ' ' + r.toFixed(2) +
      ' 0 ' + large + ' 1 ' + p2.x.toFixed(2) + ' ' + p2.y.toFixed(2) + '"/>';
  }
  // Triangle just outside the ring, pointing inward at the score's position.
  function marker(cx, r, stroke, ts, s) {
    var tipR = r + stroke / 2 + 1.5, baseR = tipR + ts;
    var half = ((ts / 2) / baseR) / (2 * Math.PI) * 100;
    var tip = ptOn(cx, tipR, s), b1 = ptOn(cx, baseR, s - half), b2 = ptOn(cx, baseR, s + half);
    return '<polygon points="' + tip.x.toFixed(2) + ',' + tip.y.toFixed(2) + ' ' +
      b1.x.toFixed(2) + ',' + b1.y.toFixed(2) + ' ' + b2.x.toFixed(2) + ',' + b2.y.toFixed(2) +
      '" fill="#1c2430"/>';
  }
  function centerWrap(cx, line1, line2, fs) {
    return '<text x="50%" y="50%" text-anchor="middle" fill="var(--muted)" ' +
      'style="font-size:' + fs + 'px;font-weight:600">' +
      '<tspan x="50%" dy="-0.1em">' + esc(line1) + '</tspan>' +
      '<tspan x="50%" dy="1.15em">' + esc(line2) + '</tspan></text>';
  }

  // Circular gauge: static red/yellow/green zones + a position triangle, score in the center.
  // `empty` => gray ring with "information needed".
  function gauge(score, size, label, empty) {
    var cx = size / 2;
    var stroke = size < 100 ? 6 : 9;          // ~33% thinner than before (was 9 / 13)
    var ts = size < 100 ? 6 : 8;              // triangle size
    var r = (size / 2) - (stroke / 2) - ts - 4;
    var head = '<svg class="gauge" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size +
      '" role="img" aria-label="' + esc(label || '') + (empty ? ' information needed' : ' score ' + Math.round(score) + ' of 100') + '">';

    if (empty) {
      return head +
        '<circle cx="' + cx + '" cy="' + cx + '" r="' + r.toFixed(2) + '" fill="none" stroke="#d3d8e0" stroke-width="' + stroke + '"/>' +
        centerWrap(cx, 'Information', 'needed', size < 100 ? 9 : 12) + '</svg>';
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    return head +
      zoneArc(cx, r, stroke, 0, 40, ZONE_RED) +
      zoneArc(cx, r, stroke, 40, 80, ZONE_YELLOW) +
      zoneArc(cx, r, stroke, 80, 100, ZONE_GREEN) +
      marker(cx, r, stroke, ts, score) +
      '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="gauge-num" ' +
      'style="font-size:' + (size < 100 ? 19 : 36) + 'px">' + score + '</text>' +
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
    if (a.performance && a.performance.provided) {
      bits.push('3-yr return ' + HARP.util.pct(a.performance.clientReturnPct) +
        ' vs ' + a.performance.benchmarkName + ' ' + HARP.util.pct(a.performance.benchmarkPct));
    }
    return bits.length ? '<div class="op-figures">' + bits.map(esc).join(' &nbsp;·&nbsp; ') + '</div>' : '';
  }

  function scores(a, filled) {
    var byKey = {};
    a.categories.forEach(function (c) { byKey[c.key] = c; });
    var order = ['investments', 'tax', 'legal', 'insurance'];
    var cats = order.map(function (k) { return byKey[k]; }).filter(Boolean);

    var completed = [];
    var catHtml = cats.map(function (c) {
      var ok = filled[c.key];
      if (ok) completed.push(c.score);
      return '<div class="op-cat">' + gauge(ok ? c.score : null, 96, c.label, !ok) +
        '<div class="op-cat-label">' + esc(c.label) + '</div></div>';
    }).join('');

    var overall = completed.length
      ? Math.round(completed.reduce(function (s, v) { return s + v; }, 0) / completed.length)
      : null;

    return '<div class="op-scores">' +
      '<div class="op-cats">' + catHtml + '</div>' +
      '<div class="op-overall-row">' +
        '<div class="op-overall">' + gauge(overall, 150, 'Overall', overall === null) +
          '<div class="op-overall-label">Overall health</div></div>' +
        '<div class="op-exec">' + execSummary(a, overall, cats, filled) + '</div>' +
      '</div>' +
      '</div>';
  }

  // Maps a finding to its category key using the engine's category definitions.
  function catKeyOfFinding(f) {
    var cats = HARP.assessment.CATEGORIES || [];
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].match.indexOf(f.category) >= 0) return cats[i].key;
    }
    return null;
  }

  // A category is "filled" when the user has entered data for it; otherwise its circle shows
  // "information needed" and it (and its findings) are excluded from the assessment.
  function filledByCategory(a) {
    var p = a.profile || {}, ins = p.insurance || {};
    return {
      investments: !!((p.holdings && p.holdings.length > 0) ||
                   (a.performance && a.performance.provided) ||
                   (a.concentration && a.concentration.total > 0)),
      tax: !!((a.tax && a.tax.total > 0) || (Number(p.income) || 0) > 0 ||
           (Number(p.agi) || 0) > 0 || (Number(p.totalTax) || 0) > 0),
      insurance: !!((ins.life && ins.life.has) || (ins.disability && ins.disability.has) ||
                 (ins.property && ins.property.has) || (ins.umbrella && ins.umbrella.has) ||
                 ins.ownsHome || (Number(ins.homeValue) || 0) > 0),
      legal: !!(p.legal && Object.keys(p.legal).some(function (k) { return p.legal[k]; }))
    };
  }

  function execSummary(a, overall, cats, filled) {
    if (overall === null) {
      return '<p>Enter information in the sections above to generate an overall assessment. ' +
        'Sections marked &ldquo;information needed&rdquo; are excluded until completed.</p>';
    }
    var band = overall < 40 ? 'needs significant attention' : overall < 80 ? 'is fair, with room to improve' : 'is strong';
    var crit = 0, mod = 0;
    a.findings.forEach(function (f) {
      var k = catKeyOfFinding(f);
      if (k !== null && !filled[k]) return;
      if (f.severity === 'risk') crit++; else if (f.severity === 'warn') mod++;
    });
    var weak = cats.filter(function (c) { return filled[c.key] && c.score < 80; })
      .sort(function (x, y) { return x.score - y.score; })
      .slice(0, 2).map(function (c) { return c.label; });
    var missing = cats.filter(function (c) { return !filled[c.key]; }).map(function (c) { return c.label; });

    var parts = ['Overall financial health ' + band + ' at ' + overall + '/100.'];
    parts.push((crit || mod)
      ? ' We flagged ' + crit + ' critical and ' + mod + ' moderate item' + ((crit + mod) === 1 ? '' : 's') +
        (weak.length ? ', concentrated in ' + weak.join(' and ') + '.' : '.')
      : ' No critical or moderate issues in the completed sections.');
    if (missing.length) {
      parts.push(' ' + missing.join(' and ') +
        (missing.length === 1 ? ' still needs information and is' : ' still need information and are') +
        ' excluded from the score.');
    }
    return '<p>' + esc(parts.join('')) + '</p>';
  }

  function findingHtml(f) {
    return '<div class="op-finding ' + f.severity + '">' +
      '<div class="op-fhead"><span class="badge ' + f.severity + '">' + SEV_LABEL[f.severity] + '</span>' +
      '<span class="op-ftitle">' + esc(f.title) + '</span></div>' +
      '<div class="op-fdetail">' + esc(f.detail) + '</div></div>';
  }

  function risks(a, filled) {
    // Only assess sections that are filled in; findings from "information needed" sections are
    // excluded (with their circle). Then show critical (risk) + moderate (warn), and footnote the
    // trimmed minor notes so the report stays to ~1-2 pages.
    var assessed = a.findings.filter(function (f) {
      var k = catKeyOfFinding(f);
      return k === null || filled[k];
    });
    var shown = assessed
      .filter(function (f) { return f.severity === 'risk' || f.severity === 'warn'; })
      .sort(function (x, y) { return SEV_ORDER[x.severity] - SEV_ORDER[y.severity]; });
    var trimmed = assessed.filter(function (f) { return f.severity === 'info'; }).length;

    var body = shown.length
      ? shown.map(findingHtml).join('')
      : '<p class="op-clean">No critical or moderate issues in the completed sections.</p>';
    if (trimmed > 0) {
      body += '<div class="op-trim">+ ' + trimmed + ' minor note' + (trimmed === 1 ? '' : 's') +
        ' reviewed and omitted from this summary.</div>';
    }
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
    var filled = filledByCategory(a);
    document.getElementById('report').innerHTML =
      header(a) + keyFigures(a) + scores(a, filled) + risks(a, filled) + footer();
  }

  return { render: render, gauge: gauge };
})();
