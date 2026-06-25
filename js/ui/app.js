// The only DOM-aware module. Wires the form to the engine and renders the report.
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var esc = HARP.util.escape;
  var money = HARP.util.money;
  var pct = HARP.util.pct;

  // ---------------------------------------------------------------- holdings rows
  function sectorOptions(selected) {
    return HARP.sectors.list.map(function (s) {
      var sel = s === selected ? ' selected' : '';
      return '<option value="' + esc(s) + '"' + sel + '>' + esc(s) + '</option>';
    }).join('');
  }

  function addHoldingRow(h) {
    h = h || { ticker: '', name: '', sector: '', value: '' };
    var tbody = $('holdings-body');
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><input type="text" class="h-ticker" value="' + esc(h.ticker) + '" placeholder="AAPL" /></td>' +
      '<td><input type="text" class="h-name" value="' + esc(h.name) + '" placeholder="Apple Inc." /></td>' +
      '<td><select class="h-sector">' + sectorOptions(h.sector) + '</select></td>' +
      '<td class="num"><input type="number" class="h-value" min="0" step="1000" value="' + esc(h.value) + '" placeholder="0" /></td>' +
      '<td><button type="button" class="icon-btn" title="Remove" aria-label="Remove holding">&times;</button></td>';
    tbody.appendChild(tr);

    // Auto-fill sector from a known ticker, unless the user has touched the dropdown.
    var tickerEl = tr.querySelector('.h-ticker');
    var sectorEl = tr.querySelector('.h-sector');
    sectorEl.addEventListener('change', function () { sectorEl.dataset.touched = '1'; });
    tickerEl.addEventListener('input', function () {
      if (sectorEl.dataset.touched) return;
      var found = HARP.sectors.lookup(tickerEl.value);
      if (found) sectorEl.value = found;
    });
    tr.querySelector('.icon-btn').addEventListener('click', function () { tr.remove(); });
  }

  function readHoldings() {
    var rows = $('holdings-body').querySelectorAll('tr');
    var out = [];
    rows.forEach(function (tr) {
      var value = parseFloat(tr.querySelector('.h-value').value) || 0;
      var name = tr.querySelector('.h-name').value.trim();
      var ticker = tr.querySelector('.h-ticker').value.trim();
      if (value <= 0 && !name && !ticker) return; // skip empty rows
      out.push({
        ticker: ticker,
        name: name,
        sector: tr.querySelector('.h-sector').value,
        value: value
      });
    });
    return out;
  }

  // ---------------------------------------------------------------- form <-> profile
  function readProfile() {
    return {
      name: $('name').value.trim(),
      income: parseFloat($('income').value) || 0,
      dependents: parseInt($('dependents').value, 10) || 0,
      lifeCoverage: parseFloat($('lifeCoverage').value) || 0,
      taxable: parseFloat($('taxable').value) || 0,
      taxDeferred: parseFloat($('taxDeferred').value) || 0,
      taxFree: parseFloat($('taxFree').value) || 0,
      holdings: readHoldings(),
      legal: {
        will: $('legal-will').checked,
        poa: $('legal-poa').checked,
        healthcare: $('legal-healthcare').checked,
        beneficiaries: $('legal-beneficiaries').checked,
        trust: $('legal-trust').checked
      }
    };
  }

  function loadProfile(p) {
    $('name').value = p.name || '';
    $('income').value = p.income || '';
    $('dependents').value = p.dependents || '';
    $('lifeCoverage').value = p.lifeCoverage || '';
    $('taxable').value = p.taxable || '';
    $('taxDeferred').value = p.taxDeferred || '';
    $('taxFree').value = p.taxFree || '';

    var legal = p.legal || {};
    $('legal-will').checked = !!legal.will;
    $('legal-poa').checked = !!legal.poa;
    $('legal-healthcare').checked = !!legal.healthcare;
    $('legal-beneficiaries').checked = !!legal.beneficiaries;
    $('legal-trust').checked = !!legal.trust;

    $('holdings-body').innerHTML = '';
    (p.holdings || []).forEach(addHoldingRow);
    if (!(p.holdings || []).length) addHoldingRow();
  }

  // ---------------------------------------------------------------- report rendering
  var SEVERITY_ORDER = { risk: 0, warn: 1, info: 2, ok: 3 };
  var SEVERITY_LABEL = { risk: 'Risk', warn: 'Watch', info: 'Note', ok: 'OK' };

  function findingHtml(f) {
    return '<div class="finding ' + f.severity + '">' +
      '<div class="fcat">' + esc(f.category) + '</div>' +
      '<div><span class="badge ' + f.severity + '">' + SEVERITY_LABEL[f.severity] + '</span>' +
      '<span class="ftitle">' + esc(f.title) + '</span></div>' +
      '<div class="fdetail">' + esc(f.detail) + '</div>' +
      '</div>';
  }

  function barCell(p) {
    var w = Math.max(2, Math.min(100, p));
    return '<td class="bar-cell"><div class="bar-track"><div class="bar" style="width:' + w + '%"></div></div></td>';
  }

  function render(a) {
    var p = a.profile;
    var today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    var html = '';

    // Header + score
    html += '<div class="report-head">' +
      '<div><h2>' + (esc(p.name) || 'Health &amp; Risk Profile') + '</h2>' +
      '<div class="report-meta">HARP recommendation report · ' + today + '</div></div>' +
      '<div class="score"><div class="num">' + a.score.value + '</div>' +
      '<div class="band">' + esc(a.score.band) + '</div></div>' +
      '</div>';

    html += '<div class="report-meta">' +
      a.counts.risk + ' risk · ' + a.counts.warn + ' watch · ' + a.counts.info + ' note · ' + a.counts.ok + ' ok' +
      '</div>';

    // Recommendations (sorted by severity)
    html += '<h3>Recommendations &amp; observations</h3>';
    var sorted = a.findings.slice().sort(function (x, y) {
      return SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity];
    });
    html += sorted.length ? sorted.map(findingHtml).join('') :
      '<p class="placeholder">No findings — looks healthy across the board.</p>';

    // Investment exposure
    if (a.concentration.total > 0) {
      html += '<h3>Investment exposure</h3>';
      html += '<table class="data"><thead><tr><th>Holding</th><th>Sector</th><th class="num">Value</th><th class="num">% of portfolio</th><th></th></tr></thead><tbody>';
      a.concentration.positions.forEach(function (pos) {
        html += '<tr><td>' + esc(pos.name) + '</td><td>' + esc(pos.sector) + '</td>' +
          '<td class="num">' + money(pos.value) + '</td><td class="num">' + pct(pos.pct) + '</td>' +
          barCell(pos.pct) + '</tr>';
      });
      html += '</tbody></table>';

      html += '<table class="data"><thead><tr><th>Sector</th><th class="num">Value</th><th class="num">% of portfolio</th><th></th></tr></thead><tbody>';
      a.concentration.sectors.forEach(function (s) {
        html += '<tr><td>' + esc(s.name) + '</td><td class="num">' + money(s.value) + '</td>' +
          '<td class="num">' + pct(s.pct) + '</td>' + barCell(s.pct) + '</tr>';
      });
      html += '</tbody></table>';
    }

    // Insurance
    var ins = a.insurance.result;
    if (ins.status !== 'unknown') {
      html += '<h3>Insurance</h3>';
      html += '<table class="data"><tbody>' +
        '<tr><td>Estimated life-insurance need</td><td class="num">' + money(ins.need) + '</td></tr>' +
        '<tr><td>Current coverage</td><td class="num">' + money(ins.coverage) + '</td></tr>' +
        '<tr><td>Gap</td><td class="num">' + money(ins.gap) + '</td></tr>' +
        '</tbody></table>';
    }

    // Tax buckets
    if (a.tax.total > 0) {
      html += '<h3>Tax diversification</h3>';
      html += '<table class="data"><thead><tr><th>Bucket</th><th class="num">Value</th><th class="num">Share</th></tr></thead><tbody>';
      a.tax.buckets.forEach(function (b) {
        html += '<tr><td>' + esc(b.label) + '</td><td class="num">' + money(b.value) + '</td>' +
          '<td class="num">' + pct(b.pct || 0) + '</td></tr>';
      });
      html += '</tbody></table>';
    }

    // Legal checklist
    html += '<h3>Legal / estate readiness</h3>';
    a.legal.essentials.forEach(function (item) {
      var has = !!a.legal.have[item.key];
      html += '<div class="checkrow">' +
        '<span class="' + (has ? 'yes' : 'no') + '">' + (has ? '✓' : '✗') + '</span>' +
        '<span>' + esc(item.label) + '</span></div>';
    });

    // Actions (screen only) + disclaimer
    html += '<div class="report-actions actions no-print" style="margin-top:18px">' +
      '<button type="button" class="primary" id="print-btn">Print / Save as PDF</button></div>';

    html += '<div class="disclaimer">This report is informational only and does not constitute financial, ' +
      'tax, legal, or insurance advice. Thresholds are configurable starting points. ' +
      'Generated by HARP on ' + today + '.</div>';

    var report = $('report');
    report.innerHTML = html;
    var printBtn = $('print-btn');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
    report.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- wiring
  document.addEventListener('DOMContentLoaded', function () {
    addHoldingRow(); // start with one empty row

    $('add-holding').addEventListener('click', function () { addHoldingRow(); });

    $('harp-form').addEventListener('submit', function (e) {
      e.preventDefault();
      render(HARP.assessment.run(readProfile()));
    });

    $('load-sample').addEventListener('click', function () {
      loadProfile(HARP.sample);
      render(HARP.assessment.run(readProfile()));
    });

    $('reset').addEventListener('click', function () {
      $('harp-form').reset();
      $('holdings-body').innerHTML = '';
      addHoldingRow();
      $('report').innerHTML = '<p class="placeholder">Fill in the profile and click <strong>Assess</strong> to generate a recommendation report.</p>';
    });
  });
})();
