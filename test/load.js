'use strict';
// Shared loader: brings the pure HARP engine stack into a Node process with a browser-ish shim.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');   // the repo root (test/ lives directly under it)
global.window = global;
global.document = {
  getElementById: () => null, createElement: () => ({ style: {}, appendChild() {}, setAttribute() {}, classList: { add() {}, remove() {} } }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}
};
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const FILES = ['js/config.js', 'js/util.js', 'js/data/sectors.js',
  'js/engine/accounting.js', 'js/engine/concentration.js', 'js/engine/risk.js', 'js/engine/nitrogen.js',
  'js/engine/performance.js', 'js/engine/income.js', 'js/engine/gains.js', 'js/engine/insurance.js',
  'js/engine/tax.js', 'js/engine/legal.js', 'js/engine/assessment.js'];
for (const f of FILES) {
  try { vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f }); }
  catch (e) { console.log('LOAD FAIL', f, '->', e.message); }
}
module.exports = global.HARP;
