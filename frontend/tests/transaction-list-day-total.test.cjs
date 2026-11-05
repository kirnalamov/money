const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('day totals convert mixed currencies to default currency and ignore transfers', () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/transactions/transaction-list.tsx'), 'utf8');
  assert.match(source, /const getDayTotal = \(items: Transaction\[\]\) => items\.reduce\(\(sum, tx\) => sum \+ \(tx\.type === 'expense' \? -1 : tx\.type === 'income' \? 1 : 0\) \* convertCurrency\(tx\.amount, tx\.currency, defaultCurrency\), 0\)/);
});
