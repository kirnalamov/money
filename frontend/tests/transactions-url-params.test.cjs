const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { parse, isValid } = require('date-fns');

const src = fs.readFileSync(path.join(__dirname, '..', 'app/transactions/page.tsx'), 'utf8');
const fn = src.match(/function parseInitialFilters[\s\S]*?\r?\n}\r?\n/)[0];
const js = ts.transpileModule(fn + '\nmodule.exports = parseInitialFilters;', {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const mod = { exports: {} };
new Function('module', 'parse', 'isValid', js)(mod, parse, isValid);
const parseFilters = (query) => mod.exports(new URLSearchParams(query));

test('valid params become initial filters', () => {
  const r = parseFilters('type=expense&category=Food&account=7&q=cafe&from=2026-11-01&to=2026-11-30');
  assert.equal(r.type, 'expense');
  assert.equal(r.category, 'Food');
  assert.equal(r.accountId, '7');
  assert.equal(r.search, 'cafe');
  assert.equal(r.dateRange.from.getDate(), 1);
  assert.equal(r.dateRange.to.getDate(), 30);
});

test('garbage is ignored', () => {
  const r = parseFilters('type=x&from=abc&to=2026-02-30');
  assert.deepEqual(r, { type: 'all', category: 'all', accountId: 'all', search: '', dateRange: undefined });
  assert.equal(parseFilters('from=2026-11-30&to=2026-11-01').dateRange, undefined);
});

test('single date fills the other end; Suspense wraps useSearchParams', () => {
  const r = parseFilters('to=2026-11-10');
  assert.equal(r.dateRange.from.getTime(), r.dateRange.to.getTime());
  assert.match(src, /<Suspense[^>]*>\s*<TransactionsContent \/>/);
});
