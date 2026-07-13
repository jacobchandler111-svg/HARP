# HARP test suite

Pure-Node stress harnesses for the Nitrogen-handoff **ingest** and the **assessment engines**.
No browser, no `npm install` — the engine modules (`js/engine/*`) are pure, so [`test/load.js`](load.js)
loads them into Node behind a tiny `window`/`HARP` shim and calls the real functions.

## Run

```sh
node test/run.js            # all suites; exit code non-zero if any case fails
```

Or one suite at a time:

```sh
node test/ingest.test.js    # fromHandoff robustness — malformed handoffs must not crash or corrupt
node test/risk.test.js      # risk-alignment engine — boundary gaps, over/under, goal rules
node test/portfolio.test.js # adversarial portfolios — no NaN / Infinity / throw reaches findings or score
```

## What each suite covers

- **ingest** — `holdings` as `{}`/string/`null`-entries; risk numbers out of range (0/150/−5), boolean,
  float, string; money as `"$100,000"`/`"1,234"`; missing sections; extra keys; unicode names.
- **risk** — gaps at the aligned band (10) and critical gap (20) edges; over vs under; growth vs income
  goal; missing / `NaN` numbers → `provided:false`.
- **portfolio** — zero-total portfolio, cost-basis 0, negative / huge values, 50 holdings, dupes, all-blank.

## Not covered here (browser-only)

The full DOM round-trip (`fillHoldings` → `formatDollarInputs` → `readHoldings`) and the file-**drop**
path (`applyHandoff` via `FileReader`) run in a real browser, so they aren't in this Node suite. They were
validated manually against a served copy of the app during the hardening pass.
