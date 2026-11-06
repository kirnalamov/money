const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (file) => readFileSync(path.join(__dirname, '..', file), 'utf8');

test('transaction controls keep 44px targets and keyboard focus styles', () => {
  const page = read('app/transactions/page.tsx');
  const filters = read('components/transactions/transaction-filters.tsx');
  const button = read('components/ui/button.tsx');
  const input = read('components/ui/input.tsx');

  assert.match(page, /aria-label=\{t\('transactions\.add_button'\)\}/);
  for (const source of [page, filters]) {
    assert.doesNotMatch(source, /\bh-(?:8|10)\b/);
  }
  const triggers = [...filters.matchAll(/<SelectTrigger\b[^>]*className="([^"]*)"/g)];
  assert.equal(triggers.length, 4);
  for (const [, classes] of triggers) {
    for (const token of ['h-11', 'min-w-11', 'focus-visible:ring-2', 'focus-visible:ring-ring']) {
      assert.ok(classes.split(' ').includes(token), `SelectTrigger missing ${token}`);
    }
  }
  assert.match(filters, /className="h-11 min-w-11 border-border bg-card pl-8"/);
  assert.match(filters, /className=\{`h-11 rounded-full/);
  assert.match(button, /min-h-11 min-w-11/);
  for (const source of [button, input]) {
    assert.match(source, /focus-visible:ring-2 focus-visible:ring-ring/);
  }
});

test('transaction row dividers use the shared border token', () => {
  const list = read('components/transactions/transaction-list.tsx');
  assert.match(list, /className="divide-y divide-border"/);
  assert.doesNotMatch(list, /divide-white/);
});
