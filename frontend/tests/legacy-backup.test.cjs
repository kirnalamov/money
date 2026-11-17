const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const code = ts.transpile(fs.readFileSync(path.join(__dirname, '../lib/legacy-backup.ts'), 'utf8'), { module: ts.ModuleKind.CommonJS });
const api = {};
new Function('exports', code)(api);
const values = new Map();
const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
};
const old = JSON.stringify({ state: { limits: [{ id: 'old' }] }, version: 1 });
values.set('plutus-storage', old);
api.preserveLegacyData(storage);
assert.equal(api.getLegacyBackup(storage).raw, old);
values.set('plutus-storage', 'current');
values.set('access_token', 'access');
values.set('refresh_token', 'refresh');
values.set('i18nextLng', 'ru');
values.set('sidebar-collapsed', 'true');
values.set('unrelated-key', 'keep');
api.resetApplicationStorage(storage);
assert.equal(api.getLegacyBackup(storage).raw, old);
assert.equal(storage.getItem('plutus-storage'), null);
assert.equal(storage.getItem('access_token'), null);
assert.equal(storage.getItem('refresh_token'), null);
assert.equal(storage.getItem('unrelated-key'), 'keep');
values.set('plutus-storage', JSON.stringify({ state: { limits: [{ id: 'new' }] } }));
api.preserveLegacyData(storage);
assert.equal(api.getLegacyBackup(storage).raw, old);
assert.equal(api.parseLegacyBackup('{"state":{"positions":[{"symbol":"ABC"}]}}').state.positions.length, 1);
assert.equal(api.parseLegacyBackup('{"state":{}}'), null);
assert.equal(api.parseLegacyBackup('broken json'), null);
values.set('plutus-legacy-backup', 'broken json');
values.set('plutus-storage', JSON.stringify({ state: { positions: [{ symbol: 'NEW' }] } }));
api.preserveLegacyData(storage);
assert.equal(api.getLegacyBackup(storage).state.positions[0].symbol, 'NEW');
const currentBackup = api.getLegacyBackup(storage);
assert.equal(api.isLegacyBackupDismissed(storage, currentBackup), false);
api.dismissLegacyBackup(storage, currentBackup);
assert.equal(api.isLegacyBackupDismissed(storage, currentBackup), true);
assert.equal(api.getLegacyBackup(storage).raw, currentBackup.raw);
