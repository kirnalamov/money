const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../lib/api/accounts.ts'), 'utf8');
const code = ts.transpile(source, { module: ts.ModuleKind.CommonJS });
const calls = [];
const client = { get: async (_url, { params }) => {
    calls.push(params.skip);
    return { data: Array.from({ length: params.skip === 0 ? 100 : 1 }, (_, i) => ({ id: params.skip + i })) };
} };
const api = {};
new Function('require', 'exports', code)(() => ({ default: client }), api);

api.getAccounts().then(accounts => {
    assert.equal(accounts.length, 101);
    assert.equal(accounts[100].id, 100);
    assert.deepEqual(calls, [0, 100]);
}).catch(error => { console.error(error); process.exitCode = 1; });
