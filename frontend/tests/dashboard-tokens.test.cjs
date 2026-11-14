const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const files = [
  'components/dashboard/net-worth-header.tsx',
  'components/dashboard/net-worth-chart.tsx',
  'components/dashboard/expenses-donut.tsx',
];

test('dashboard charts: no hex/rgba and no legacy formatCurrency', () => {
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/, file);
    assert.doesNotMatch(source, /rgba\(/, file);
    assert.doesNotMatch(source, /formatCurrency/, file);
  }
});

test('dashboard charts: i18n keys exist in ru and en', () => {
  for (const locale of ['ru', 'en']) {
    const json = JSON.parse(read(`locales/${locale}/translation.json`));
    const d = json.dashboard;
    for (const key of ['available', 'investments', 'savings', 'month_change']) assert.ok(d.net_worth_breakdown[key], `${locale} ${key}`);
    for (const key of ['net_worth_aria', 'net_worth_mini_aria', 'expenses_aria']) assert.ok(d.charts[key], `${locale} ${key}`);
    for (const key of ['shopping', 'transport', 'housing', 'food', 'salary', 'подработка']) assert.ok(d.categories[key], `${locale} ${key}`);
  }
});
