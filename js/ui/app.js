// Orchestrator: initializes the UI modules and manages the internal ↔ client report flow.
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }

  var state = { assessment: null, mode: 'internal' };

  function assess() {
    state.assessment = HARP.assessment.run(HARP.ui.forms.readProfile());
    state.mode = 'internal';
    rerender();
  }

  function rerender() {
    if (!state.assessment) return;
    HARP.ui.report.render(state.assessment, state.mode);
    wireReportButtons();
  }

  // Report buttons live inside re-rendered HTML, so (re)wire them after each render.
  function wireReportButtons() {
    var accept = $('accept-btn');
    if (accept) accept.addEventListener('click', function () { state.mode = 'client'; rerender(); });
    var back = $('back-internal');
    if (back) back.addEventListener('click', function () { state.mode = 'internal'; rerender(); });
    var print = $('print-btn');
    if (print) print.addEventListener('click', function () { window.print(); });
  }

  function resetAll() {
    HARP.ui.forms.reset();
    HARP.ui.uploads.clear();
    state.assessment = null;
    state.mode = 'internal';
    var r = $('report');
    r.classList.remove('has-report');
    r.innerHTML = '<p class="placeholder">Fill in the four sections and click <strong>Assess</strong> to generate the internal analysis.</p>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var hf = $('header-firm');
    if (hf) hf.textContent = HARP.config.branding.firmName;

    HARP.ui.forms.init();
    HARP.ui.accordion.init();
    HARP.ui.uploads.init();

    $('add-holding').addEventListener('click', function () { HARP.ui.forms.addHoldingRow(); });
    $('add-policy').addEventListener('click', function () { HARP.ui.forms.addPolicyCard($('policy-type').value); });

    $('harp-form').addEventListener('submit', function (e) { e.preventDefault(); assess(); });
    $('load-sample').addEventListener('click', function () { HARP.ui.forms.loadProfile(HARP.sample); assess(); });
    $('btn-reset').addEventListener('click', resetAll);
  });
})();
