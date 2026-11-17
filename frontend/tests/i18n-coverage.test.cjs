const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Каждый статический ключ t("...") из кода должен быть в обеих локалях,
// а наборы ключей ru и en совпадать.
const root = path.join(__dirname, '..');
const locale = (lang) => JSON.parse(fs.readFileSync(path.join(root, 'locales', lang, 'translation.json'), 'utf8'));
const ru = locale('ru');
const en = locale('en');

const flatten = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) =>
  v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]);
const has = (dict, key) => key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), dict) !== undefined;

const files = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'tests', 'locales'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
};
for (const dir of ['app', 'components', 'lib', 'contexts', 'hooks']) walk(path.join(root, dir));

const missing = new Set();
for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  for (const m of code.matchAll(/\bt\(\s*["']([a-z0-9_]+(?:\.[a-z0-9_]+)+)["']/g)) {
    const key = m[1];
    if (!has(ru, key)) missing.add(`ru: ${key} (${path.relative(root, file)})`);
    if (!has(en, key)) missing.add(`en: ${key} (${path.relative(root, file)})`);
  }
}
assert.deepEqual([...missing], [], `ключи без перевода:\n${[...missing].join('\n')}`);

const ruKeys = new Set(flatten(ru));
const enKeys = new Set(flatten(en));
const onlyRu = [...ruKeys].filter((k) => !enKeys.has(k));
const onlyEn = [...enKeys].filter((k) => !ruKeys.has(k));
assert.deepEqual(onlyRu, [], `есть в ru, нет в en: ${onlyRu.join(', ')}`);
assert.deepEqual(onlyEn, [], `есть в en, нет в ru: ${onlyEn.join(', ')}`);
