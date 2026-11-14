const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const load = (l) => JSON.parse(fs.readFileSync(path.join(root, "locales", l, "translation.json"), "utf8"));
const ru = load("ru");
const en = load("en");

const flatten = (o, p = "") =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flatten(v, `${p}${k}.`) : [`${p}${k}`]));

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name === ".next" ? [] : walk(f);
    return /\.tsx?$/.test(e.name) ? [f] : [];
  });

const used = new Set();
for (const dir of ["components", "app"]) {
  for (const f of walk(path.join(root, dir))) {
    // Статические ключи; динамические (`${...}`) не попадают в регэксп.
    for (const m of fs.readFileSync(f, "utf8").matchAll(/["'`](dashboard\.[A-Za-z0-9_.]+)["'`]/g)) used.add(m[1]);
  }
}
// Ключи из динамического dashboard.date_filters.${...} в dashboard-filter.tsx
["7d", "3m", "6m", "1y"].forEach((k) => used.add(`dashboard.date_filters.${k}`));

const has = (o, key) => key.split(".").reduce((n, k) => (n && typeof n === "object" ? n[k] : undefined), o) !== undefined;

test("все статические dashboard.* ключи есть в ru и en", () => {
  for (const [name, loc] of [["ru", ru], ["en", en]]) {
    const missing = [...used].filter((k) => !has(loc, k));
    assert.deepEqual(missing, [], `${name}: нет ключей`);
  }
});

test("наборы dashboard.* в ru и en идентичны", () => {
  const keys = (o) => flatten(o.dashboard || {}).sort();
  assert.deepEqual(keys(ru), keys(en));
});
