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
  // Softened / lower-saturation zone colors for a calmer look.
  var ZONE_RED = '#cf7268', ZONE_YELLOW = '#d8b95c', ZONE_GREEN = '#5fa37e';

  // Point on a circle for a 0-100 score: 0 at top (12 o'clock), clockwise (50 -> 6 o'clock).
  function ptOn(cx, rad, s) {
    var th = (s / 100) * 2 * Math.PI;
    return { x: cx + rad * Math.sin(th), y: cx - rad * Math.cos(th) };
  }
  function zoneArc(cx, r, stroke, s1, s2, color) {
    var p1 = ptOn(cx, r, s1), p2 = ptOn(cx, r, s2);
    var large = (s2 - s1) > 50 ? 1 : 0;
    return '<path fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-linecap="round" d="M ' +
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
    var g = 4; // small gap (%) between zones so the rounded ends break apart
    return head +
      zoneArc(cx, r, stroke, g / 2, 40 - g / 2, ZONE_RED) +
      zoneArc(cx, r, stroke, 40 + g / 2, 80 - g / 2, ZONE_YELLOW) +
      zoneArc(cx, r, stroke, 80 + g / 2, 100 - g / 2, ZONE_GREEN) +
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
      '<div class="op-firm">' + logo + '<span class="op-firm-tag">Integrated Wealth Strategies</span></div>' +
      '<div class="op-meta"><div class="op-harp">HARP</div>' +
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

  // Circles only — exec summary moved to its own section. Sizes are ~25% larger than before.
  function scores(cats, filled, overall) {
    var catHtml = cats.map(function (c) {
      var ok = filled[c.key];
      return '<div class="op-cat">' + gauge(ok ? c.score : null, 120, c.label, !ok) +
        '<div class="op-cat-label">' + esc(c.label) + '</div></div>';
    }).join('');
    return '<div class="op-scores">' +
      '<div class="op-cats">' + catHtml + '</div>' +
      '<div class="op-overall-row">' +
        '<div class="op-overall">' + gauge(overall, 188, 'Overall', overall === null) +
          '<div class="op-overall-label">Overall health</div></div>' +
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
      insurance: !!(ins.hasPolicies || (ins.policyTypes && ins.policyTypes.length) ||
                 (Number(ins.totalFaceValue) || 0) > 0),
      legal: !!(p.legal && Object.keys(p.legal).some(function (k) { return p.legal[k]; }))
    };
  }

  function naturalJoin(arr) {
    if (arr.length <= 1) return arr.join('');
    if (arr.length === 2) return arr[0] + ' and ' + arr[1];
    return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
  }
  // Turn a finding title into a short phrase for the critical-issues list.
  function shortIssue(title) {
    var m = title.match(/^Missing:\s*(.+)$/i);
    if (m) return 'missing ' + m[1].charAt(0).toLowerCase() + m[1].slice(1);
    var u = title.match(/^Potentially underinsured \(([^)]+)\)$/i);
    if (u) return 'underinsured ' + u[1].toLowerCase() + ' coverage';
    return title.replace(/\bis\b(\s+[\d.]+% of the portfolio)/, 'at$1').replace(/^Potentially\s+/i, '');
  }

  // Executive summary: <=3 sentences, focused on critical issues. Groups the sector pairs
  // (investments+tax, legal+insurance) and names a few specific gaps.
  function execSummary(a, overall, cats, filled) {
    if (overall === null) {
      return '<p>Enter information in the sections above to generate an assessment. ' +
        'Sections marked &ldquo;information needed&rdquo; are excluded until completed.</p>';
    }

    var crit = a.findings.filter(function (f) {
      var k = catKeyOfFinding(f);
      return f.severity === 'risk' && (k === null || filled[k]);
    });
    var missing = cats.filter(function (c) { return !filled[c.key]; }).map(function (c) { return c.label; });
    var missTail = missing.length ? ' ' + naturalJoin(missing) +
      (missing.length === 1 ? ' still needs information.' : ' still need information.') : '';

    if (!crit.length) {
      return '<p>' + esc('No critical issues stand out across the completed sections.' + missTail) + '</p>';
    }

    var GROUPS = [
      { label: 'investment and tax planning', keys: ['investments', 'tax'] },
      { label: 'legal and insurance coverage', keys: ['legal', 'insurance'] }
    ];
    var hit = GROUPS.filter(function (g) {
      return crit.some(function (f) { return g.keys.indexOf(catKeyOfFinding(f)) >= 0; });
    }).map(function (g) { return g.label; });

    // One representative critical issue per category (display order), up to 3.
    var issues = [];
    ['investments', 'tax', 'legal', 'insurance'].forEach(function (k) {
      if (issues.length >= 3) return;
      var f = crit.filter(function (x) { return catKeyOfFinding(x) === k; })[0];
      if (f) issues.push(shortIssue(f.title));
    });

    var s1 = 'There is significant risk ' +
      (hit.length > 1 ? 'across your ' + hit.join(' and your ') : 'in your ' + (hit[0] || 'completed sections')) + '.';
    var s2 = ' Key issues include ' + naturalJoin(issues) + (crit.length > issues.length ? ', among others.' : '.');
    return '<p>' + esc(s1 + s2 + missTail) + '</p>';
  }

  function findingHtml(f) {
    return '<div class="op-finding ' + f.severity + '">' +
      '<div class="op-fhead"><span class="badge ' + f.severity + '">' + SEV_LABEL[f.severity] + '</span>' +
      '<span class="op-ftitle">' + esc(f.title) + '</span></div>' +
      '<div class="op-fdetail">' + esc(f.detail) + '</div></div>';
  }

  // Critical (risk) + moderate (warn) findings from completed sections, severity-sorted; plus the
  // count of trimmed minor notes. Shared by the Key risks and Recommendations sections.
  function severityFindings(a, filled) {
    var assessed = a.findings.filter(function (f) {
      var k = catKeyOfFinding(f);
      return k === null || filled[k];
    });
    return {
      shown: assessed.filter(function (f) { return f.severity === 'risk' || f.severity === 'warn'; })
        .sort(function (x, y) { return SEV_ORDER[x.severity] - SEV_ORDER[y.severity]; }),
      trimmed: assessed.filter(function (f) { return f.severity === 'info'; }).length
    };
  }
  // Key risks: the issues themselves (badge + title), no recommendation text.
  function keyRisks(a, filled) {
    var shown = severityFindings(a, filled).shown;
    var body = shown.length
      ? shown.map(function (f) {
          return '<div class="op-finding ' + f.severity + '"><div class="op-fhead">' +
            '<span class="badge ' + f.severity + '">' + SEV_LABEL[f.severity] + '</span>' +
            '<span class="op-ftitle">' + esc(f.title) + '</span></div></div>';
        }).join('')
      : '<p class="op-clean">No critical or moderate issues in the completed sections.</p>';
    return '<div class="op-risks"><h3>Key risks</h3>' + body + '</div>';
  }
  // Recommendations: the suggested actions (each finding's detail), in their own section.
  function recommendations(a, filled) {
    var s = severityFindings(a, filled);
    if (!s.shown.length && !s.trimmed) return '';
    var body = s.shown.map(function (f) {
      return '<div class="op-rec"><span class="op-rec-title">' + esc(f.title) + '</span>' +
        '<span class="op-rec-detail">' + esc(f.detail) + '</span></div>';
    }).join('');
    if (s.trimmed > 0) {
      body += '<div class="op-trim">+ ' + s.trimmed + ' minor note' + (s.trimmed === 1 ? '' : 's') +
        ' reviewed and omitted from this summary.</div>';
    }
    return '<div class="op-recs"><h3>Recommendations</h3>' + body + '</div>';
  }

  function footer() {
    var b = HARP.config.branding;
    var firm = b.firmName || 'Brookhaven';
    var contact = [firm + ' · Integrated Wealth Solutions', b.contact.phone, b.contact.email, b.contact.website]
      .filter(Boolean).map(esc).join(' · ');
    var disc = 'This Health & Risk Profile is provided by ' + firm + ' for informational and educational ' +
      'purposes only and does not constitute financial, investment, tax, legal, or insurance advice, nor an ' +
      'offer or solicitation to buy or sell any security or product. Figures are estimates based on the ' +
      'information provided and on general assumptions that may not reflect your specific circumstances, and ' +
      'are not guarantees of future results. Investing involves risk, including possible loss of principal. ' +
      'Make insurance, tax, and estate decisions only after consulting appropriately licensed professionals.';
    return '<div class="op-footer">' +
      '<div class="op-contact">' + contact + '</div>' +
      '<div class="op-disc"><strong>Disclosures.</strong> ' + esc(disc) + ' Prepared ' + today() + '.</div>' +
      '</div>';
  }

  function render(a) {
    var filled = filledByCategory(a);
    var byKey = {};
    a.categories.forEach(function (c) { byKey[c.key] = c; });
    var cats = ['investments', 'tax', 'legal', 'insurance'].map(function (k) { return byKey[k]; }).filter(Boolean);
    var completed = cats.filter(function (c) { return filled[c.key]; }).map(function (c) { return c.score; });
    var overall = completed.length ? Math.round(completed.reduce(function (s, v) { return s + v; }, 0) / completed.length) : null;

    document.getElementById('report').innerHTML =
      header(a) +
      scores(cats, filled, overall) +
      '<div class="op-exec-block"><h3>Executive summary</h3>' + execSummary(a, overall, cats, filled) + '</div>' +
      keyRisks(a, filled) +
      recommendations(a, filled) +
      footer();
  }

  return { render: render, gauge: gauge };
})();
