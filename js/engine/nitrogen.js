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

  return { extract: extract, parseCsv: parseCsv, fromText: fromText, fromRows: fromRows };
})();
