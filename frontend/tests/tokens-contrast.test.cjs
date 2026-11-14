const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "../app/globals.css"), "utf8");
const button = fs.readFileSync(path.join(__dirname, "../components/ui/button.tsx"), "utf8");

const vars = (block) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([\d.]+) ([\d.]+)% ([\d.]+)%/g)].map((m) => [m[1], [+m[2], +m[3], +m[4]]]));
const lum = ([h, s, l]) => {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  const [r, g, b] = [f(0), f(8), f(4)].map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const root = vars(css.match(/:root\s*{([^}]*)}/)[1]);
const dark = vars(css.match(/\.dark\s*{([^}]*)}/)[1]);

test("light: primary с белым текстом и income/expense/warning >= 4.5 на card и muted", () => {
  assert.ok(ratio(root.primary, root["primary-foreground"]) >= 4.5);
  for (const k of ["income", "expense", "warning"]) {
    assert.ok(ratio(root[k], root.card) >= 4.5, k + " на card");
    assert.ok(ratio(root[k], root.muted) >= 4.5, k + " на muted");
  }
});

test("chart-1..5 >= 3:1 на card в обеих темах", () => {
  for (const [name, t] of [["light", root], ["dark", dark]]) {
    for (let i = 1; i <= 5; i++) assert.ok(ratio(t["chart-" + i], t.card) >= 3, name + " chart-" + i);
  }
});

test("hover кнопки не использует прозрачность primary/90", () => {
  assert.ok(!button.includes("hover:bg-primary/90"));
});
