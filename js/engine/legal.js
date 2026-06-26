// Legal / estate readiness — core-document checklist plus a will/trust cascade and a
// high-net-worth asset-protection check. Pure module — no DOM.
window.HARP = window.HARP || {};

HARP.legal = (function () {
  // Core documents shown as a flat checklist. `when(profile)` makes an item conditional; `optional`
  // downgrades a miss to a note. (Will and Trust are handled separately below, as cascades.)
  // Trimmed to the essentials the advisor wants asked: a single combined financial + healthcare
  // power of attorney. (Healthcare directive, beneficiaries, guardianship, and asset inventory
  // were removed per product direction — fewer, higher-signal questions.)
  var ESSENTIALS = [
    { key: 'poa', label: 'Financial & healthcare power of attorney' }
  ];

  // Options for the "type of trust" multi-select. `apt` is the asset-protection trust the
  // high-net-worth check looks for.
  var TRUST_TYPES = [
    { key: 'ilit',      label: 'ILIT (irrevocable life insurance trust)' },
    { key: 'apt',       label: 'Asset protection trust' },
    { key: 'revocable', label: 'Revocable trust' },
    { key: 'crt',       label: 'Charitable remainder trust' },
    { key: 'other',     label: 'Other' }
  ];

  // Tiered staleness for any "how many years since last reviewed" answer: over the high-risk
  // threshold => risk, over the moderate threshold => warn, else nothing. Blank => null.
  function reviewSeverity(years, cfg) {
    years = Number(years);
    if (isNaN(years)) return null;
    var legalCfg = cfg.legal || {};
    var high = Number(legalCfg.reviewHighRiskYears) || 5;
    var moderate = Number(legalCfg.reviewModerateYears) || 3;
    if (years > high) return 'risk';
    if (years > moderate) return 'warn';
    return null;
  }
  function reviewFinding(label, years, severity) {
    return { category: 'Legal / estate', severity: severity,
      title: label + (severity === 'risk' ? ' is significantly out of date' : ' may be out of date'),
      detail: 'Last reviewed about ' + Math.round(Number(years)) + ' years ago. ' + (severity === 'risk'
        ? 'Documents this old often no longer reflect current law, assets, or wishes — review as a priority.'
        : 'Estate documents should be revisited every few years and after major life events.') };
  }

  function analyze(profile, cfg) {
    cfg = cfg || HARP.config;
    var legalCfg = cfg.legal || {};
    var have = profile.legal || {};
    var findings = [];
    var missing = [];
    var items = [];

    // ---- Will (+ review recency) ----
    var hasWill = !!have.will;
    items.push({ key: 'will', label: 'Will', has: hasWill });
    if (!hasWill) {
      missing.push('Will');
      findings.push({ category: 'Legal / estate', severity: 'risk', title: 'Missing: Will',
        detail: 'A core estate-planning document is not in place. This is a common, high-impact gap.' });
    } else {
      var willSev = reviewSeverity(have.willReviewedYears, cfg);
      if (willSev) findings.push(reviewFinding('Will', have.willReviewedYears, willSev));
    }

    // ---- Trust (+ types + review recency) ----
    var hasTrust = !!have.trust;
    var trustTypes = (have.trustTypes || []).slice();
    items.push({ key: 'trust', label: 'Trust', has: hasTrust, types: trustTypes });
    if (hasTrust) {
      var trustSev = reviewSeverity(have.trustReviewedYears, cfg);
      if (trustSev) findings.push(reviewFinding('Trust(s)', have.trustReviewedYears, trustSev));
    }

    // ---- High-net-worth asset protection ----
    var assets = HARP.insurance.estimatedAssets(profile);
    var threshold = Number(legalCfg.assetProtectionTrustThreshold) || 5000000;
    var hasAPT = hasTrust && trustTypes.indexOf('apt') >= 0;
    if (assets > threshold && !hasAPT) {
      findings.push({ category: 'Legal / estate', severity: 'risk', title: 'No asset-protection trust at this asset level',
        detail: 'Estimated assets of about ' + HARP.util.money(assets) + ' exceed ' + HARP.util.money(threshold) +
          ', but no asset-protection trust is in place. Without one, these assets are more exposed to creditors ' +
          'and litigation. Discuss whether an asset-protection trust is appropriate.' });
    } else if (!hasTrust) {
      findings.push({ category: 'Legal / estate', severity: 'warn', title: 'No trust in place',
        detail: 'No trust is set up. A trust can help control how assets pass to heirs, avoid probate, and add ' +
          'privacy. Worth discussing whether one fits the household.' });
    }

    // ---- Remaining core documents ----
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

  return { analyze: analyze, ESSENTIALS: ESSENTIALS, TRUST_TYPES: TRUST_TYPES };
})();
