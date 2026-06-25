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
    tr.innerHTML =
      '<td><input type="text" class="h-ticker" value="' + esc(h.ticker) + '" placeholder="AAPL" /></td>' +
      '<td><input type="text" class="h-name" value="' + esc(h.name) + '" placeholder="Apple Inc." /></td>' +
      '<td><select class="h-sector">' + sectorOptions(h.sector) + '</select></td>' +
      '<td class="num"><input type="number" class="h-value" min="0" step="1000" value="' + esc(h.value) + '" placeholder="0" /></td>' +
      '<td class="num"><input type="number" class="h-basis" min="0" step="1000" value="' + esc(h.costBasis == null ? '' : h.costBasis) + '" placeholder="—" /></td>' +
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
      var basisStr = tr.querySelector('.h-basis').value.trim();
      out.push({ ticker: ticker, name: name, sector: tr.querySelector('.h-sector').value, value: value,
        costBasis: basisStr === '' ? '' : (parseFloat(basisStr) || 0) });
    });
    return out;
  }

  // ---------------------------------------------------------------- performance (last 3 years)
  function perfYears() {
    var now = new Date().getFullYear();
    return [now - 3, now - 2, now - 1];
  }
  function buildPerformanceInputs() {
    $('performance-inputs').innerHTML = perfYears().map(function (y) {
      return '<label>' + y + ' return (%)<input type="number" class="ret-input" id="ret-' + y +
        '" step="0.1" placeholder="e.g. 7.5" /></label>';
    }).join('');
  }
  function readAnnualReturns() {
    return perfYears().map(function (y) { return { year: y, pct: numOrBlank('ret-' + y) }; });
  }
  function loadAnnualReturns(rows) {
    (rows || []).forEach(function (r) { if (r) setVal('ret-' + r.year, r.pct); });
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
  function trustTypeOptions() {
    return HARP.legal.TRUST_TYPES.map(function (t) {
      return '<option value="' + esc(t.key) + '">' + esc(t.label) + '</option>';
    }).join('');
  }
  function syncLegalCascade() {
    var will = $('legal-will'), trust = $('legal-trust'), types = $('legal-trustTypes');
    if (will) $('legal-will-followup').hidden = !will.checked;
    if (trust) {
      $('legal-trust-followup').hidden = !trust.checked;
      var anyType = trust.checked && selectedValues(types).length > 0;
      $('legal-trustReviewed-followup').hidden = !anyType;
    }
  }
  function wireLegalCascade() {
    ['legal-will', 'legal-trust', 'legal-trustTypes'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('change', syncLegalCascade);
    });
  }
  function buildLegalChecklist() {
    var essentials = HARP.legal.ESSENTIALS.map(function (item) {
      return '<label><input type="checkbox" id="legal-' + item.key + '" /> ' + esc(item.label) +
        (item.optional ? ' <span class="opt">(optional)</span>' : '') + '</label>';
    }).join('');

    $('legal-checklist').innerHTML =
      '<div class="legal-q">' +
        '<label><input type="checkbox" id="legal-will" /> Will</label>' +
        '<div class="legal-followup" id="legal-will-followup" hidden>' +
          '<label>Years since the will was last reviewed<input type="number" id="legal-willReviewedYears" min="0" step="1" placeholder="e.g. 3" /></label>' +
        '</div>' +
      '</div>' +
      '<div class="legal-q">' +
        '<label><input type="checkbox" id="legal-trust" /> Trust set up</label>' +
        '<div class="legal-followup" id="legal-trust-followup" hidden>' +
          '<label>Type(s) of trust <span class="opt">(select all that apply)</span>' +
            '<select id="legal-trustTypes" multiple size="5">' + trustTypeOptions() + '</select></label>' +
          '<div class="legal-followup" id="legal-trustReviewed-followup" hidden>' +
            '<label>Years since the trust(s) were last reviewed<input type="number" id="legal-trustReviewedYears" min="0" step="1" placeholder="e.g. 3" /></label>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="checklist-items">' + essentials + '</div>';

    wireLegalCascade();
    syncLegalCascade();
  }
  function readLegal() {
    var out = {
      will: checked('legal-will'),
      willReviewedYears: numOrBlank('legal-willReviewedYears'),
      trust: checked('legal-trust'),
      trustTypes: selectedValues($('legal-trustTypes')),
      trustReviewedYears: numOrBlank('legal-trustReviewedYears')
    };
    HARP.legal.ESSENTIALS.forEach(function (item) { out[item.key] = checked('legal-' + item.key); });
    return out;
  }
  function loadLegal(legal) {
    legal = legal || {};
    setChecked('legal-will', !!legal.will);
    setVal('legal-willReviewedYears', legal.willReviewedYears);
    setChecked('legal-trust', !!legal.trust);
    setMultiSelect($('legal-trustTypes'), legal.trustTypes);
    setVal('legal-trustReviewedYears', legal.trustReviewedYears);
    HARP.legal.ESSENTIALS.forEach(function (item) { setChecked('legal-' + item.key, !!legal[item.key]); });
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
      annualReturns: readAnnualReturns(),
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
    loadAnnualReturns(p.annualReturns);

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
