// Wires the Nitrogen / Riskalyze dropzone: reads a dropped PDF / Excel / CSV ENTIRELY in the browser,
// pulls the risk profile out of it (HARP.nitrogen), fills the risk fields for the advisor to verify,
// and shows a short "what we found" summary. Parser libraries (SheetJS, pdf.js) are vendored under
// js/vendor and lazy-loaded only when a matching file is dropped — no document ever leaves the device.
window.HARP = window.HARP || {};
HARP.ui = HARP.ui || {};

HARP.ui.ingest = (function () {
  // Display order + labels for the summary; also defines "which fields we tried to read".
  var FIELD_LABELS = {
    toleranceNumber: 'Risk tolerance', portfolioNumber: 'Portfolio risk',
    rangeLowPct: 'Downside %', rangeHighPct: 'Upside %',
    rangeLowAmt: 'Downside $', rangeHighAmt: 'Upside $',
    timeHorizonYears: 'Time horizon', gpa: 'GPA', expenseRatio: 'Expense ratio'
  };

  function init(root) {
    root = root || document;
    var dz = root.querySelector('.dropzone[data-ingest="nitrogen"]');
    if (!dz) return;
    var input = dz.querySelector('.dz-input');
    var browse = dz.querySelector('.dz-browse');
    if (browse && input) browse.addEventListener('click', function () { input.click(); });
    if (input) input.addEventListener('change', function () { if (input.files[0]) handle(dz, input.files[0]); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag'); });
    });
    dz.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handle(dz, f);
    });
  }

  function ext(name) { var m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/); return m ? m[1] : ''; }

  function handle(dz, file) {
    // HARP now ingests ONLY the standardized Nitrogen handoff.json (exact holdings + Risk Numbers + GPA).
    // The brokerage statement itself is processed in Nitrogen, so raw PDF/Excel/CSV are no longer parsed here.
    if (ext(file.name) === 'json') {
      status(dz, 'Reading “' + file.name + '”…', 'busy');
      readText(file)
        .then(function (t) { applyHandoff(dz, file, JSON.parse(t)); })
        .catch(function (err) {
          status(dz, 'Couldn’t read “' + file.name + '” (' + ((err && err.message) || err) + '). Is it a valid handoff.json?', 'warn');
        });
      return;
    }
    status(dz, 'HARP takes the Nitrogen <b>handoff.json</b> (Risk Numbers, GPA, holdings). The brokerage ' +
      'statement is processed in Nitrogen — drop the handoff.json here, or enter the numbers manually below.', 'warn');
  }

  // The standardized Nitrogen handoff.json: fill the holdings table AND the Risk Numbers directly
  // (exact values from the pipeline, not heuristically scraped). Investments recalibrate off these.
  function applyHandoff(dz, file, obj) {
    if (!HARP.nitrogen.isHandoff(obj)) {
      status(dz, '“' + file.name + '” isn’t a HARP handoff file. Drop a Nitrogen PDF / Excel / CSV, or a *_handoff.json.', 'warn');
      return;
    }
    var h = HARP.nitrogen.fromHandoff(obj);
    var nH = (h.holdings || []).length;
    if (nH) HARP.ui.forms.fillHoldings(h.holdings);
    HARP.ui.forms.fillRisk(h.risk, { replace: true });   // handoff is authoritative — clears stale numbers between clients
    if (h.tax) HARP.ui.forms.fillTax(h.tax);   // ingest-driven tax (from the Nitrogen snapshot)
    var riskGot = Object.keys(FIELD_LABELS)
      .filter(function (k) { return h.risk[k] != null && h.risk[k] !== ''; })
      .map(function (k) { return FIELD_LABELS[k] + ' ' + h.risk[k]; });
    status(dz, 'Ingested handoff: ' + nH + ' holding' + (nH === 1 ? '' : 's') +
      (riskGot.length ? ', ' + riskGot.join(', ') : '') +
      '. Investments recalibrated from Nitrogen — verify below before previewing.' +
      (obj.harp_ready ? '' : ' ⚠ handoff not marked HARP-ready.'),
      obj.harp_ready ? 'ok' : 'warn');
  }

  function status(dz, msg, kind) {
    var el = dz.querySelector('.dz-status');
    if (!el) { el = document.createElement('p'); el.className = 'dz-status'; dz.appendChild(el); }
    el.textContent = msg;
    el.setAttribute('data-kind', kind || '');
  }
  function clear() {
    var el = document.querySelector('.dropzone[data-ingest="nitrogen"] .dz-status');
    if (el) el.remove();
  }

  // ---- file readers (all client-side) --------------------------------------------------------------
  function readWith(method, file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(r.error || new Error('read failed')); };
      r[method](file);
    });
  }
  function readText(file) { return readWith('readAsText', file); }

  return { init: init, clear: clear };
})();
