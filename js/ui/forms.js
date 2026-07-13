// Reads the four input sections into a profile object, and populates the form from one.
// This is the only place that knows the form's DOM layout.
window.HARP = window.HARP || {};
HARP.ui = HARP.ui || {};

HARP.ui.forms = (function () {
  var esc = HARP.util.escape;
  function $(id) { return document.getElementById(id); }
  function val(id) { var e = $(id); return e ? e.value.trim() : ''; }
  function cleanNum(s) { return String(s == null ? '' : s).replace(/[,$\s]/g, ''); }
  function num(id) { return parseFloat(cleanNum(val(id))) || 0; }
  // Like num(), but keeps a blank field as '' (not 0) so an unanswered value is not read as a real 0.
  function numOrBlank(id) { var v = cleanNum(val(id)); return v === '' ? '' : parseFloat(v); }
  // Accounting format with thousands separators, for dollar inputs (1000000 -> "1,000,000").
  function commaFmt(s) {
    var clean = String(s == null ? '' : s).replace(/[^\d.]/g, '');
    if (clean === '') return '';
    var parts = clean.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : parts[0];
  }
  function formatDollarInputs(root) {
    (root || document).querySelectorAll('input.dollar').forEach(function (el) { el.value = commaFmt(el.value); });
  }
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
  function accountTypeOptions(selected) {
    var s = selected || 'taxable';
    // Value = tax treatment (kept stable for the engine + saved profiles); label = account name a reader
    // would extract. 'Individual' is a taxable brokerage account.
    return [['taxable', 'Individual'], ['traditional', 'Traditional'], ['roth', 'Roth']].map(function (t) {
      return '<option value="' + t[0] + '"' + (t[0] === s ? ' selected' : '') + '>' + t[1] + '</option>';
    }).join('');
  }
  function addHoldingRow(h) {
    h = h || { ticker: '', name: '', sector: '', value: '', costBasis: '', dividendYield: '', accountType: 'taxable' };
    var tr = document.createElement('tr');
    // Account type drives tax treatment: cost basis / embedded gains only matter in a taxable account.
    tr.innerHTML =
      '<td><input type="text" class="h-ticker" value="' + esc(h.ticker) + '" placeholder="AAPL" /></td>' +
      '<td><select class="h-sector">' + sectorOptions(h.sector) + '</select></td>' +
      '<td><select class="h-account">' + accountTypeOptions(h.accountType) + '</select></td>' +
      '<td class="num"><input type="text" inputmode="decimal" class="h-value dollar" value="' + esc(commaFmt(h.value)) + '" placeholder="0" /></td>' +
      '<td class="num"><input type="text" inputmode="decimal" class="h-basis dollar" value="' + esc(commaFmt(h.costBasis)) + '" placeholder="0" /></td>' +
      '<td class="num"><span class="cell-pct"><input type="text" inputmode="decimal" class="h-divyield" value="' + esc(h.dividendYield == null ? '' : h.dividendYield) + '" placeholder="0" /><span class="cell-pct-suffix">%</span></span></td>' +
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
    tr.querySelector('.icon-btn').addEventListener('click', function () { tr.remove(); updatePortfolioTotal(); scheduleSave(); });
  }
  function readHoldings() {
    var out = [];
    $('holdings-body').querySelectorAll('tr').forEach(function (tr) {
      var value = parseFloat(cleanNum(tr.querySelector('.h-value').value)) || 0;
      var ticker = tr.querySelector('.h-ticker').value.trim();
      if (value <= 0 && !ticker) return; // skip empty rows
      var basis = cleanNum(tr.querySelector('.h-basis').value);
      var divy = tr.querySelector('.h-divyield').value;
      out.push({ ticker: ticker, name: ticker,
        sector: tr.querySelector('.h-sector').value, value: value,
        costBasis: basis === '' ? '' : (parseFloat(basis) || 0),
        dividendYield: (divy === '' || divy == null || isNaN(Number(divy))) ? '' : Number(divy),
        accountType: (tr.querySelector('.h-account') || {}).value || 'taxable' });
    });
    return out;
  }

  // ---------------------------------------------------------------- performance (most recent full year)
  function perfYear() { return new Date().getFullYear() - 1; }
  function buildPerformanceInputs() {
    $('performance-inputs').innerHTML =
      '<label>Amount invested in fixed income ($)' +
        '<input type="text" inputmode="decimal" class="dollar" id="fixedIncomeValue" placeholder="0" /></label>' +
      // Reveals only when a fixed-income amount is entered.
      '<div class="pi-fields" id="fixed-income-income-field" hidden>' +
        '<label>Annual fixed income ($)' +
          '<input type="text" inputmode="decimal" class="dollar" id="fixedIncomeIncome" placeholder="0" /></label>' +
        '<label>Fixed income account type' +
          '<select id="fixedIncomeAccount">' + accountTypeOptions('taxable') + '</select></label>' +
      '</div>' +
      '<div class="computed-row"><span class="computed-label">Total portfolio value</span>' +
        '<span class="computed-val" id="portfolioValueOut">$0</span></div>' +
      '<div class="computed-row"><span class="computed-label">Total portfolio income (annual)</span>' +
        '<span class="computed-val" id="portfolioIncomeOut">$0</span></div>' +
      // Monthly withdrawal applies to EITHER goal — a growth household may still draw from the account,
      // and income vs. that draw is assessed the same way for both.
      '<label>Monthly needs / withdrawals from account ($)' +
        '<input type="text" inputmode="decimal" class="dollar" id="monthlyDrawdown" placeholder="0" /></label>' +
      // Growth goal only: last full-year return vs. the stock-weighted market.
      '<div class="pi-fields" id="goal-growth-fields">' +
        '<label>' + perfYear() + ' portfolio performance' +
          '<span class="pct-field"><input type="number" id="yearReturnPct" step="0.1" placeholder="e.g. 12.5" /><span class="pct-suffix">%</span></span></label>' +
      '</div>';
  }

  // ---------------------------------------------------------------- risk profile (Nitrogen / Riskalyze)
  // The full set of numbers an advisor reads off a Nitrogen report: the two Risk Numbers (1-99), the
  // time horizon, Nitrogen's 6-month 95% projected range ($ and %), and the portfolio GPA. Manual entry
  // now; a Nitrogen dropzone sits on top for the auto-parse step that will fill these fields next.
  function buildRiskInputs() {
    $('risk-inputs').innerHTML =
      '<h4 class="sub">Risk profile (Nitrogen / Riskalyze)</h4>' +
      '<div class="dropzone" data-upload="nitrogen">' +
        '<input type="file" class="dz-input" accept=".pdf,.png,.jpg,.jpeg" hidden />' +
        '<p class="dz-text">Drag &amp; drop the Nitrogen / Riskalyze report here, or ' +
          '<button type="button" class="link-btn dz-browse">browse</button></p>' +
        '<p class="dz-note">Automatic extraction of the Risk Numbers arrives next — for now, enter the values manually below.</p>' +
        '<ul class="dz-files"></ul>' +
      '</div>' +
      '<div class="grid">' +
        '<label>Client Risk Number (risk tolerance, 1–99)' +
          '<input type="number" min="1" max="99" step="1" id="risk-tolerance" placeholder="e.g. 55" /></label>' +
        '<label>Portfolio Risk Number (1–99)' +
          '<input type="number" min="1" max="99" step="1" id="risk-portfolio" placeholder="e.g. 72" /></label>' +
        '<label>Time horizon (years)' +
          '<input type="number" min="0" step="1" id="risk-horizon" placeholder="e.g. 20" /></label>' +
        '<label>Portfolio GPA' +
          '<select id="risk-gpa">' +
            '<option value="">—</option><option>A</option><option>B</option><option>C</option><option>D</option><option>F</option>' +
          '</select></label>' +
      '</div>' +
      '<div class="subq-label">Nitrogen 6-month 95% range <span class="opt">(from the report)</span></div>' +
      '<div class="grid">' +
        '<label>Downside (%)' +
          '<span class="pct-field"><input type="number" step="0.1" id="risk-rangeLowPct" placeholder="e.g. -18" /><span class="pct-suffix">%</span></span></label>' +
        '<label>Upside (%)' +
          '<span class="pct-field"><input type="number" step="0.1" id="risk-rangeHighPct" placeholder="e.g. 24" /><span class="pct-suffix">%</span></span></label>' +
        '<label>Downside ($)' +
          '<input type="text" inputmode="decimal" class="dollar" id="risk-rangeLowAmt" placeholder="0" /></label>' +
        '<label>Upside ($)' +
          '<input type="text" inputmode="decimal" class="dollar" id="risk-rangeHighAmt" placeholder="0" /></label>' +
      '</div>';
  }
  function readRisk() {
    return {
      toleranceNumber: numOrBlank('risk-tolerance'),
      portfolioNumber: numOrBlank('risk-portfolio'),
      timeHorizonYears: numOrBlank('risk-horizon'),
      gpa: val('risk-gpa'),
      rangeLowPct: numOrBlank('risk-rangeLowPct'),
      rangeHighPct: numOrBlank('risk-rangeHighPct'),
      rangeLowAmt: numOrBlank('risk-rangeLowAmt'),
      rangeHighAmt: numOrBlank('risk-rangeHighAmt')
    };
  }
  function loadRisk(risk) {
    risk = risk || {};
    setVal('risk-tolerance', risk.toleranceNumber);
    setVal('risk-portfolio', risk.portfolioNumber);
    setVal('risk-horizon', risk.timeHorizonYears);
    setVal('risk-gpa', risk.gpa);
    setVal('risk-rangeLowPct', risk.rangeLowPct);
    setVal('risk-rangeHighPct', risk.rangeHighPct);
    setVal('risk-rangeLowAmt', risk.rangeLowAmt);
    setVal('risk-rangeHighAmt', risk.rangeHighAmt);
  }

  // Primary goal drives which follow-up fields show: Growth -> last-year return; Income -> income vs draw.
  function buildGoalInput() {
    $('goal-input').innerHTML =
      '<div class="q-row"><span class="q-label">What is the client’s primary goal?</span>' +
      '<span class="yesno" role="radiogroup" aria-label="Primary goal">' +
        '<input type="radio" name="goal" id="goal-growth" value="growth" checked>' +
        '<label for="goal-growth">Growth</label>' +
        '<input type="radio" name="goal" id="goal-income" value="income">' +
        '<label for="goal-income">Income</label>' +
      '</span></div>' +
      '<div class="q-row"><span class="q-label">What is the client’s current age?</span>' +
        '<input type="text" inputmode="numeric" class="q-num" id="age" placeholder="e.g. 45" /></div>';
  }
  function goalVal() { var g = document.querySelector('input[name="goal"]:checked'); return g ? g.value : 'growth'; }
  function setGoal(v) { var e = $((v === 'income') ? 'goal-income' : 'goal-growth'); if (e) e.checked = true; }
  function syncGoalCascade() {
    // Only the growth return field is goal-gated now; the withdrawal field shows for either goal.
    if ($('goal-growth-fields')) $('goal-growth-fields').hidden = goalVal() !== 'growth';
  }
  // "Annual income from fixed income" only shows once a fixed-income amount is entered.
  function syncFixedIncomeCascade() {
    if ($('fixed-income-income-field')) $('fixed-income-income-field').hidden = !(num('fixedIncomeValue') > 0);
  }
  // Total portfolio value = stock holdings' market values + fixed income (computed, read-only, live).
  function portfolioTotal() {
    var stocks = readHoldings().reduce(function (s, h) { return s + (Number(h.value) || 0); }, 0);
    return stocks + num('fixedIncomeValue');
  }
  // Annual portfolio income = stock dividends (sum of value x per-holding yield%) + annual fixed income.
  function portfolioIncome() {
    var dividends = readHoldings().reduce(function (s, h) {
      return s + (Number(h.value) || 0) * ((Number(h.dividendYield) || 0) / 100);
    }, 0);
    return dividends + num('fixedIncomeIncome');
  }
  function updatePortfolioTotal() {
    var v = $('portfolioValueOut'); if (v) v.textContent = HARP.util.money(portfolioTotal());
    var i = $('portfolioIncomeOut'); if (i) i.textContent = HARP.util.money(portfolioIncome());
  }

  // ---------------------------------------------------------------- insurance
  function policyTypeOptions() {
    return HARP.insurance.POLICY_TYPES.map(function (t) {
      return '<option value="' + esc(t.key) + '">' + esc(t.label) + '</option>';
    }).join('');
  }
  function syncInsuranceCascade() {
    var f = $('ins-policies-followup');
    if (f) f.hidden = !nameBool('ins-hasPolicies');
    var b = $('ins-business-followup');
    if (b) b.hidden = !nameBool('ins-hasBusiness');
  }
  function buildInsuranceInputs() {
    $('insurance-inputs').innerHTML =
      yesNoToggle('ins-hasPolicies', 'Do you have a personal / family insurance policy?') +
      '<div class="q-followup" id="ins-policies-followup" hidden>' +
        '<label>Total payout value across all policies ($)' +
          '<input type="text" inputmode="decimal" class="dollar" id="ins-totalFaceValue" placeholder="0" /></label>' +
        '<div class="q-row q-sub"><span class="q-label">How many years ago was the policy issued or last reviewed?</span>' +
          '<input type="number" class="q-num" id="ins-policyAgeYears" min="0" step="1" placeholder="0" /></div>' +
      '</div>' +
      yesNoToggle('ins-hasBusiness', 'Do you own a business or entity?') +
      '<div class="q-followup" id="ins-business-followup" hidden>' +
        yesNoToggle('ins-hasUmbrella', 'Do you have an umbrella policy?') +
      '</div>';
    $('insurance-inputs').addEventListener('change', function (e) {
      if (e.target && /^ins-(hasPolicies|hasBusiness)-(yes|no)$/.test(e.target.id)) syncInsuranceCascade();
    });
    syncInsuranceCascade();
  }
  function readInsurance() {
    return {
      hasPolicies: nameBool('ins-hasPolicies'),
      totalFaceValue: num('ins-totalFaceValue'),
      policyAgeYears: numOrBlank('ins-policyAgeYears'),
      hasBusiness: nameBool('ins-hasBusiness'),
      hasUmbrella: nameBool('ins-hasUmbrella')
    };
  }
  function loadInsurance(ins) {
    ins = ins || {};
    setNameBool('ins-hasPolicies', !!ins.hasPolicies);
    setVal('ins-totalFaceValue', ins.totalFaceValue);
    setVal('ins-policyAgeYears', ins.policyAgeYears);
    setNameBool('ins-hasBusiness', !!ins.hasBusiness);
    setNameBool('ins-hasUmbrella', !!ins.hasUmbrella);
    syncInsuranceCascade();
  }

  // ---------------------------------------------------------------- legal
  // Nicer question phrasing per essential-document key (falls back to the engine's label).
  var LEGAL_Q = {
    poa: 'Have you designated a financial and healthcare power of attorney?'
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
  // `name` is the full radio-group name (e.g. 'legal-will' or 'ins-hasPolicies').
  function yesNoToggle(name, question) {
    return '<div class="q-row">' +
      '<span class="q-label">' + esc(question) + '</span>' +
      '<span class="yesno" role="radiogroup" aria-label="' + esc(question) + '">' +
        '<input type="radio" name="' + name + '" id="' + name + '-yes" value="1">' +
        '<label for="' + name + '-yes">Yes</label>' +
        '<input type="radio" name="' + name + '" id="' + name + '-no" value="0" checked>' +
        '<label for="' + name + '-no">No</label>' +
      '</span></div>';
  }
  function yesNoRow(key, question) { return yesNoToggle('legal-' + key, question); }
  function nameBool(name) { var e = $(name + '-yes'); return !!(e && e.checked); }
  function setNameBool(name, v) { var y = $(name + '-yes'), n = $(name + '-no'); if (y) y.checked = !!v; if (n) n.checked = !v; }
  function trustTypeChecks() {
    return HARP.legal.TRUST_TYPES.map(function (t) {
      return '<label class="trust-type-opt"><input type="checkbox" class="trust-type" value="' + esc(t.key) + '"> ' + esc(t.label) + '</label>';
    }).join('');
  }
  function radioBool(key) { return nameBool('legal-' + key); }
  function setRadioBool(key, v) { setNameBool('legal-' + key, v); }
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
        '<div class="q-row q-sub"><span class="q-label">How many years since your will was reviewed?</span>' +
          '<input type="number" class="q-num" id="legal-willReviewedYears" min="0" step="1" placeholder="0" /></div>' +
      '</div>' +
      yesNoRow('poa', LEGAL_Q.poa) +
      yesNoRow('trust', 'Do you have a trust set up?') +
      '<div class="q-followup" id="legal-trust-followup" hidden>' +
        '<div class="subq-label">What type(s) of trust? <span class="opt">(select all that apply)</span></div>' +
        '<div class="trust-types">' + trustTypeChecks() + '</div>' +
        '<div class="q-followup" id="legal-trustReviewed-followup" hidden>' +
          '<div class="q-row q-sub"><span class="q-label">Years since your trusts were last reviewed (use the longest)</span>' +
            '<input type="number" class="q-num" id="legal-trustReviewedYears" min="0" step="1" placeholder="0" /></div>' +
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
    form.addEventListener('input', function () { updatePortfolioTotal(); syncFixedIncomeCascade(); });
    form.addEventListener('change', function (e) { if (e.target && e.target.name === 'goal') syncGoalCascade(); });
    // Re-format dollar fields with commas when the user leaves the field.
    form.addEventListener('focusout', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('dollar')) e.target.value = commaFmt(e.target.value);
    });
    // Focusing a numeric field selects its whole value so the first keystroke replaces it — you never
    // end up typing in front of an existing "0" (e.g. "0" + "20000" reading as "020,000"). Delegated
    // so dynamically-added holding rows are covered. `armed` keeps the click's mouseup from collapsing
    // the programmatic selection back to a caret.
    var NUMERIC_SEL = 'input.dollar, input[type="number"], input[inputmode]';
    var armed = false;
    form.addEventListener('focusin', function (e) {
      var t = e.target;
      if (t && t.matches && t.matches(NUMERIC_SEL)) { t.select(); armed = true; }
    });
    form.addEventListener('mouseup', function (e) {
      if (armed) { e.preventDefault(); armed = false; }
    });
  }

  // ---------------------------------------------------------------- profile
  // Tax-treatment buckets, derived from the holdings' account types + the fixed-income account. (Maps the
  // UI's 'traditional'/'roth' to the engine's tax-deferred/tax-free buckets.)
  function taxBucket(type) {
    var v = readHoldings().reduce(function (s, h) { return s + (h.accountType === type ? (Number(h.value) || 0) : 0); }, 0);
    if (val('fixedIncomeAccount') === type) v += num('fixedIncomeValue');
    return v;
  }
  function readProfile() {
    return {
      name: val('name'),
      filingStatus: val('filingStatus'),
      income: num('income'),
      agi: num('agi'),
      totalTax: num('totalTax'),
      dependents: int('dependents'),
      taxable: taxBucket('taxable'),
      taxDeferred: taxBucket('traditional'),
      taxFree: taxBucket('roth'),
      goal: goalVal(),
      age: numOrBlank('age'),
      risk: readRisk(),
      yearReturnPct: numOrBlank('yearReturnPct'),
      fixedIncomeValue: num('fixedIncomeValue'),
      fixedIncomeIncome: num('fixedIncomeIncome'),
      monthlyDrawdown: num('monthlyDrawdown'),
      portfolioValue: portfolioTotal(),
      holdings: readHoldings(),
      assets: num('assets'),
      liabilities: num('liabilities'),
      insurance: readInsurance(),
      legal: readLegal()
    };
  }
  function loadProfile(p) {
    setVal('name', p.name); setVal('filingStatus', p.filingStatus);
    setVal('income', p.income); setVal('agi', p.agi); setVal('totalTax', p.totalTax); setVal('dependents', p.dependents);
    setVal('fixedIncomeAccount', p.fixedIncomeAccount || 'taxable');
    setGoal(p.goal);
    setVal('age', p.age);
    loadRisk(p.risk);
    setVal('yearReturnPct', p.yearReturnPct);
    setVal('fixedIncomeValue', p.fixedIncomeValue);
    setVal('fixedIncomeIncome', p.fixedIncomeIncome);
    setVal('monthlyDrawdown', p.monthlyDrawdown);

    $('holdings-body').innerHTML = '';
    (p.holdings || []).forEach(addHoldingRow);
    if (!(p.holdings || []).length) addHoldingRow();

    setVal('assets', p.assets); setVal('liabilities', p.liabilities);
    loadInsurance(p.insurance);
    loadLegal(p.legal);
    formatDollarInputs();
    syncGoalCascade();
    syncFixedIncomeCascade();
    updatePortfolioTotal();
    save();
  }
  function reset() {
    // Call the prototype method directly: a form control whose id/name is "reset" shadows the
    // form's native reset() (the named-property gotcha), so form.reset() can resolve to an element.
    HTMLFormElement.prototype.reset.call($('harp-form'));
    $('holdings-body').innerHTML = ''; addHoldingRow();
    syncGoalCascade();
    syncFixedIncomeCascade();
    updatePortfolioTotal();
    syncInsuranceCascade();
    syncLegalCascade();
    clearSaved();
  }
  function init() {
    buildGoalInput();
    buildRiskInputs();
    buildPerformanceInputs();
    buildInsuranceInputs();
    buildLegalChecklist();
    var saved = loadSaved();
    if (saved) loadProfile(saved); else addHoldingRow();
    wireAutosave();
    syncGoalCascade();
    syncFixedIncomeCascade();
    updatePortfolioTotal();
  }

  return {
    init: init, readProfile: readProfile, loadProfile: loadProfile, reset: reset,
    addHoldingRow: addHoldingRow
  };
})();
