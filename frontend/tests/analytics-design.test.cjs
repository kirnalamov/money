const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const dir = 'components/analytics';
const files = readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.tsx')).map((f) => `${dir}/${f}`);

test('analytics: tokens only, no legacy formatCurrency, no off-scale sizes', () => {
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/, file);
    assert.doesNotMatch(source, /rgba?\(/, file);
    assert.doesNotMatch(source, /formatCurrency/, file);
    assert.doesNotMatch(source, /text-(lg|3xl)|\b1[37]px/, file);
    assert.doesNotMatch(source, /toFixed\(/, file);
  }
});

test('analytics: no explicit + sign before absolute amounts, percents via formatPercent', () => {
  for (const file of files) {
    assert.doesNotMatch(read(file), /formatMoney\([^)]*,\s*true\)|"\+"\s*:/, file);
  }
  for (const file of ['net-worth-stats', 'account-breakdown', 'asset-allocation', 'detailed-expenses', 'spend-velocity-chart']) {
    assert.match(read(`${dir}/${file}.tsx`), /formatPercent\(/, file);
  }
});

test('analytics: tabs are accessible and charts have text alternatives', () => {
  const content = read(`${dir}/analytics-content.tsx`);
  assert.match(content, /role="tablist"/);
  assert.match(content, /role="tab"/);
  assert.match(content, /aria-selected=/);
  for (const file of ['asset-allocation', 'detailed-expenses', 'detailed-tags', 'spend-velocity-chart']) {
    assert.match(read(`${dir}/${file}.tsx`), /role="img"/, file);
  }
});

test('analytics: new i18n keys exist in ru and en', () => {
  for (const locale of ['ru', 'en']) {
    const a = JSON.parse(read(`locales/${locale}/translation.json`)).analytics;
    for (const value of [a.velocity.same, a.velocity.chart_aria, a.breakdown.accounts_title, a.breakdown.chart_aria, a.tags.chart_aria, a.habits.grid_aria]) {
      assert.ok(value, locale);
    }
    assert.doesNotMatch(a.stats.of_total_spending, /%/);
    assert.doesNotMatch(a.forecast.uncategorized_warning_desc, /%/);
  }
});
