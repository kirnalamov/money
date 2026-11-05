const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpile(fs.readFileSync(require('node:path').join(__dirname, '../lib/store.ts'), 'utf8'), { module: ts.ModuleKind.CommonJS });
let state;
const exportsObject = {};
const api = new Proxy({}, { get: (_, name) => name === 'getUserItems' ? async () => ({ positions: [], limits: [], recurringExpenses: [] }) : name === 'getTransactions' ? async () => { throw Error('offline'); } : name === 'getExchangeRates' ? async () => ({ rates: {} }) : async () => [] });
new Function('require', 'exports', code)(name => {
  if (name === 'zustand') return { create: () => initializer => { state = initializer(update => { state = { ...state, ...(typeof update === 'function' ? update(state) : update) }; }, () => state); return () => state; } };
  if (name === 'zustand/middleware') return { persist: initializer => initializer };
  return api;
}, exportsObject);
state.fetchAllData().then(() => {
  assert.equal(state.dataError, 'common.data_load_failed');
  assert.ok(state.dataErrors.transactions);
  assert.equal(state.isLoading, false);
}).catch(error => { console.error(error); process.exitCode = 1; });
