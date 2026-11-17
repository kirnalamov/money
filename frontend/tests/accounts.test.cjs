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

// страница счетов: регрессии дизайна и a11y
const page = fs.readFileSync(path.join(__dirname, '../app/accounts/page.tsx'), 'utf8');
const ru = require('../locales/ru/translation.json');
const en = require('../locales/en/translation.json');
assert.ok(!page.includes('toLocaleDateString'));
assert.ok(!/formatMoney\([^)]*true\)/.test(page), 'баланс без знака +');
assert.ok(page.includes('tabular-nums'));
assert.ok(page.includes('<h1') && !page.includes('<h2'));
// диалог счёта вынесен в компонент: тип и валюта — группы кнопок с aria-label
const accountDialog = fs.readFileSync(path.join(__dirname, '../components/accounts/account-dialog.tsx'), 'utf8');
for (const key of ['accounts.account_type', 'accounts.currency']) {
    assert.ok(accountDialog.includes(`aria-label={t("${key}")}`), key);
}
assert.ok(page.includes('<AccountDialog'), 'страница использует AccountDialog');
for (const key of page.matchAll(/\bt\("(accounts\.[a-z_.]+|common\.[a-z_]+)"/g)) {
    for (const [name, dict] of [['ru', ru], ['en', en]]) {
        assert.ok(key[1].split('.').reduce((o, k) => o?.[k], dict), `${name}: ${key[1]}`);
    }
}