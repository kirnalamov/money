const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (name) => readFileSync(path.join(__dirname, '..', 'components/dashboard', name), 'utf8');

test('donut legend: ссылка с исходным именем категории, кодированием и необязательным диапазоном', () => {
  const s = read('expenses-donut.tsx');
  assert.match(s, /href=\{`\/transactions\?type=expense&category=\$\{encodeURIComponent\(item\.nameKey\)\}\$\{rangeQuery\}`\}/);
  assert.match(s, /dateRange\?\.from\s*\?/);
  assert.match(s, /: ""/);
  assert.match(s, /min-h-11/);
  assert.match(s, /focus-visible:ring-2/);
});

test('limits summary: строка лимита ведёт на расходы категории', () => {
  const s = read('limits-summary.tsx');
  assert.match(s, /\/transactions\?type=expense&category=\$\{encodeURIComponent\(limit\.category\)\}/);
  assert.match(s, /focus-visible:ring-2/);
});

test('recent transactions: «Смотреть все» передаёт диапазон показанных операций', () => {
  const s = read('recent-transactions.tsx');
  assert.match(s, /\/transactions\?from=\$\{format\(new Date\(recent\[recent\.length - 1\]\.date\), "yyyy-MM-dd"\)\}&to=\$\{format\(new Date\(recent\[0\]\.date\), "yyyy-MM-dd"\)\}/);
});
