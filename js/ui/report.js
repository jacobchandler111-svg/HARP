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
  // Keep the triangle on a colored arc instead of in an inter-zone gap: a raw 100 would point to the
  // gap just past green, a 40 or 80 to the gaps between zones. Map the score's band onto its own arc
  // segment (0-40 -> red arc, 40-80 -> yellow arc, 80-100 -> green arc) using the same gap `g`.
  function markerPos(s, g) {
    var h = g / 2;
    if (s < 40) return h + (s / 40) * (40 - 2 * h);
    if (s < 80) return (40 + h) + ((s - 40) / 40) * (40 - 2 * h);
    return (80 + h) + ((s - 80) / 20) * (20 - 2 * h);
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
    var stroke = size < 150 ? 5 : 6;          // thin rings; the larger diameter carries the size
    var ts = size < 150 ? 6 : 7;              // triangle size
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
      marker(cx, r, stroke, ts, markerPos(score, g)) +
      '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="gauge-num" ' +
      'style="font-size:' + Math.round(size * 0.2) + 'px">' + score + '</text>' +
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
  function scores(a, cats, filled, overall) {
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
        '<div class="op-exec"><h4 class="op-exec-h">Executive summary</h4>' + execSummary(a, overall, cats, filled) + '</div>' +
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
                   (Number(p.fixedIncomeValue) || 0) > 0 ||
                   (a.allocation && a.allocation.actualStockPct != null) ||
                   (a.performance && a.performance.provided) ||
                   (a.concentration && a.concentration.total > 0)),
      tax: !!((a.tax && a.tax.total > 0) || (Number(p.income) || 0) > 0 ||
           (Number(p.agi) || 0) > 0 || (Number(p.totalTax) || 0) > 0),
      // The insurance Yes/No always carries a definite answer (the toggle defaults to "No"), and
      // "no insurance" is a real, scored state (15). So a definite Yes or No counts as assessed and is
      // included in the overall — not shown as "information needed" and dropped from the average.
      insurance: typeof ins.hasPolicies === 'boolean' || (Number(ins.totalFaceValue) || 0) > 0,
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

    // Name only the categories that actually carry a critical — green/healthy sections are excluded.
    var critKeys = {};
    crit.forEach(function (f) { var k = catKeyOfFinding(f); if (k) critKeys[k] = true; });
    var concerning = cats.filter(function (c) { return critKeys[c.key]; }).map(function (c) { return c.label.toLowerCase(); });

    // One representative critical issue per concerning category (display order), up to 3.
    var issues = [];
    ['investments', 'tax', 'legal', 'insurance'].forEach(function (k) {
      if (issues.length >= 3) return;
      var f = crit.filter(function (x) { return catKeyOfFinding(x) === k; })[0];
      if (f) issues.push(shortIssue(f.title));
    });

    var s1 = 'There is significant risk in your ' + (concerning.length ? naturalJoin(concerning) : 'completed sections') + '.';
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
  // Recommendations: ONE tailored, action-oriented recommendation per area (not a restatement of the
  // key risks). Multiple risks in an area roll up into a single "speak with our team to ..." action.
  function groupByArea(shown) {
    var g = { investments: [], tax: [], legal: [], insurance: [] };
    shown.forEach(function (f) { var k = catKeyOfFinding(f); if (g[k]) g[k].push(f); });
    return g;
  }
  function investmentRec(fs) {
    var tickers = [], sectors = [], perf = false, gains = false, shortfall = false, alloc = false;
    fs.forEach(function (f) {
      if (f.category === 'Investment concentration') { var m = f.title.match(/^(\S+)/); if (m) tickers.push(m[1]); }
      else if (f.category === 'Sector exposure') { var s = f.title.match(/^(.+?) sector is/); if (s) sectors.push(s[1]); }
      else if (f.category === 'Asset allocation') alloc = true;
      else if (f.category === 'Investment performance') perf = true;
      else if (f.category === 'Unrealized gains') gains = true;
      else if (f.category === 'Investment income') shortfall = true;
    });
    var bits = [];
    if (tickers.length) bits.push('trimming the concentrated positions (' + tickers.join(', ') + ')');
    if (sectors.length) bits.push('reducing your ' + naturalJoin(sectors) + ' concentration');
    if (alloc) bits.push('rebalancing toward an age-appropriate stock / fixed-income mix');
    if (gains) bits.push('managing the embedded gains tax-efficiently');
    if (perf) bits.push('pursuing a stronger risk-adjusted return relative to the market');
    if (shortfall) bits.push('closing the gap between your portfolio income and your withdrawals');
    var lead = (tickers.length || sectors.length) ? 'build a more diversified investment plan'
             : shortfall ? 'strengthen your income plan'
             : 'strengthen your investment plan';
    return 'Speak with one of our advisors to ' + lead + (bits.length ? ' — ' + naturalJoin(bits) : '') + '.';
  }
  function taxRec(fs) {
    var standard = fs.some(function (f) { return /standard deduction/i.test(f.title); });
    return 'Speak with our accounting team to put a more tax-efficient plan in place' +
      (standard ? ' — at this income there are likely deductions and planning opportunities going unclaimed.' : '.');
  }
  function legalRec(fs) {
    var missing = [], overdue = [];
    fs.forEach(function (f) {
      var mm = f.title.match(/^Missing:\s*(.+)$/i);
      if (mm) { missing.push(mm[1].charAt(0).toLowerCase() + mm[1].slice(1)); return; }
      if (/asset-protection trust/i.test(f.title)) { missing.push('an asset-protection trust'); return; }
      var od = f.title.match(/^(Will|Trust)/i);
      if (od && /out of date/i.test(f.title)) overdue.push(od[1].toLowerCase());
    });
    var parts = [];
    if (overdue.length) parts.push('review and update your ' + naturalJoin(overdue));
    if (missing.length) parts.push('put ' + naturalJoin(missing) + ' in place');
    return 'Meet with our legal team to ' + (parts.length ? naturalJoin(parts) : 'review your estate plan') + '.';
  }
  function insuranceRec(fs) {
    var none = fs.some(function (f) { return /no insurance/i.test(f.title); });
    var under = fs.some(function (f) { return /underinsured/i.test(f.title); });
    var aged = fs.some(function (f) { return /out of date/i.test(f.title); });
    var acts = [];
    if (none) acts.push('put appropriate coverage in place');
    if (under) acts.push('increase your coverage to close the gap against your liabilities and future income');
    if (aged) acts.push('review your existing policy');
    return 'Speak with one of our advisors to ' + (acts.length ? naturalJoin(acts) : 'review your coverage') + '.';
  }
  function recommendations(a, filled) {
    var s = severityFindings(a, filled);
    if (!s.shown.length && !s.trimmed) return '';
    var g = groupByArea(s.shown);
    var areas = [
      { key: 'investments', label: 'Investments', fn: investmentRec },
      { key: 'tax', label: 'Tax', fn: taxRec },
      { key: 'legal', label: 'Legal & estate', fn: legalRec },
      { key: 'insurance', label: 'Insurance', fn: insuranceRec }
    ];
    var body = areas.filter(function (b) { return g[b.key].length; }).map(function (b) {
      return '<div class="op-rec"><span class="op-rec-title">' + b.label + '</span>' +
        '<span class="op-rec-detail">' + esc(b.fn(g[b.key])) + '</span></div>';
    }).join('');
    if (!body) body = '<p class="op-clean">No actions needed in the completed sections.</p>';
    if (s.trimmed > 0) {
      body += '<div class="op-trim">+ ' + s.trimmed + ' minor note' + (s.trimmed === 1 ? '' : 's') + ' reviewed.</div>';
    }
    return '<div class="op-recs"><h3>Recommendations</h3>' + body + '</div>';
  }

  function footer() {
    var b = HARP.config.branding;
    var firm = b.firmName || 'Brookhaven';
    var contact = [firm + ' · Integrated Wealth Strategies', b.contact.phone, b.contact.email, b.contact.website]
      .filter(Boolean).map(esc).join(' · ');
    // Disclosure text is owned by the engine in config.branding.disclaimer (single source of truth);
    // fall back to a short notice if config doesn't define one.
    var disc = b.disclaimer || ('This report is informational only and does not constitute financial, tax, ' +
      'legal, or insurance advice. Please consult the appropriate licensed professional before acting.');
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

    // Header in <thead>, body in <tbody>, disclosures in <tfoot>: in print the thead/tfoot become a
    // table-header-group / table-footer-group, which the browser repeats at the top and bottom of
    // EVERY page (reserving their space), so the same Brookhaven header and disclosures print on each
    // page and the body flows in between — no @page margins needed, so the browser's own header/footer
    // stay suppressed. On screen the table renders as plain blocks (see .op-sheet in styles.css), so
    // the layout is unchanged: header, body, footer stacked.
    document.getElementById('report').innerHTML =
      '<table class="op-sheet">' +
      '<thead class="op-head"><tr><td>' + header(a) + '</td></tr></thead>' +
      '<tbody class="op-body"><tr><td>' +
        scores(a, cats, filled, overall) +
        keyRisks(a, filled) +
        recommendations(a, filled) +
      '</td></tr></tbody>' +
      '<tfoot class="op-foot"><tr><td>' + footer() + '</td></tr></tfoot></table>';
  }

  return { render: render, gauge: gauge };
})();
