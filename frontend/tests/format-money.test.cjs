const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../lib/utils.ts'), 'utf8');
const code = ts.transpile(source, { module: ts.ModuleKind.CommonJS });
const api = {};
new Function('require', 'exports', code)((request) => {
    if (request === 'clsx') return { clsx: () => '' };
    if (request === 'tailwind-merge') return { twMerge: (value) => value };
    if (request === '@/types') return {};
    throw new Error(`Unexpected import: ${request}`);
}, api);

assert.equal(api.formatMoney(-4000, 'USD', 'ru'), '−$4 000,00');
assert.equal(api.formatMoney(1, 'USD', 'en'), '+$1.00');
