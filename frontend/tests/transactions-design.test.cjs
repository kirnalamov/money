const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const files = [
  'app/transactions/page.tsx',
  'components/transactions/transaction-summary.tsx',
  'components/transactions/transaction-list.tsx',
  'components/transactions/transaction-filters.tsx',
  'components/transactions/transaction-details-dialog.tsx',
  'components/transactions/add-transaction-dialog.tsx',
];

test('transactions use shared money formatter and design tokens', () => {
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /formatCurrency/);
    assert.doesNotMatch(source, /(?:bg|text|border)-\[(?:#|rgb|hsl|rgba)/);
  }
  const list = fs.readFileSync(files[2], 'utf8');
  assert.match(list, /formatMoney/);
  assert.match(list, /tabular-nums/);
});
