const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const en = JSON.parse(read('locales/en/translation.json'));
const ru = JSON.parse(read('locales/ru/translation.json'));

test('date-range-picker uses tokens and locale-aware date format', () => {
  const source = read('components/ui/date-range-picker.tsx');
  assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(source, /dd\.MM\.yyyy/);
  assert.match(source, /\{ locale \}/);
});

test('shared ui keys exist in both locales and dialog has no literal Close', () => {
  for (const locale of [en, ru]) {
    assert.ok(locale.common.close);
    assert.ok(locale.common.remove_item.includes('{{name}}'));
  }
  assert.doesNotMatch(read('components/ui/dialog.tsx'), />\s*Close\s*</);
  assert.match(read('components/ui/dialog.tsx'), /t\("common\.close"\)/);
  assert.match(read('components/ui/multi-select-creatable.tsx'), /t\("common\.remove_item"/);
});

test('selects share height and chevron', () => {
  assert.match(read('components/ui/select.tsx'), /h-11/);
  for (const file of ['creatable-combobox', 'multi-select-creatable']) {
    assert.doesNotMatch(read(`components/ui/${file}.tsx`), /ChevronsUpDown/);
  }
});
