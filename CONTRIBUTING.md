# Contributing to HARP

Welcome! This is a small, private project. The guidelines below keep things consistent so a
second (or third) contributor can jump in easily.

## Ground rules

1. **Never commit real client or household data.** Use `js/data/sample.js` or fake data only.
   `.gitignore` blocks common patterns, but treat this as the #1 rule regardless.
2. **Keep calculations in `js/engine/`.** Engine modules must not touch the DOM — they take a
   plain profile object and return plain results. This keeps them testable and reusable.
3. **Thresholds live in `js/config.js`.** Don't hard-code magic numbers in the engine; reference
   `HARP.config` so the methodology is tunable in one place.

## Running locally

No build step. Open `index.html` directly, or serve the folder:

```bash
python -m http.server 8000      # http://localhost:8000
# or
npx serve
```

## Code style

- Plain ES5-compatible JavaScript with a single global namespace `HARP` (e.g. `HARP.concentration`).
  This avoids any build tooling for now. We can graduate to ES modules + a bundler when complexity
  warrants it — see `docs/ARCHITECTURE.md`.
- Small, focused files. One concern per file.
- Match the surrounding style: 2-space indent, descriptive names, comments where a rule encodes a
  domain assumption.

## Git workflow

- `main` is the integration branch. Avoid committing directly to `main` for non-trivial work.
- Branch names: `feature/<short-desc>`, `fix/<short-desc>`, `docs/<short-desc>`.
- Commit messages: short imperative summary (e.g. `Add disability-insurance check`), with a body if
  the why isn't obvious.
- Open a pull request and request a review before merging anything substantial.

## Questions about methodology

The thresholds and scoring are deliberate starting points, not gospel. If you change a rule, note
*why* in the PR — the reasoning matters more than the number.
