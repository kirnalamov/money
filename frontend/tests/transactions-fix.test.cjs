const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (f) => fs.readFileSync(path.join(__dirname, '../components/transactions', f), 'utf8');

test('details: без правки даты уходит исходный ISO, категория локализована, значение — исходное имя', () => {
  const src = read('transaction-details-dialog.tsx');
  assert.match(src, /date === initialDate \? transaction\.date : parsedDate\.toISOString\(\)/);
  assert.match(src, /label: getCategoryLabel\(t, c\.name\), value: c\.name/);
});

test('filters: категории дедуплицируются по categoryKey', () => {
  const src = read('transaction-filters.tsx');
  assert.match(src, /uniqueCategories = .*categoryKey|categoryKey\(item\)/s);
  assert.match(src, /uniqueCategories\.map/);
});

test('list: заголовок группы при сортировке по сумме — all_operations', () => {
  const src = read('transaction-list.tsx');
  assert.match(src, /dateKey === 'all'\) return t\('transactions\.all_operations'\)/);
});
