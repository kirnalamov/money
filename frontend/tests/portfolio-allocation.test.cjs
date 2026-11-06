const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../components/dashboard/asset-allocation-chart.tsx'), 'utf8');
const js = ts.transpile(source.match(/export function allocatePercentages[\s\S]*?\n}/)[0].replace('export ', ''), { target: ts.ScriptTarget.ES2020 });
const allocatePercentages = vm.runInNewContext(`${js}; allocatePercentages`);

test('allocation percentages sum to 100 with deterministic largest remainder', () => {
    assert.deepEqual(allocatePercentages([43, 30, 25, 3]), [42, 30, 25, 3]);
    assert.deepEqual(allocatePercentages([1, 1, 1]), [34, 33, 33]);
});

test('allocation handles zero and invalid values without mutating sources', () => {
    const values = [0, Number.NaN, 10, -2];
    assert.deepEqual(allocatePercentages(values), [0, 0, 100, 0]);
    assert.deepEqual(values, [0, Number.NaN, 10, -2]);
    assert.deepEqual(allocatePercentages([0, 0]), [0, 0]);
    assert.deepEqual(allocatePercentages([]), []);
    assert.deepEqual(allocatePercentages([Infinity, -Infinity, NaN, -1]), [0, 0, 0, 0]);
    assert.deepEqual(allocatePercentages([Number.MAX_VALUE, Number.MAX_VALUE]), [50, 50]);
    assert.deepEqual(allocatePercentages(Object.freeze([1, 2, 3])), [17, 33, 50]);
});
