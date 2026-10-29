const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const code = ts.transpile(fs.readFileSync(path.join(__dirname, '../lib/legacy-backup.ts'), 'utf8'), { module: ts.ModuleKind.CommonJS });
const api = {};
new Function('exports', code)(api);
const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
const old = JSON.stringify({ state: { limits: [{ id: 'old' }] }, version: 1 });
values.set('plutus-storage', old);
api.preserveLegacyData(storage);
assert.equal(api.getLegacyBackup(storage), old);
values.set('plutus-storage', JSON.stringify({ state: { limits: [{ id: 'new' }] } }));
api.preserveLegacyData(storage);
assert.equal(api.getLegacyBackup(storage), old);
