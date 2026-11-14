const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const code = fs.readFileSync(path.join(__dirname, '../components/transactions/add-transaction-dialog.tsx'), 'utf8');
const noComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

// native dialog, no iframe prototype
assert.doesNotMatch(code, /iframe|contentDocument|contentWindow|new-operation-prototype/i);
assert.doesNotMatch(code, /#[0-9a-fA-F]{3,8}\b|bg-\[#|\bhsl\(|\brgb\(/, 'no hex/hsl/rgb colors');
assert.doesNotMatch(noComments, /[Ѐ-ӿ]/, 'no Cyrillic literals outside comments');
assert.match(code, /useTranslation\(\)/);

// backend save precedes success state
const save = code.indexOf('await addTransaction({');
const success = code.indexOf('setSaved(true)');
assert.ok(save >= 0, 'form must call addTransaction');
assert.ok(success > save, 'success state must follow confirmed backend save');
assert.match(code, /catch \(submitError\)[\s\S]*?setError\(/, 'save failure surfaces an error');
assert.match(code, /savingRef\.current\) return/, 'double submit guard');

// ISO is computed on save only
assert.match(code, /date: when\.toISOString\(\)/);
assert.doesNotMatch(code.slice(0, code.indexOf('const submit')), /toISOString/);

// validation
assert.match(code, /!hasAmount \|\| !account/);
assert.match(code, /Number\.isFinite\(parsed\) && parsed > 0/);
assert.match(code, /transactions\.dialog\.fill_required/);
assert.match(code, /transactions\.dialog\.pick_destination/);
assert.match(code, /destination\.currency !== account\.currency[\s\S]*?transactions\.dialog\.currency_mismatch/);

// a11y
assert.match(code, /role="tablist"/);
assert.match(code, /role="tab"/);
assert.match(code, /aria-selected=/);
assert.ok((code.match(/min-h-11/g) || []).length >= 6, "interactive elements use min-h-11");
assert.match(code, /onCloseAutoFocus/);
assert.match(code, /openerRef\.current\.focus\(\)/);
assert.match(code, /<Dialog open=\{open\} onOpenChange=\{setOpen\}>/, 'Radix Dialog handles Esc');

// hotkey N guards
const hot = code.slice(code.indexOf('const onKey'), code.indexOf('window.addEventListener("keydown"'));
assert.match(hot, /event\.defaultPrevented/);
assert.match(hot, /ctrlKey[\s\S]*metaKey[\s\S]*altKey[\s\S]*shiftKey/);
assert.match(hot, /input, textarea, select, \[contenteditable\]/);
assert.match(hot, /\[role="dialog"\]/);
assert.match(hot, /event\.preventDefault\(\)/);

// i18n: used keys exist in both locales, blocks identical
const dialogs = {};
for (const lang of ['ru', 'en']) {
  dialogs[lang] = JSON.parse(fs.readFileSync(path.join(__dirname, `../locales/${lang}/translation.json`), 'utf8')).transactions.dialog;
}
assert.deepEqual(Object.keys(dialogs.ru).sort(), Object.keys(dialogs.en).sort(), 'transactions.dialog key sets differ');
const used = new Set([...code.matchAll(/t\("transactions\.dialog\.([a-z_]+)"/g)].map((m) => m[1]));
for (const item of ['expense', 'income', 'transfer']) used.add(`tab_${item}`); // dynamic t(`...tab_${item}`)
assert.ok(used.size > 20);
for (const lang of ['ru', 'en']) for (const key of used) assert.ok(dialogs[lang][key], `${lang}.${key}`);
