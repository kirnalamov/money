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
// unsigned: абсолютные суммы без «+»; отрицательные — «−» перед символом
assert.equal(api.formatMoney(1, 'USD', 'en'), '$1.00');
assert.equal(api.formatMoney(1234.5, 'RUB', 'ru'), '1 234,50 ₽');
assert.equal(api.formatMoney(-16, 'USD', 'en'), '−$16.00');
assert.equal(api.formatCurrency(-16, 'USD'), '−$16.00');
// signed: дельты со знаком
assert.equal(api.formatMoney(1, 'USD', 'en', true), '+$1.00');
assert.equal(api.formatMoney(-1234.5, 'USD', 'en', true), '−$1,234.50');
assert.equal(api.formatMoney(1234.5, 'RUB', 'ru', true), '+1 234,50 ₽');
assert.equal(api.formatMoney(0, 'USD', 'en', true), '$0.00');
// en без ru-разделителей
assert.equal(api.formatMoney(1234567.5, 'USD', 'en'), '$1,234,567.50');
// compact
assert.equal(api.formatMoneyCompact(14900, 'USD', 'en'), '$14.9K');
assert.equal(api.formatMoneyCompact(14900, 'RUB', 'ru'), '14,9 тыс. ₽');
assert.equal(api.formatMoneyCompact(-14900, 'USD', 'en', true), '−$14.9K');
// percent
assert.equal(api.formatPercent(-0.1, 'ru'), '−0,1%');
assert.equal(api.formatPercent(-0.1, 'en'), '-0.1%');
assert.equal(api.formatPercent(2.5, 'en', true), '+2.5%');
assert.equal(api.formatPercent(2.5, 'ru'), '2,5%');
assert.equal(api.formatPercent(-0.01, 'en'), '0.0%');
