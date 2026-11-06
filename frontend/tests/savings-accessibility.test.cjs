const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = readFileSync(path.join(__dirname, '..', 'app/savings/page.tsx'), 'utf8');

test('savings calculator labels reference named controls and range has an accessible touch target', () => {
  for (const id of ['savings-calc-monthly', 'savings-calc-years', 'savings-calc-interest']) {
    assert.match(source, new RegExp(`htmlFor="${id}"`));
    assert.match(source, new RegExp(`id="${id}"[\\s\\S]*?name="${id}"`));
  }
  assert.match(source, /id="savings-calc-years-range"[\s\S]*?name="savings-calc-years-range"/);
  assert.match(source, /id="savings-calc-years-range"[\s\S]*?aria-label=\{t\("savings\.calculator\.time_period"\)\}/);
  assert.match(source, /id="savings-calc-years-range"[\s\S]*?className="[^"]*h-11/);
});
