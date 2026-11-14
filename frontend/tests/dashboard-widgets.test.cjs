const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const files = ['quick-actions', 'dashboard-filter', 'goals-summary', 'limits-summary', 'growth-card', 'recent-transactions']
  .map((name) => `components/dashboard/${name}.tsx`)
  .concat('lib/financial-health.ts');

test('dashboard widgets: no hex/rgba/gradient and no legacy formatCurrency', () => {
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/, file);
    assert.doesNotMatch(source, /rgba\(|linear-gradient/, file);
    assert.doesNotMatch(source, /formatCurrency/, file);
    assert.doesNotMatch(source, /(red|green)-\d{3}/, file);
  }
});

test('dashboard widgets: limit status keys exist in ru and en', () => {
  for (const locale of ['ru', 'en']) {
    const d = JSON.parse(read(`locales/${locale}/translation.json`)).dashboard;
    for (const key of ['of', 'remaining', 'exceeded']) assert.ok(d.limit_status[key], `${locale} ${key}`);
  }
});

test('limits-summary: over 100% shows real percent, expense token and clamped bar', () => {
  const source = read('components/dashboard/limits-summary.tsx');
  assert.doesNotMatch(source, /Math\.min\(100, \(calculatedSpent/);
  assert.match(source, /percentage > 100/);
  assert.match(source, /bg-expense/);
  assert.match(source, /formatPercent\(percentage/);
  assert.match(source, /Math\.min\(100, percentage\)/);
  assert.match(source, /dashboard\.limit_status\.exceeded/);
});
