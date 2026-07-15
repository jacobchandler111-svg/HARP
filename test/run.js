'use strict';
// Runs every HARP ingest/engine stress harness in one process and exits non-zero if any case fails,
// so it can gate a pre-commit hook or CI.  Usage:  node test/run.js
const suites = ['./ingest.test.js', './risk.test.js', './portfolio.test.js', './tax.test.js'].map(function (s) { return require(s); });
let pass = 0, fail = 0, total = 0;
suites.forEach(function (r) { pass += r.pass; fail += r.fail; total += r.total; });
console.log('\n' + '='.repeat(90));
console.log('TOTAL: ' + pass + ' pass, ' + fail + ' fail of ' + total + ' across ' + suites.length + ' suites');
process.exit(fail ? 1 : 0);
