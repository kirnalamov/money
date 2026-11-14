const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../components/transactions/transaction-list.tsx'), 'utf8');

test('transaction row uses round 32px icon, 44px+ height and sticky day header', () => {
  assert.match(source, /h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/);
  assert.doesNotMatch(source, /bg-(income|expense|chart-2)\/10/);
  assert.match(source, /min-h-\[56px\]/);
  assert.match(source, /sticky top-0/);
  // overflow-hidden на родителе ломает sticky
  assert.doesNotMatch(source, /overflow-hidden rounded-2xl border border-border bg-card/);
});
