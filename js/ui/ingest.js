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
    timeHorizonYears: 'Time horizon', gpa: 'GPA'
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
    status(dz, 'Reading “' + file.name + '”…', 'busy');
    var e = ext(file.name), p;
    if (e === 'csv' || e === 'tsv' || e === 'txt') p = readText(file).then(function (t) { return HARP.nitrogen.extract('csv', t); });
    else if (e === 'xlsx' || e === 'xls' || e === 'xlsm') p = readXlsx(file);
    else if (e === 'pdf') p = readPdf(file);
    else { status(dz, 'Unsupported file type “.' + e + '”. Use a PDF, Excel, or CSV export — or enter the numbers manually below.', 'warn'); return; }

    p.then(function (found) { apply(dz, file, found); })
     .catch(function (err) {
        status(dz, 'Couldn’t read “' + file.name + '” automatically (' + ((err && err.message) || err) + '). Enter the numbers manually below.', 'warn');
     });
  }

  function apply(dz, file, found) {
    found = found || {};
    var present = Object.keys(FIELD_LABELS).filter(function (k) { return found[k] != null && found[k] !== ''; });
    if (!present.length) {
      status(dz, 'Read “' + file.name + '” but couldn’t find the Risk Numbers in it. Enter them manually below.', 'warn');
      return;
    }
    HARP.ui.forms.fillRisk(found);
    var got = present.map(function (k) { return FIELD_LABELS[k] + ' ' + found[k]; });
    var missing = Object.keys(FIELD_LABELS).filter(function (k) { return found[k] == null || found[k] === ''; })
      .map(function (k) { return FIELD_LABELS[k]; });
    status(dz, 'From “' + file.name + '”: ' + got.join(', ') + '.' +
      (missing.length ? ' Not found: ' + missing.join(', ') + '.' : '') +
      ' Verify the values below before previewing.', 'ok');
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
  function readArrayBuffer(file) { return readWith('readAsArrayBuffer', file); }

  function readXlsx(file) {
    return loadScript('js/vendor/xlsx.full.min.js', 'XLSX').then(function () {
      return readArrayBuffer(file).then(function (buf) {
        var wb = window.XLSX.read(new Uint8Array(buf), { type: 'array' });
        var rows = [];
        wb.SheetNames.forEach(function (name) {
          rows = rows.concat(window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' }));
        });
        return HARP.nitrogen.extract('rows', rows);
      });
    });
  }
  function readPdf(file) {
    return loadScript('js/vendor/pdf.min.js', 'pdfjsLib').then(function () {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
      return readArrayBuffer(file).then(function (buf) {
        return window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise.then(function (pdf) {
          var chain = Promise.resolve('');
          for (var n = 1; n <= pdf.numPages; n++) chain = pageText(pdf, n, chain);
          return chain.then(function (text) { return HARP.nitrogen.extract('text', text); });
        });
      });
    });
  }
  function pageText(pdf, n, chain) {
    return chain.then(function (acc) {
      return pdf.getPage(n).then(function (page) {
        return page.getTextContent().then(function (tc) {
          return acc + ' ' + tc.items.map(function (it) { return it.str; }).join(' ');
        });
      });
    });
  }

  // Lazy-load a vendored script once; resolve when its global is present.
  var loading = {};
  function loadScript(src, globalName) {
    if (window[globalName]) return Promise.resolve();
    if (loading[src]) return loading[src];
    loading[src] = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { window[globalName] ? res() : rej(new Error(globalName + ' unavailable')); };
      s.onerror = function () { loading[src] = null; rej(new Error('failed to load ' + src)); };
      document.head.appendChild(s);
    });
    return loading[src];
  }

  return { init: init, clear: clear };
})();
