// Legal / estate readiness — a checklist of core documents.
window.HARP = window.HARP || {};

HARP.legal = (function () {
  var ESSENTIALS = [
    { key: 'will',         label: 'Will' },
    { key: 'poa',          label: 'Financial power of attorney' },
    { key: 'healthcare',   label: 'Healthcare directive / medical POA' },
    { key: 'beneficiaries',label: 'Beneficiary designations reviewed in last 12 months' },
    { key: 'trust',        label: 'Living trust (if applicable)', optional: true }
  ];

  function analyze(profile) {
    var have = profile.legal || {};
    var findings = [];
    var missing = [];

    ESSENTIALS.forEach(function (item) {
      if (have[item.key]) return;

      if (item.optional) {
        findings.push({
          category: 'Legal / estate',
          severity: 'info',
          title: 'No ' + item.label.toLowerCase(),
          detail: 'Optional — worth discussing depending on the household’s circumstances.'
        });
      } else {
        missing.push(item.label);
        findings.push({
          category: 'Legal / estate',
          severity: 'risk',
          title: 'Missing: ' + item.label,
          detail: 'A core estate-planning document is not in place. This is a common, high-impact gap.'
        });
      }
    });

    return { essentials: ESSENTIALS, have: have, missing: missing, findings: findings };
  }

  return { analyze: analyze, ESSENTIALS: ESSENTIALS };
})();
