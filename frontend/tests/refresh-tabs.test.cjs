const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const code = ts.transpile(fs.readFileSync(path.join(__dirname, '../lib/api/client.ts'), 'utf8'), { module: ts.ModuleKind.CommonJS });
let access = 'old-access', refresh = 'old-refresh', refreshCalls = 0;
const tokens = {
    getAccessToken: () => access, getRefreshToken: () => refresh,
    setTokens: (a, r) => { access = a; refresh = r; },
    clearTokens: () => { access = null; refresh = null; },
};
let lock = Promise.resolve();
global.navigator = { locks: { request: (_name, callback) => {
    const result = lock.then(callback);
    lock = result.catch(() => {});
    return result;
} } };
global.window = { location: { pathname: '/', href: '' } };
const handlers = [];
const axios = {
    create: () => {
        const client = async config => config;
        client.interceptors = { request: { use: () => {} }, response: { use: (_ok, fail) => handlers.push(fail) } };
        return client;
    },
    post: async () => { refreshCalls++; return { data: { access_token: 'new-access', refresh_token: 'new-refresh' } }; },
};
for (let i = 0; i < 2; i++) new Function('require', 'exports', code)(name => name === 'axios' ? { default: axios } : tokens, {});
const error = () => ({ response: { status: 401 }, config: { url: '/accounts/', headers: { Authorization: 'Bearer old-access' } } });
Promise.all(handlers.map(handler => handler(error()))).then(results => {
    assert.equal(refreshCalls, 1);
    assert.equal(refresh, 'new-refresh');
    assert.ok(results.every(result => result.headers.Authorization === 'Bearer new-access'));
}).catch(error => { console.error(error); process.exitCode = 1; });
