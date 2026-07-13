// Orchestrator: initializes the UI modules, applies branding, and drives the two-screen
// flow (Page 1 = client information → Page 2 = preview & print).
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }

  var state = { assessment: null };

  function showScreen(which) {
    $('screen-input').hidden = which !== 'input';
    $('screen-preview').hidden = which !== 'preview';
    window.scrollTo(0, 0);
  }

  function preview() {
    state.assessment = HARP.assessment.run(HARP.ui.forms.readProfile());
    HARP.ui.report.render(state.assessment);
    showScreen('preview');
  }

  function resetAll() {
    HARP.ui.forms.reset();
    HARP.ui.uploads.clear();
    HARP.ui.ingest.clear();
    state.assessment = null;
    $('report').innerHTML = '';
    showScreen('input');
  }

  // Brand colors + names come from config.js so they're swappable in one place.
  function applyBranding() {
    var b = HARP.config.branding;
    if (b.colors) {
      if (b.colors.accent) document.documentElement.style.setProperty('--brand', b.colors.accent);
      if (b.colors.primary) document.documentElement.style.setProperty('--brand-ink', b.colors.primary);
    }
    var w = $('brand-wordmark'); if (w) w.textContent = b.firmName;
    var t = $('brand-tagline'); if (t) t.textContent = b.tagline;
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyBranding();
    HARP.ui.forms.init();
    HARP.ui.accordion.init();
    HARP.ui.uploads.init();
    HARP.ui.ingest.init();

    $('add-holding').addEventListener('click', function () { HARP.ui.forms.addHoldingRow(); });

    $('harp-form').addEventListener('submit', function (e) { e.preventDefault(); preview(); });
    $('load-sample').addEventListener('click', function () { HARP.ui.forms.loadProfile(HARP.sample); preview(); });
    $('btn-reset').addEventListener('click', resetAll);
    $('back-edit').addEventListener('click', function () { showScreen('input'); });
    $('print-btn').addEventListener('click', function () { window.print(); });
  });
})();
