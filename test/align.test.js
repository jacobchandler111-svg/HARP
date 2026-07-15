'use strict';
// Investments alignment-score calibration. The Risk Number alone is meaningless — it's the GAP between the
// client's tolerance and their portfolio's risk that scores. Run: node test/align.test.js
const HARP = require('./load.js');
let pass = 0, fail = 0;
function ok(name, cond, extra) { (cond ? pass++ : fail++); console.log((cond ? 'pass  ✓ ' : 'FAIL  ✗ ') + name + (extra ? '  [' + extra + ']' : '')); }

// score(tolerance, portfolio, goal) -> the Investments category dial
function score(tol, port, goal) {
  const a = HARP.assessment.run({ risk: { toleranceNumber: tol, portfolioNumber: port }, goal: goal || 'growth', holdings: [], insurance: {}, legal: {} });
  return a.categories.find(c => c.key === 'investments').score;
}

// The user's headline examples.
const perfect = score(60, 59);          // gap 1 — "almost perfect"
const concern = score(60, 40);          // gap 20 — "a concern decently"
const exact = score(60, 60);            // gap 0 — perfect
ok('60 vs 60 (gap 0)  = 100', exact === 100, 'score ' + exact);
ok('60 vs 59 (gap 1)  ~ almost perfect (>=95)', perfect >= 95, 'score ' + perfect);
ok('60 vs 40 (gap 20) ~ decent concern (60-75)', concern >= 60 && concern <= 75, 'score ' + concern);
ok('near-perfect clearly beats the gap-20 case', perfect - concern >= 25, 'delta ' + (perfect - concern));

// Smooth + monotonic: bigger gap => lower score, no coarse steps.
const g = [0, 5, 10, 15, 20, 30, 40].map(d => score(60, 60 + d));
ok('monotonic decreasing with gap', g.every((v, i) => i === 0 || v <= g[i - 1]), g.join(','));
ok('extreme gap (40) is a serious concern (<50)', score(60, 60 + 40) < 50, 'score ' + score(60, 100));

// Direction: over-risk is penalized in full; under-risk for an INCOME goal is softened (defensible).
const over = score(50, 70, 'growth');           // portfolio hotter
const underIncome = score(70, 50, 'income');     // portfolio tamer, income goal -> relief
const underGrowth = score(70, 50, 'growth');     // portfolio tamer, growth goal -> full
ok('under-risk income goal softer than over-risk same gap', underIncome > over, underIncome + ' > ' + over);
ok('under-risk growth goal not softened', underGrowth <= over + 2, underGrowth + ' vs ' + over);

// Absolute risk is NOT a penalty when aligned: a hot 80/80 scores as well as a calm 20/20.
ok('aligned scores 100 regardless of how hot (80/80 == 20/20)', score(80, 80) === score(20, 20) && score(80, 80) === 100);

console.log('-'.repeat(96));
console.log('HARNESS E (alignment calibration): ' + pass + ' pass, ' + fail + ' fail of ' + (pass + fail));
module.exports = { name: 'align', pass, fail, total: pass + fail };
if (require.main === module) process.exit(fail ? 1 : 0);
