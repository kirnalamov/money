const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const i18next = require('i18next');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('standard categories translate; user category names remain intact', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({ lng: 'ru', resources: Object.fromEntries(['ru', 'en'].map(l => [l, { translation: JSON.parse(read(`locales/${l}/translation.json`)) }])) });
    const source = read('components/analytics/detailed-expenses.tsx');
    const expression = source.match(/const categoryLabel = \(name: string\) => (.*);/)[1];
    const label = new Function('t', 'name', `return ${expression}`);
    assert.equal(label(i18n.t.bind(i18n), 'Food'), 'Еда');
    assert.equal(label(i18n.t.bind(i18n), 'Shopping'), 'Покупки');
    assert.equal(label(i18n.t.bind(i18n), 'My.Custom category'), 'My.Custom category');
    assert.equal(i18n.t('analytics.velocity.current_month'), 'Текущий месяц');
    await i18n.changeLanguage('en');
    assert.equal(label(i18n.t.bind(i18n), 'Food'), 'Food');
    assert.equal(i18n.t('analytics.velocity.current_month'), 'Current month');
});

test('money uses the selected locale in all scoped analytics components', () => {
    const source = read('lib/utils.ts').match(/export function formatMoney[\s\S]*?\n}/)[0];
    const js = ts.transpile(source.replace('export ', ''), { target: ts.ScriptTarget.ES2020 });
    const formatMoney = vm.runInNewContext(`${js}; formatMoney`);
    assert.equal(formatMoney(1234.5, 'USD', 'ru'), '+$1 234,50');
    assert.equal(formatMoney(1234.5, 'USD', 'en'), '+$1,234.50');
    for (const file of ['account-breakdown', 'detailed-expenses', 'spend-velocity-chart', 'asset-allocation', 'detailed-tags', 'spending-heatmap']) {
        const ast = ts.createSourceFile(file, read(`components/analytics/${file}.tsx`), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        const visit = node => {
            if (ts.isCallExpression(node) && node.expression.getText(ast) === 'formatMoney') {
                assert.equal(node.arguments[2]?.getText(ast), 'i18n.language', file);
            }
            ts.forEachChild(node, visit);
        };
        visit(ast);
    }
    assert.match(read('components/analytics/spend-velocity-chart.tsx'), /item\.dataKey === 'current'/);
});
