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
