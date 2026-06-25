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
    tr.querySelector('.icon-btn').addEventListener('click', function () { tr.remove(); });
  }
  function readHoldings() {
    var out = [];
    $('holdings-body').querySelectorAll('tr').forEach(function (tr) {
      var value = parseFloat(tr.querySelector('.h-value').value) || 0;
      var name = tr.querySelector('.h-name').value.trim();
      var ticker = tr.querySelector('.h-ticker').value.trim();
      if (value <= 0 && !name && !ticker) return; // skip empty rows
      out.push({ ticker: ticker, name: name, sector: tr.querySelector('.h-sector').value, value: value });
    });
    return out;
  }

  // ---------------------------------------------------------------- insurance policies
  var POLICY = {
    life:       { label: 'Life — coverage ($)',                field: 'coverage' },
    disability: { label: 'Disability — monthly benefit ($)',   field: 'monthlyBenefit' },
    property:   { label: 'Homeowners — dwelling coverage ($)', field: 'dwellingCoverage' },
    umbrella:   { label: 'Umbrella — coverage ($)',            field: 'coverage' }
  };
  function addPolicyCard(type, amount) {
    if (!POLICY[type]) return;
    var div = document.createElement('div');
    div.className = 'policy-card';
    div.dataset.type = type;
    div.innerHTML =
      '<label>' + esc(POLICY[type].label) +
      '<input type="number" class="policy-amount" min="0" step="1000" value="' + esc(amount == null ? '' : amount) + '" /></label>' +
      '<button type="button" class="icon-btn" title="Remove">&times;</button>';
    div.querySelector('.icon-btn').addEventListener('click', function () { div.remove(); });
    $('policies').appendChild(div);
  }
  function readInsurance() {
    var ins = {
      employed: checked('ins-employed'),
      ownsHome: checked('ins-ownsHome'),
      homeValue: num('ins-homeValue'),
      life: { has: false }, disability: { has: false }, property: { has: false }, umbrella: { has: false }
    };
    document.querySelectorAll('#policies .policy-card').forEach(function (card) {
      var type = card.dataset.type;
      var amount = parseFloat(card.querySelector('.policy-amount').value) || 0;
      if (type === 'life') ins.life = { has: true, coverage: amount };
      else if (type === 'disability') ins.disability = { has: true, monthlyBenefit: amount };
      else if (type === 'property') ins.property = { has: true, dwellingCoverage: amount };
      else if (type === 'umbrella') ins.umbrella = { has: true, coverage: amount };
    });
    return ins;
  }

  // ---------------------------------------------------------------- legal
  function buildLegalChecklist() {
    $('legal-checklist').innerHTML = HARP.legal.ESSENTIALS.map(function (item) {
      return '<label><input type="checkbox" id="legal-' + item.key + '" /> ' + esc(item.label) +
        (item.optional ? ' <span class="opt">(optional)</span>' : '') + '</label>';
    }).join('');
  }
  function readLegal() {
    var out = {};
    HARP.legal.ESSENTIALS.forEach(function (item) { out[item.key] = checked('legal-' + item.key); });
    return out;
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
      return3yrPct: numOrBlank('return3yrPct'),
      holdings: readHoldings(),
      insurance: readInsurance(),
      legal: readLegal()
    };
  }
  function loadProfile(p) {
    setVal('name', p.name); setVal('filingStatus', p.filingStatus);
    setVal('income', p.income); setVal('agi', p.agi); setVal('totalTax', p.totalTax); setVal('dependents', p.dependents);
    setVal('taxable', p.taxable); setVal('taxDeferred', p.taxDeferred); setVal('taxFree', p.taxFree);
    setVal('return3yrPct', p.return3yrPct);

    $('holdings-body').innerHTML = '';
    (p.holdings || []).forEach(addHoldingRow);
    if (!(p.holdings || []).length) addHoldingRow();

    var ins = p.insurance || {};
    setChecked('ins-employed', ins.employed !== false);
    setChecked('ins-ownsHome', !!ins.ownsHome);
    setVal('ins-homeValue', ins.homeValue);
    $('policies').innerHTML = '';
    if (ins.life && ins.life.has) addPolicyCard('life', ins.life.coverage);
    if (ins.disability && ins.disability.has) addPolicyCard('disability', ins.disability.monthlyBenefit);
    if (ins.property && ins.property.has) addPolicyCard('property', ins.property.dwellingCoverage);
    if (ins.umbrella && ins.umbrella.has) addPolicyCard('umbrella', ins.umbrella.coverage);

    HARP.legal.ESSENTIALS.forEach(function (item) { setChecked('legal-' + item.key, !!(p.legal && p.legal[item.key])); });
  }
  function reset() {
    // Call the prototype method directly: a form control whose id/name is "reset" shadows the
    // form's native reset() (the named-property gotcha), so form.reset() can resolve to an element.
    HTMLFormElement.prototype.reset.call($('harp-form'));
    $('holdings-body').innerHTML = ''; addHoldingRow();
    $('policies').innerHTML = '';
  }
  function init() {
    buildLegalChecklist();
    addHoldingRow();
  }

  return {
    init: init, readProfile: readProfile, loadProfile: loadProfile, reset: reset,
    addHoldingRow: addHoldingRow, addPolicyCard: addPolicyCard
  };
})();
