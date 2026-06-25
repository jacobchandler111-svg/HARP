# HARP — Architecture & Design Decisions

## 1. What HARP is

A tool that takes a household's financial profile and produces a **one-page recommendation
report**, designed to print/save as a PDF. The computations are deliberately simple
(sums, ratios, threshold comparisons) across five domains: investments, accounts/tax,
insurance, legal/estate, and an overall score.

## 2. Decision: static-first, no backend (for now)

**HARP ships as a static site — HTML, CSS, and plain JavaScript — with no server.**

Why this is the right starting point:

- **The math is light.** Concentration %, sector grouping, insurance need vs. coverage, and a
  document checklist are all basic arithmetic. There is nothing here that needs a server to compute.
- **Privacy by architecture.** HARP handles sensitive financial, tax, insurance, and legal data.
  With no backend, that data **never leaves the user's machine** — nothing to transmit, store,
  breach, or build compliance around. For this domain that is a feature, not a limitation.
- **PDF output is a client capability.** The report is styled with a dedicated `print.css`; the
  user's browser "Save as PDF" produces the deliverable. No server-side rendering required.
- **Lower cost & complexity.** No hosting, no deploy pipeline, no auth — faster to build and easier
  for a second contributor to run (just open the file).

### When a backend becomes worth it

We will add a **thin** backend (and only the slice we need) when one of these is true:

| Trigger | Why a backend is needed |
| --- | --- |
| **Live market / sector data** | Auto-fetching a stock's current value or its sector requires a market-data API with a secret key. That key **cannot** live in browser code (anyone could read it). A tiny proxy endpoint holds the key and forwards the request. |
| **Saving / sharing profiles** | Storing assessments to reload later, or sharing them between advisors/machines, requires a database — which requires a backend (and then likely auth). |
| **Server-rendered PDFs** | If browser print isn't consistent enough, a headless-browser renderer (e.g. Puppeteer) guarantees identical output. |
| **Audit / compliance** | Retention, access logs, or regulatory requirements would push storage server-side. |

Until then, the same needs are met statically: **manual entry** of values, a **bundled** sector
reference map, **browser print** for PDFs, and no persistence beyond the current session.

## 3. The "data seam"

`js/data/sectors.js` is the single place that maps a ticker to a sector and (today) holds a small
bundled map. This is intentional: it is the **seam** where a live data source would plug in. When we
introduce a backend or external API, only this module changes — the engine and UI stay the same
because they only call `HARP.sectors.lookup(ticker)`.

## 4. Code organization

```
js/config.js     — all tunable thresholds (one source of truth for the methodology)
js/util.js       — formatting + HTML-escaping helpers
js/data/         — reference data (sectors) + sample profile  ← the data seam
js/engine/       — PURE calculation modules; no DOM. Take a profile, return results.
js/ui/app.js     — the only module that touches the DOM; wires form → engine → report
```

The engine is kept DOM-free on purpose so that:
- calculations are easy to unit-test, and
- if we ever move computation server-side, the engine modules can be lifted as-is.

## 5. Why plain `<script>` + a global namespace (not ES modules yet)

ES modules don't load from `file://` in some browsers (CORS), which would break "just open
`index.html`." Plain scripts attaching to a single `HARP` global keep zero-friction local use. When
the project grows enough to justify a dev server and bundler, switching to ES modules is a
mechanical change. This is a deliberate v0 trade-off, documented here so it's a choice, not an
accident.

## 6. Disclaimer posture

Because this touches financial/legal/insurance/tax decisions, every generated report includes an
"informational, not advice" disclaimer. Keep it.
