const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const list = read('components/transactions/transaction-list.tsx');
const page = read('app/transactions/page.tsx');
const details = read('components/transactions/transaction-details-dialog.tsx');
const summary = read('components/transactions/transaction-summary.tsx');
const filters = read('components/transactions/transaction-filters.tsx');

test('conversion line follows transaction sign', () => {
  assert.match(list, /&asymp; \{formatMoney\(\(tx\.type === 'expense' \? -1 : 1\) \* convertCurrency/);
});

test('category icons are semantic and distinct, no emerald', () => {
  const block = list.match(/const categoryIcons[\s\S]*?\n};/)[0];
  const icons = [...block.matchAll(/:\s*(\w+),/g)].map((m) => m[1]);
  assert.equal(new Set(icons).size, icons.length);
  assert.match(block, /transport: Car/);
  assert.match(block, /shopping: ShoppingBag/);
  assert.doesNotMatch(list + page + summary + filters + details, /emerald|#[0-9a-fA-F]{3,6}\b/);
  assert.match(list, /text-income/);
});

test('filters translate categories with the list dictionary; locale keys match', () => {
  assert.match(filters, /getCategoryLabel\(t, item\)/);
  for (const lang of ['ru', 'en']) {
    const json = JSON.parse(read(`locales/${lang}/translation.json`));
    for (const key of ['investments', 'leisure', 'savings']) assert.ok(json.dashboard.categories[key]);
    assert.ok(json.transactions.delete_button);
    assert.ok(json.common.retry && json.common.data_load_failed_title);
  }
});

test('details dialog: prefix padding, delete label, localized preview, ISO unchanged', () => {
  assert.match(details, /className="pl-14"/);
  assert.match(details, /aria-label=\{t\('transactions\.delete_button'\)\}/);
  assert.match(details, /h-11 w-11/);
  assert.match(details, /d MMMM yyyy, HH:mm', \{ locale: dateLocale \}/);
  assert.match(details, /date: parsedDate\.toISOString\(\)/);
});

test('page: H1 outside card, skeleton and retry state; summary unsigned totals', () => {
  assert.match(page, /<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">\s*<div className="min-w-0"><h1/);
  assert.match(page, /<Skeleton/);
  assert.match(page, /common\.retry/);
  assert.doesNotMatch(summary, /text-lg/);
  assert.match(summary, /formatMoney\(income, defaultCurrency, i18n\.language\)/);
  assert.match(summary, /formatMoney\(expense, defaultCurrency, i18n\.language\)/);
});
