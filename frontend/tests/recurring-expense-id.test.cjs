const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const api = {};
const code = ts.transpile(fs.readFileSync(require('node:path').join(__dirname, '../lib/recurring-expense-id.ts'), 'utf8'), { module: ts.ModuleKind.CommonJS });
new Function('exports', code)(api);
(async () => {
  const first = await api.recurringExpenseId('Rent', 'Housing', 100, 'USD');
  assert.equal(first, await api.recurringExpenseId('Rent', 'Housing', 100, 'USD'));
  assert.notEqual(first, await api.recurringExpenseId('Rent', 'Housing', 100, 'EUR'));
  assert.equal(first.length, 64);
})().catch(error => { console.error(error); process.exitCode = 1; });
