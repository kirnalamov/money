const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../lib/limit-utils.ts'), 'utf8');
const code = ts.transpile(source, { module: ts.ModuleKind.CommonJS });
const api = {};
new Function('require', 'exports', code)((request) => {
    if (request === './utils') {
        return { convertCurrency: (amount, from, to) => from === to ? amount : amount * 2 };
    }
    throw new Error(`Unexpected import: ${request}`);
}, api);

const now = new Date('2026-04-15T12:00:00');
const transactions = [
    { type: 'expense', category: 'Food', amount: 10, currency: 'USD', date: '2026-04-15T09:00:00' },
    { type: 'expense', category: 'Food', amount: 20, currency: 'EUR', date: '2026-04-14T09:00:00' },
    { type: 'expense', category: 'Travel', amount: 100, currency: 'USD', date: '2026-04-15T09:00:00' },
    { type: 'income', category: 'Food', amount: 100, currency: 'USD', date: '2026-04-15T09:00:00' },
    { type: 'expense', category: 'Food', amount: 50, currency: 'USD', date: '2026-04-16T09:00:00' },
    { type: 'expense', category: 'Food', amount: 30, currency: 'USD', date: '2026-03-31T09:00:00' },
];

assert.equal(api.calculateLimitSpent({ category: 'Food', period: 'daily', currency: 'USD' }, transactions, now), 10);
assert.equal(api.calculateLimitSpent({ category: 'Food', period: 'weekly', currency: 'USD' }, transactions, now), 50);
assert.equal(api.calculateLimitSpent({ category: 'Food', period: 'monthly', currency: 'USD' }, transactions, now), 50);
assert.equal(api.calculateLimitSpent({ category: 'Food', period: 'monthly', currency: 'EUR' }, transactions, now), 40);
