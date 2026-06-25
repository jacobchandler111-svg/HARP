# HARP — Health & Risk Profile

HARP assesses the **health and risk** of a household's financial picture and produces a
one-page **recommendation report** (designed to print cleanly to PDF).

It looks across five domains:

| Domain | What HARP evaluates |
| --- | --- |
| **Investments** | Concentration in any single stock; over-exposure to a single sector |
| **Accounts & tax** | Diversification across taxable / tax-deferred / tax-free buckets |
| **Insurance** | Whether the household is **under- or over-insured** (life, to start) |
| **Legal / estate** | Whether core documents (will, POA, healthcare directive, beneficiaries) are in place |
| **Overall** | A transparent 0–100 health score and a prioritized list of recommendations |

> ⚠️ HARP is an **informational** tool. It does not constitute financial, tax, legal, or
> insurance advice. All thresholds are configurable starting points, not professional standards.

---

## Status

Early scaffold (`v0`). The core flow works end-to-end: enter a profile → run the assessment →
print/save the recommendation report. Thresholds and rules in `js/config.js` are starter values
meant to be refined.

## How to run

No build step and no backend. Two options:

1. **Just open it** — double-click `index.html` (scripts are plain `<script>` tags, so this works
   from the file system).
2. **Local server** (recommended once you add tooling) — from the project folder:
   ```bash
   python -m http.server 8000   # then open http://localhost:8000
   # or:  npx serve
   ```

Click **Load sample** to populate a realistic household and see the report immediately.

## Project layout

```
index.html              App shell: the input form + the report area
css/
  styles.css            On-screen styling
  print.css             Print / "Save as PDF" styling (the deliverable)
js/
  config.js             All tunable thresholds (concentration %, insurance multiples, …)
  util.js               Small formatting/escaping helpers
  data/
    sectors.js          Sector list + starter ticker→sector map (the live-data "seam")
    sample.js           Example household for demos
  engine/               Pure calculation modules — no DOM, easy to test
    concentration.js    Single-stock + sector exposure
    insurance.js        Life-insurance need vs. coverage (under/over-insured)
    tax.js              Tax-bucket diversification
    legal.js            Estate-document checklist
    assessment.js       Orchestrates the engine + overall score
  ui/
    app.js              Wires the form to the engine and renders the report
docs/
  ARCHITECTURE.md       Design decisions, incl. when/why to add a backend
```

The `engine/` modules are intentionally free of any DOM code, so the calculations can be reused
(e.g., moved server-side) or unit-tested without a browser.

## Roadmap (rough)

- [ ] Refine thresholds and the scoring methodology with real advisor input
- [ ] Broaden insurance (disability, liability/umbrella, property)
- [ ] Richer sector/ticker reference data (and decide on a live data source — see ARCHITECTURE.md)
- [ ] Polished, branded PDF layout
- [ ] Save / reload profiles (this is the trigger to introduce a backend)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). **Never commit real client data** — see `.gitignore`.

## License

Proprietary & confidential. See [LICENSE](LICENSE).
