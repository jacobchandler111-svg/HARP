// Reads the four input sections into a profile object, and populates the form from one.
// This is the only place that knows the form's DOM layout.
window.HARP = window.HARP || {};
HARP.ui = HARP.ui || {};

HARP.ui.forms = (function () {
  var esc = HARP.util.escape;
  function $(id) { return document.getElementById(id); }
  function val(id) { var e = $(id); return e ? e.value.trim() : ''; }
  function num(id) { return parseFloat(val(id)) || 0; }
  // Like num(), but keeps a blank field as '' (not 0) so an unanswered value is not read as a real 0.
  function numOrBlank(id) { var v = val(id); return v === '' ? '' : parseFloat(v); }
  function int(id) { return parseInt(val(id), 10) || 0; }
  function checked(id) { var e = $(id); return e ? e.checked : false; }
  function setVal(id, v) { var e = $(id); if (e) e.value = (v == null ? '' : v); }
  function setChecked(id, v) { var e = $(id); if (e) e.checked = !!v; }
  function selectedValues(selectEl) {
    if (!selectEl) return [];
    return Array.prototype.filter.call(selectEl.options, function (o) { return o.selected; })
      .map(function (o) { return o.value; });
  }
  function setMultiSelect(selectEl, values) {
    if (!selectEl) return;
    var sel = values || [];
    Array.prototype.forEach.call(selectEl.options, function (o) { o.selected = sel.indexOf(o.value) >= 0; });
  }

  // ---------------------------------------------------------------- holdings
  function sectorOptions(selected) {
    return HARP.sectors.list.map(function (s) {
      return '<option value="' + esc(s) + '"' + (s === selected ? ' selected' : '') + '>' + esc(s) + '</option>';
    }).join('');
  }
  function addHoldingRow(h) {
    h = h || { ticker: '', name: '', sector: '', value: '' };
    var tr = document.createElement('tr');
    // Cost basis is not a manual field — it only arrives from a scanned statement (Phase 2). Keep it
    // invisibly on the row so loaded/scanned data round-trips and the embedded-gain check still works.
    tr.dataset.costBasis = (h.costBasis == null ? '' : h.costBasis);
    tr.innerHTML =
      '<td><input type="text" class="h-ticker" value="' + esc(h.ticker) + '" placeholder="AAPL" /></td>' +
      '<td><input type="text" class="h-name" value="' + esc(h.name) + '" placeholder="Apple Inc." /></td>' +
      '<td><select class="h-sector">' + sectorOptions(h.sector) + '</select></td>' +
      '<td class="num"><input type="number" class="h-value" min="0" step="1000" value="' + esc(h.value) + '" placeholder="0" /></td>' +
      '<td><button type="button" class="icon-btn" title="Remove">&times;</button></td>';
    $('holdings-body').appendChild(tr);

    var tickerEl = tr.querySelector('.h-ticker');
    var sectorEl = tr.querySelector('.h-sector');
    sectorEl.addEventListener('change', function () { sectorEl.dataset.touched = '1'; });
    tickerEl.addEventListener('input', function () {
      if (sectorEl.dataset.touched) return;
      var found = HARP.sectors.lookup(tickerEl.value);
      if (found) sectorEl.value = found;
    });
    tr.querySelector('.icon-btn').addEventListener('click', function () { tr.remove(); scheduleSave(); });
  }
  function readHoldings() {
    var out = [];
    $('holdings-body').querySelectorAll('tr').forEach(function (tr) {
      var value = parseFloat(tr.querySelector('.h-value').value) || 0;
      var name = tr.querySelector('.h-name').value.trim();
      var ticker = tr.querySelector('.h-ticker').value.trim();
      if (value <= 0 && !name && !ticker) return; // skip empty rows
      var basis = tr.dataset.costBasis;
      out.push({ ticker: ticker, name: name, sector: tr.querySelector('.h-sector').value, value: value,
        costBasis: (basis == null || basis === '') ? '' : (parseFloat(basis) || 0) });
    });
    return out;
  }

  // ---------------------------------------------------------------- performance (most recent full year)
  function perfYear() { return new Date().getFullYear() - 1; }
  function buildPerformanceInputs() {
    var y = perfYear();
    $('performance-inputs').innerHTML =
      '<label>' + y + ' return (%) <span class="opt">(most recent full year)</span>' +
      '<input type="number" id="yearReturnPct" step="0.1" placeholder="e.g. 12.5" /></label>';
  }

  // ---------------------------------------------------------------- insurance
  function policyTypeOptions() {
    return HARP.insurance.POLICY_TYPES.map(function (t) {
      return '<option value="' + esc(t.key) + '">' + esc(t.label) + '</option>';
    }).join('');
  }
  function syncInsuranceCascade() {
    var has = $('ins-hasPolicies');
    if (has) $('ins-policies-followup').hidden = !has.checked;
  }
  function buildInsuranceInputs() {
    $('insurance-inputs').innerHTML =
      '<div class="ins-q">' +
        '<label><input type="checkbox" id="ins-hasPolicies" /> Has insurance policies</label>' +
        '<div class="legal-followup" id="ins-policies-followup" hidden>' +
          '<label>What policies? <span class="opt">(select all that apply)</span>' +
            '<select id="ins-policyTypes" multiple size="4">' + policyTypeOptions() + '</select></label>' +
          '<label>Total face value of all policies ($)<input type="number" id="ins-totalFaceValue" min="0" step="1000" placeholder="0" /></label>' +
        '</div>' +
      '</div>';
    var has = $('ins-hasPolicies');
    if (has) has.addEventListener('change', syncInsuranceCascade);
    syncInsuranceCascade();
  }
  function readInsurance() {
    return {
      hasPolicies: checked('ins-hasPolicies'),
      policyTypes: selectedValues($('ins-policyTypes')),
      totalFaceValue: num('ins-totalFaceValue')
    };
  }
  function loadInsurance(ins) {
    ins = ins || {};
    setChecked('ins-hasPolicies', !!ins.hasPolicies);
    setMultiSelect($('ins-policyTypes'), ins.policyTypes);
    setVal('ins-totalFaceValue', ins.totalFaceValue);
    syncInsuranceCascade();
  }

  // ---------------------------------------------------------------- legal
  // Nicer question phrasing per essential-document key (falls back to the engine's label).
  var LEGAL_Q = {
    poa: 'Have you designated a financial power of attorney?',
    healthcare: 'Do you have a healthcare directive / medical POA?',
    beneficiaries: 'Have your beneficiary designations been reviewed in the last 12 months?',
    guardianship: 'Have you designated a guardian for any minor children?',
    assetInventory: 'Do you have an asset inventory / letter of instruction?'
  };
  // "How long since reviewed" dropdown. Values are representative year counts so the engine's
  // reviewSeverity (>5 => risk, >3 => warn) reads them directly.
  function reviewOptions() {
    return '<option value="">Select…</option>' +
      '<option value="1">Within the last year</option>' +
      '<option value="2">1–3 years ago</option>' +
      '<option value="4">3–5 years ago</option>' +
      '<option value="8">More than 5 years ago</option>' +
      '<option value="99">Never reviewed</option>';
  }
  // A "question on the left, Yes / No toggle on the right" row, backed by a radio pair.
  function yesNoRow(key, question) {
    var n = 'legal-' + key;
    return '<div class="q-row">' +
      '<span class="q-label">' + esc(question) + '</span>' +
      '<span class="yesno" role="radiogroup" aria-label="' + esc(question) + '">' +
        '<input type="radio" name="' + n + '" id="' + n + '-yes" value="1">' +
        '<label for="' + n + '-yes">Yes</label>' +
        '<input type="radio" name="' + n + '" id="' + n + '-no" value="0" checked>' +
        '<label for="' + n + '-no">No</label>' +
      '</span></div>';
  }
  function trustTypeChecks() {
    return HARP.legal.TRUST_TYPES.map(function (t) {
      return '<label class="trust-type-opt"><input type="checkbox" class="trust-type" value="' + esc(t.key) + '"> ' + esc(t.label) + '</label>';
    }).join('');
  }
  function radioBool(key) { var e = $('legal-' + key + '-yes'); return !!(e && e.checked); }
  function setRadioBool(key, v) {
    var y = $('legal-' + key + '-yes'), n = $('legal-' + key + '-no');
    if (y) y.checked = !!v;
    if (n) n.checked = !v;
  }
  function trustTypesChecked() {
    return Array.prototype.map.call(document.querySelectorAll('#legal-checklist .trust-type:checked'),
      function (c) { return c.value; });
  }

  function syncLegalCascade() {
    var wf = $('legal-will-followup');
    if (wf) wf.hidden = !radioBool('will');
    var trustOn = radioBool('trust');
    var tf = $('legal-trust-followup');
    if (tf) tf.hidden = !trustOn;
    var tr = $('legal-trustReviewed-followup');
    if (tr) tr.hidden = !(trustOn && trustTypesChecked().length > 0);
  }
  function wireLegalCascade() {
    // Radios + trust-type checkboxes are injected, so delegate from the container.
    $('legal-checklist').addEventListener('change', function (e) {
      var t = e.target;
      if (!t) return;
      if (/^legal-(will|trust)-(yes|no)$/.test(t.id) || (t.classList && t.classList.contains('trust-type'))) {
        syncLegalCascade();
      }
    });
  }
  function buildLegalChecklist() {
    var rest = HARP.legal.ESSENTIALS
      .filter(function (item) { return item.key !== 'poa'; })
      .map(function (item) { return yesNoRow(item.key, LEGAL_Q[item.key] || ('Do you have ' + item.label.toLowerCase() + '?')); })
      .join('');

    $('legal-checklist').innerHTML =
      yesNoRow('will', 'Do you have a will?') +
      '<div class="q-followup" id="legal-will-followup" hidden>' +
        '<label>How long since your will was last reviewed?' +
          '<select id="legal-willReviewedYears">' + reviewOptions() + '</select></label>' +
      '</div>' +
      yesNoRow('poa', LEGAL_Q.poa) +
      yesNoRow('trust', 'Do you have a trust set up?') +
      '<div class="q-followup" id="legal-trust-followup" hidden>' +
        '<div class="subq-label">What type(s) of trust? <span class="opt">(select all that apply)</span></div>' +
        '<div class="trust-types">' + trustTypeChecks() + '</div>' +
        '<div class="q-followup" id="legal-trustReviewed-followup" hidden>' +
          '<label>How long since your trust(s) were last reviewed?' +
            '<select id="legal-trustReviewedYears">' + reviewOptions() + '</select></label>' +
        '</div>' +
      '</div>' +
      rest;

    wireLegalCascade();
    syncLegalCascade();
  }
  function readLegal() {
    var out = {
      will: radioBool('will'),
      willReviewedYears: numOrBlank('legal-willReviewedYears'),
      trust: radioBool('trust'),
      trustTypes: trustTypesChecked(),
      trustReviewedYears: numOrBlank('legal-trustReviewedYears')
    };
    HARP.legal.ESSENTIALS.forEach(function (item) { out[item.key] = radioBool(item.key); });
    return out;
  }
  function loadLegal(legal) {
    legal = legal || {};
    setRadioBool('will', !!legal.will);
    setRadioBool('trust', !!legal.trust);
    HARP.legal.ESSENTIALS.forEach(function (item) { setRadioBool(item.key, !!legal[item.key]); });
    setVal('legal-willReviewedYears', legal.willReviewedYears);
    setVal('legal-trustReviewedYears', legal.trustReviewedYears);
    var types = legal.trustTypes || [];
    Array.prototype.forEach.call(document.querySelectorAll('#legal-checklist .trust-type'), function (c) {
      c.checked = types.indexOf(c.value) >= 0;
    });
    syncLegalCascade();
  }

  // ---------------------------------------------------------------- persistence (localStorage, on-device)
  // Holds the working profile across page-jumps and hard refreshes so the advisor does not re-enter a
  // scenario. Data stays on the device (no backend); Reset clears it.
  var STORAGE_KEY = 'harp.profile.v1';
  var saveTimer = null;
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(readProfile())); } catch (e) {} }
  function scheduleSave() { if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); }
  function loadSaved() { try { var s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function clearSaved() { try { localStorage.removeItem(STORAGE_KEY); } catch (e) {} }
  function wireAutosave() {
    var form = $('harp-form');
    if (!form) return;
    form.addEventListener('input', scheduleSave);
    form.addEventListener('change', scheduleSave);
  }

  // ---------------------------------------------------------------- profile
  function readProfile() {
    return {
      name: val('name'),
      filingStatus: val('filingStatus'),
      income: num('income'),
      agi: num('agi'),
      totalTax: num('totalTax'),
      dependents: int('dependents'),
      taxable: num('taxable'),
      taxDeferred: num('taxDeferred'),
      taxFree: num('taxFree'),
      yearReturnPct: numOrBlank('yearReturnPct'),
      holdings: readHoldings(),
      assets: num('assets'),
      liabilities: num('liabilities'),
      yearsToRetirement: numOrBlank('yearsToRetirement'),
      insurance: readInsurance(),
      legal: readLegal()
    };
  }
  function loadProfile(p) {
    setVal('name', p.name); setVal('filingStatus', p.filingStatus);
    setVal('income', p.income); setVal('agi', p.agi); setVal('totalTax', p.totalTax); setVal('dependents', p.dependents);
    setVal('taxable', p.taxable); setVal('taxDeferred', p.taxDeferred); setVal('taxFree', p.taxFree);
    setVal('yearReturnPct', p.yearReturnPct);

    $('holdings-body').innerHTML = '';
    (p.holdings || []).forEach(addHoldingRow);
    if (!(p.holdings || []).length) addHoldingRow();

    setVal('assets', p.assets); setVal('liabilities', p.liabilities);
    setVal('yearsToRetirement', p.yearsToRetirement);
    loadInsurance(p.insurance);
    loadLegal(p.legal);
    save();
  }
  function reset() {
    // Call the prototype method directly: a form control whose id/name is "reset" shadows the
    // form's native reset() (the named-property gotcha), so form.reset() can resolve to an element.
    HTMLFormElement.prototype.reset.call($('harp-form'));
    $('holdings-body').innerHTML = ''; addHoldingRow();
    syncInsuranceCascade();
    syncLegalCascade();
    clearSaved();
  }
  function init() {
    buildPerformanceInputs();
    buildInsuranceInputs();
    buildLegalChecklist();
    var saved = loadSaved();
    if (saved) loadProfile(saved); else addHoldingRow();
    wireAutosave();
  }

  return {
    init: init, readProfile: readProfile, loadProfile: loadProfile, reset: reset,
    addHoldingRow: addHoldingRow
  };
})();
