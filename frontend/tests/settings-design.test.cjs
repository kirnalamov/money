const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const source = readFileSync(path.join(root, 'app/settings/page.tsx'), 'utf8');
const en = JSON.parse(readFileSync(path.join(root, 'locales/en/translation.json'), 'utf8'));
const ru = JSON.parse(readFileSync(path.join(root, 'locales/ru/translation.json'), 'utf8'));
const keys = (value, prefix = '') => Object.entries(value).flatMap(([key, entry]) =>
  typeof entry === 'object' ? keys(entry, `${prefix}${key}.`) : [`${prefix}${key}`]);

test('settings locale keys are symmetric and every literal translation exists', () => {
  assert.deepEqual(keys(en.settings).sort(), keys(ru.settings).sort());
  for (const [, key] of source.matchAll(/\bt\(['"]([^'"\n]+)['"]/g)) {
    for (const locale of [en, ru]) {
      const value = key.split('.').reduce((entry, part) => entry?.[part], locale);
      assert.equal(typeof value, 'string', key);
      assert.ok(value.length > 0, key);
    }
  }
  for (const code of ['USD', 'EUR', 'GBP', 'RUB']) {
    assert.ok(en.settings.currencies[code]);
    assert.ok(ru.settings.currencies[code]);
  }
});

test('reset requires confirmation and resets only through the existing storage helper before reload', () => {
  const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'handleReset') handler = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.ok(handler, 'reset handler exists');
  const run = new Function('confirm', 't', 'resetApplicationStorage', 'localStorage', 'window', `return (${handler.getText(file)})();`);
  for (const accepted of [false, true]) {
    const calls = [];
    const storage = {};
    run((message) => { assert.equal(message, en.settings.reset_confirm); calls.push('confirm'); return accepted; },
      (key) => { assert.equal(key, 'settings.reset_confirm'); return en.settings.reset_confirm; },
      (actualStorage) => { assert.equal(actualStorage, storage); calls.push('reset'); },
      storage, { location: { reload: () => calls.push('reload') } });
    assert.deepEqual(calls, accepted ? ['confirm', 'reset', 'reload'] : ['confirm']);
  }
  assert.match(source, /if \(!hasUnsavedChanges\) return/);
  assert.match(source, /addEventListener\("beforeunload", handleBeforeUnload\)/);
  assert.match(source, /removeEventListener\("beforeunload", handleBeforeUnload\)/);
});

test('settings uses token styling rather than inline colors or decorative effects', () => {
  assert.doesNotMatch(source, /style=|shadow-xl|text-destructive|text-3xl|premium-|text-glow|\bglass\b/);
  assert.match(source, /focus-visible:ring-ring/);
});
