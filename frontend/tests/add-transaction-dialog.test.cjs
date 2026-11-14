const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const code = fs.readFileSync(path.join(__dirname, '../components/transactions/add-transaction-dialog.tsx'), 'utf8');
const backendSave = code.indexOf('await addTransaction({');
const successState = code.indexOf('frameWindow.save?.();');

assert.ok(backendSave >= 0, 'form save must call the backend');
assert.ok(successState > backendSave, 'success state must follow confirmed backend save');
assert.match(code, /event\.preventDefault\(\);\s*event\.stopImmediatePropagation\(\);/);
assert.match(code, /document\.addEventListener\("keydown",[\s\S]*?\}, true\);/);
assert.match(code, /#again[\s\S]*?saving = false;[\s\S]*?saveButton\.disabled = false;/);
assert.match(code, /await addTransaction\(\{/);
assert.match(code, /setAttribute\("role", bad \? "alert" : "status"\)/);
assert.match(code, /setAttribute\("aria-live", bad \? "assertive" : "polite"\)/);
assert.match(code, /frameWindow\.save\?\.\(\);\s*document\.querySelector<HTMLButtonElement>\("#again"\)\?\.focus\(\)/);
assert.match(code, /accountSelect\.value = ""/);
assert.match(code, /frameWindow\.tags = \[\]/);

assert.doesNotMatch(code.replace(/\/\/.*$/gm, ''), /[Р-пр-џЈИ]/, 'wrapper must not contain Russian literals outside t()');
assert.match(code, /useTranslation\(\)/);
assert.match(code, /title=\{t\("transactions\.dialog\.title"\)\}/);
assert.match(code, /event\.key === "Escape"\) setOpen\(false\)/);
assert.match(code, /onCloseAutoFocus/);
assert.match(code, /\.x\{width:44px;height:44px/);
for (const lang of ['ru', 'en']) {
  const dialog = JSON.parse(fs.readFileSync(path.join(__dirname, `../locales/${lang}/translation.json`), 'utf8')).transactions.dialog;
  for (const key of ['title', 'close', 'select_account', 'fill_required', 'pick_destination', 'currency_mismatch', 'saving', 'save_failed', 'more']) assert.ok(dialog[key], `${lang}.${key}`);
}
