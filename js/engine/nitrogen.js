// Nitrogen / Riskalyze ingest — PURE parsing + field extraction (no DOM, no libraries). Given the text
// pulled from a dropped Nitrogen report (PDF text via pdf.js, sheet rows via SheetJS, or a CSV parsed
// here), it locates the Risk Numbers and the rest of the risk profile and returns them in the shape
// js/engine/risk.js consumes (a profile.risk object).
//
// Nitrogen's exports are NOT perfectly standardized, so extraction is heuristic and deliberately
// generous: several candidate label patterns per field, tried against both a flattened text blob and
// label/value cell adjacency. The LABELS / patterns below are the ONE place to tune when a field comes
// back wrong or empty against a real export — the readers and the UI don't need to change.
window.HARP = window.HARP || {};

HARP.nitrogen = (function () {
  // ---- CSV -> rows: small quote-aware parser (handles "" escapes, commas/newlines in quotes, CRLF) ---
  function parseCsv(text) {
    var rows = [], row = [], cur = '', q = false, c;
    text = String(text == null ? '' : text).replace(/^﻿/, ''); // strip BOM
    for (var i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); rows.push(row); row = []; cur = '';
      } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  // ---- helpers --------------------------------------------------------------------------------------
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim(); }

  // Candidate patterns over the NORMALIZED text blob; group 1 holds the value. A Risk Number is 1-99.
  // "risk number" on its own is Nitrogen's headline = the client's TOLERANCE number; the portfolio's
  // number is labelled "portfolio risk ...", so it is matched first and excluded from the tolerance rule.
  var TEXT_FIELDS = [
    { key: 'portfolioNumber', res: [
        /portfolio(?:'s)? risk (?:number|score)\D{0,15}([1-9]\d?)\b/,
        /current portfolio\D{0,15}([1-9]\d?)\b/ ],
      to: function (m) { return Number(m[1]); } },
    { key: 'toleranceNumber', res: [
        /(?:client(?:'s)? )?risk tolerance\D{0,15}([1-9]\d?)\b/,
        /target risk number\D{0,15}([1-9]\d?)\b/,
        /(?<!portfolio )(?<!portfolio's )risk number\D{0,15}([1-9]\d?)\b/ ],
      to: function (m) { return Number(m[1]); } },
    { key: 'timeHorizonYears', res: [ /time horizon\D{0,15}(\d{1,2})\b/, /years to goal\D{0,15}(\d{1,2})\b/ ],
      to: function (m) { return Number(m[1]); } },
    { key: 'gpa', res: [ /\bgpa\b\W{0,6}([a-f][+-]?)\b/ ], to: function (m) { return m[1].toUpperCase(); } }
  ];

  // The 6-month 95% range: two signed percentages and (optionally) two dollar amounts.
  function extractRange(text, out) {
    var pm = text.match(/(-?\d{1,3}(?:\.\d+)?)\s*%\s*(?:to|through|–|—|-|and)\s*(\+?-?\d{1,3}(?:\.\d+)?)\s*%/);
    if (pm) { out.rangeLowPct = Number(pm[1]); out.rangeHighPct = Number(pm[2]); }
    var dm = text.match(/-?\$\s*([\d,]+(?:\.\d+)?)\s*(?:to|through|–|—|-|and)\s*\+?-?\$\s*([\d,]+(?:\.\d+)?)/);
    if (dm) { out.rangeLowAmt = Number(dm[1].replace(/,/g, '')); out.rangeHighAmt = Number(dm[2].replace(/,/g, '')); }
  }

  // Extract from a flattened text blob (PDF text, and the tabular fallback).
  function fromText(raw) {
    var text = norm(raw), out = {};
    TEXT_FIELDS.forEach(function (f) {
      for (var i = 0; i < f.res.length; i++) { var m = text.match(f.res[i]); if (m) { out[f.key] = f.to(m); break; } }
    });
    extractRange(text, out);
    return out;
  }

  // ---- tabular: label-in-cell / value-in-adjacent-cell (right, then below), then a text fallback -----
  var CELL_LABELS = {
    toleranceNumber: [/^(client )?risk tolerance$/, /^risk number$/, /^(target|client) risk number$/],
    portfolioNumber: [/^portfolio(?:'s)? risk(?: number| score)?$/, /^current portfolio(?: risk)?$/],
    timeHorizonYears: [/^time horizon(?: \(years\))?$/, /^years to goal$/],
    gpa: [/^(?:portfolio )?gpa$/]
  };
  function valueFor(key, cell) {
    if (cell == null || String(cell).trim() === '') return null;
    if (key === 'gpa') { var g = norm(cell).match(/^([a-f][+-]?)$/); return g ? g[1].toUpperCase() : null; }
    var n = String(cell).replace(/[^\d.]/g, '');
    if (n === '') return null;
    var num = Number(n);
    if (key === 'toleranceNumber' || key === 'portfolioNumber') return (num >= 1 && num <= 99) ? Math.round(num) : null;
    return num;
  }
  function fromRows(rows) {
    rows = rows || [];
    var out = {};
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        var cell = norm(rows[r][c]);
        Object.keys(CELL_LABELS).forEach(function (key) {
          if (out[key] != null) return;
          if (!CELL_LABELS[key].some(function (re) { return re.test(cell); })) return;
          var v = valueFor(key, rows[r][c + 1]);          // value to the right
          if (v == null) v = valueFor(key, (rows[r + 1] || [])[c]); // else below
          if (v != null) out[key] = v;
        });
      }
    }
    // Range, and anything adjacency missed: fall back to flattened-text extraction over the whole sheet.
    var textOut = fromText(rows.map(function (row) { return row.join(' '); }).join(' \n '));
    Object.keys(textOut).forEach(function (k) { if (out[k] == null) out[k] = textOut[k]; });
    return out;
  }

  // Dispatch by source kind: 'csv' (raw text) | 'rows' (already parsed, e.g. SheetJS) | 'text' (PDF).
  function extract(kind, payload) {
    if (kind === 'csv') return fromRows(parseCsv(payload));
    if (kind === 'rows') return fromRows(payload || []);
    return fromText(payload || '');
  }

  // ---- standardized handoff (our schema) -> HARP shapes ---------------------------------------------
  // The Nitrogen lane emits a clean handoff.json (contract in HANDOFF.md). When THAT file is dropped we
  // read the investments directly instead of heuristically scraping a raw export — so we get exact
  // holdings, not just the Risk Numbers. Still fully client-side: it's a local file, nothing leaves.
  var ACCT_MAP = {
    'taxable': 'taxable', 'individual': 'taxable', 'brokerage': 'taxable', 'joint': 'taxable',
    'traditional ira': 'traditional', 'traditional': 'traditional', 'ira': 'traditional',
    '401k': 'traditional', 'roth ira': 'roth', 'roth': 'roth'
  };
  function acctType(s) { return ACCT_MAP[norm(s)] || 'taxable'; }
  // Nitrogen's numeric "Riskalyze GPA" (~0–4.3 scale) -> HARP's letter grade.
  function gpaLetter(n) {
    n = Number(n); if (!isFinite(n)) return '';
    return n >= 4 ? 'A' : n >= 3 ? 'B' : n >= 2 ? 'C' : n >= 1 ? 'D' : 'F';
  }
  // Coerce a handoff value to a finite number, tolerating $ , % and whitespace in numeric strings
  // (a hand-made or older-adapter handoff may carry "$100,000" / "1.3%"); anything non-numeric — incl.
  // booleans, objects, null — yields null so it never silently becomes 0/1/NaN downstream.
  function numOrNull(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'string') { var s = v.replace(/[$,%\s]/g, ''); return (s === '' || isNaN(Number(s))) ? null : Number(s); }
    return null;
  }
  function numOrBlank(v) { var n = numOrNull(v); return n == null ? '' : n; }
  // A Nitrogen Risk Number is an integer 1-99; round, and blank anything out of range or non-numeric
  // (mirrors the CSV/text path's valueFor, so a bad handoff can't feed 0/150/true into risk alignment).
  function riskNum(v) { var n = numOrNull(v); if (n == null) return ''; n = Math.round(n); return (n >= 1 && n <= 99) ? n : ''; }
  function isHandoff(o) { return !!(o && o.schema_version && o.sections && o.sections.investments); }
  function fromHandoff(o) {
    var inv = (o.sections && o.sections.investments) || {}, pf = inv.portfolio || {};
    var range = (pf.range_6mo_pct && typeof pf.range_6mo_pct === 'object') ? pf.range_6mo_pct : {};
    var risk = {
      portfolioNumber: riskNum(pf.risk_number),
      // tolerance (client Risk Number) comes from the intake questionnaire (run_intake merges it in);
      // blank when the client has no questionnaire yet, which authoritatively clears the field on ingest.
      toleranceNumber: riskNum(pf.risk_tolerance_number),
      rangeLowPct: numOrBlank(range.low),
      rangeHighPct: numOrBlank(range.high),
      gpa: pf.riskalyze_gpa != null ? gpaLetter(pf.riskalyze_gpa) : '',
      expenseRatio: numOrBlank(pf.expense_ratio_pct),       // Riskalyze cost signal (blank when not reported)
      annualDividendPct: numOrBlank(pf.annual_dividend_pct), // Riskalyze blended portfolio dividend yield -> income
      // Riskalyze asset allocation (%) — shown in the report + drives the retirement expected-return estimate.
      allocation: (pf.allocation_pct && typeof pf.allocation_pct === 'object') ? {
        stocks: numOrNull(pf.allocation_pct.stocks) || 0,
        bonds: numOrNull(pf.allocation_pct.bonds) || 0,
        cash: numOrNull(pf.allocation_pct.cash) || 0,
        other: numOrNull(pf.allocation_pct.other) || 0
      } : null
    };
    // holdings must be an array of objects; a malformed handoff (holdings as {}/string, or a null/scalar
    // entry) is coerced away instead of throwing.
    var rawHoldings = Array.isArray(inv.holdings) ? inv.holdings : [];
    var holdings = rawHoldings.filter(function (h) { return h && typeof h === 'object' && !Array.isArray(h); }).map(function (h) {
      return {
        ticker: h.ticker || '', name: h.name || h.ticker || '',
        sector: '',                                            // resolved by ticker lookup in the UI
        value: numOrBlank(h.market_value),
        costBasis: numOrBlank(h.cost_basis),
        dividendYield: numOrBlank(h.dividend_yield_pct),
        accountType: acctType(h.account_type || h.account)
      };
    });
    var tx = (o.sections && typeof o.sections.tax === 'object' && o.sections.tax) || {};
    var tax = {
      filingStatus: tx.filing_status || '',
      income: numOrBlank(tx.gross_income),
      agi: numOrBlank(tx.agi)
    };
    return {
      risk: risk, holdings: holdings, tax: tax,
      portfolio: { totalValue: numOrBlank(pf.total_value), allocation: pf.allocation_pct },
      client: (o.client && typeof o.client === 'object') ? o.client : {}, harpReady: !!o.harp_ready
    };
  }

  // A tax handoff from the TAX lane (Seth Weiland's calculator) — Nitrogen doesn't assess tax health.
  // Accepts either our standardized handoff shape (o.sections.tax) or a flat tax object, and extracts the
  // fields HARP's tax/accounting engines use. The exact mapping is finalized once the calculator's output
  // format is known; the flexible key-matching below is the seam that adapts to it.
  function fromTaxHandoff(o) {
    o = o || {};
    var t = (o.sections && o.sections.tax) || o.tax || o;
    var pick = function (a, b) { return a != null ? a : b; };
    return {
      filingStatus: t.filing_status || t.filingStatus || '',
      income: numOrBlank(pick(t.gross_income, t.income)),
      agi: numOrBlank(t.agi),
      totalTax: numOrBlank(pick(t.total_tax, t.totalTax)),
      dependents: numOrBlank(t.dependents)
    };
  }

  return {
    extract: extract, parseCsv: parseCsv, fromText: fromText, fromRows: fromRows,
    isHandoff: isHandoff, fromHandoff: fromHandoff, fromTaxHandoff: fromTaxHandoff
  };
})();
