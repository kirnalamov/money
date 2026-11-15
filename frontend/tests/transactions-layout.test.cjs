const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const page = read('app/transactions/page.tsx');
const summary = read('components/transactions/transaction-summary.tsx');
const insights = read('components/transactions/transaction-insights.tsx');
const ru = JSON.parse(read('locales/ru/translation.json'));
const en = JSON.parse(read('locales/en/translation.json'));

test('summary: три плитки, суммы без знака, знак только у чистого результата', () => {
  assert.match(summary, /grid gap-4 sm:grid-cols-3 sm:gap-5/);
  assert.match(summary, /formatMoney\(income, defaultCurrency, i18n\.language\)/);
  assert.match(summary, /formatMoney\(expense, defaultCurrency, i18n\.language\)/);
  assert.match(summary, /formatMoney\(net, defaultCurrency, i18n\.language, true\)/);
  assert.match(summary, /text-2xl font-bold tabular-nums/);
});

test('page: двухколоночная сетка, панель применяет фильтр категории', () => {
  assert.match(page, /xl:grid-cols-\[minmax\(0,1\.8fr\)_minmax\(0,1fr\)\]/);
  assert.match(page, /<TransactionInsights[\s\S]*onSelectCategory=\{updateCategory\}/);
  assert.match(insights, /xl:sticky xl:top-4/);
  assert.match(insights, /\/analytics/);
  assert.match(insights, /\/limits/);
});

test('insights: токены вместо hex, формат через утилиты', () => {
  assert.doesNotMatch(insights + summary, /#[0-9a-fA-F]{3,6}\b|hsl\(/);
  for (const n of [1, 2, 3, 4, 5]) assert.match(insights, new RegExp(`bg-chart-${n}`));
  assert.match(insights, /formatPercent/);
});

test('локали: одинаковый набор ключей insights и all_operations', () => {
  assert.deepEqual(Object.keys(ru.transactions.insights).sort(), Object.keys(en.transactions.insights).sort());
  assert.deepEqual(Object.keys(ru.transactions.insights).sort(), ['analytics', 'empty', 'limits', 'title']);
  assert.ok(ru.transactions.all_operations && en.transactions.all_operations);
});
