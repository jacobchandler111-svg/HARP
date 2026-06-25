// Drag-and-drop upload staging. For Phase 1 this only LISTS the dropped files; the actual
// Gemini/OCR extraction is wired in Phase 2 (see docs/ARCHITECTURE.md). Keeping the staged
// File objects here means Phase 2 can post them to the backend without UI changes.
window.HARP = window.HARP || {};
HARP.ui = HARP.ui || {};

HARP.ui.uploads = (function () {
  var staged = {}; // key -> [File, ...]

  function init(root) {
    root = root || document;
    root.querySelectorAll('.dropzone').forEach(function (dz) {
      var key = dz.dataset.upload;
      staged[key] = staged[key] || [];
      var input = dz.querySelector('.dz-input');
      var browse = dz.querySelector('.dz-browse');

      browse.addEventListener('click', function () { input.click(); });
      input.addEventListener('change', function () { add(dz, key, input.files); input.value = ''; });

      ['dragenter', 'dragover'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag'); });
      });
      dz.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files) add(dz, key, e.dataTransfer.files);
      });
    });
  }

  function add(dz, key, fileList) {
    Array.prototype.forEach.call(fileList, function (f) { staged[key].push(f); });
    renderList(dz, key);
  }

  function renderList(dz, key) {
    var ul = dz.querySelector('.dz-files');
    ul.innerHTML = staged[key].map(function (f, i) {
      return '<li>' + HARP.util.escape(f.name) +
        ' <button type="button" class="icon-btn dz-remove" data-i="' + i + '" title="Remove">&times;</button></li>';
    }).join('');
    ul.querySelectorAll('.dz-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        staged[key].splice(Number(btn.dataset.i), 1);
        renderList(dz, key);
      });
    });
  }

  function clear() {
    Object.keys(staged).forEach(function (k) { staged[k] = []; });
    document.querySelectorAll('.dz-files').forEach(function (ul) { ul.innerHTML = ''; });
  }

  // Phase 2 will read this to post files to the extraction endpoint.
  function files() { return staged; }

  return { init: init, clear: clear, files: files };
})();
