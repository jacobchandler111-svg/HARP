// Legal / estate readiness — a questionnaire of core documents. Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.legal = (function () {
  // `when(profile)` makes an item conditional; `optional` downgrades a miss to a note.
  var ESSENTIALS = [
    { key: 'will',          label: 'Will' },
    { key: 'poa',           label: 'Financial power of attorney' },
    { key: 'healthcare',    label: 'Healthcare directive / medical POA' },
    { key: 'beneficiaries', label: 'Beneficiary designations reviewed in last 12 months' },
    { key: 'guardianship',  label: 'Guardianship designation for minor children',
      when: function (p) { return (Number(p.dependents) || 0) > 0; } },
    { key: 'trust',         label: 'Living trust', optional: true },
    { key: 'assetInventory',label: 'Asset inventory / letter of instruction', optional: true }
  ];

  function analyze(profile) {
    var have = profile.legal || {};
    var findings = [];
    var missing = [];
    var items = [];

    ESSENTIALS.forEach(function (item) {
      if (item.when && !item.when(profile)) return; // not relevant for this household
      var has = !!have[item.key];
      items.push({ key: item.key, label: item.label, optional: !!item.optional, has: has });
      if (has) return;

      if (item.optional) {
        findings.push({ category: 'Legal / estate', severity: 'info',
          title: 'No ' + item.label.toLowerCase(),
          detail: 'Optional — worth discussing depending on the household’s circumstances.' });
      } else {
        missing.push(item.label);
        findings.push({ category: 'Legal / estate', severity: 'risk',
          title: 'Missing: ' + item.label,
          detail: 'A core estate-planning document is not in place. This is a common, high-impact gap.' });
      }
    });

    return { items: items, missing: missing, findings: findings };
  }

  return { analyze: analyze, ESSENTIALS: ESSENTIALS };
})();
