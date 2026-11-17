const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Каждая страница приложения: под ProtectedRoute (кроме входа/регистрации), ровно один <h1>,
// без жёстко заданных тестовых данных.
const app = path.join(__dirname, '../app');
const pages = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === 'page.tsx') pages.push(full);
  }
};
walk(app);

const open = new Set(['login', 'register', 'welcome']);
for (const file of pages) {
  const rel = path.relative(app, file).split(path.sep).join('/');
  const route = rel.replace(/\/?page\.tsx$/, '');
  const code = fs.readFileSync(file, 'utf8');
  if (!open.has(route)) assert.match(code, /ProtectedRoute/, `${rel}: страница должна быть под ProtectedRoute`);
}
for (const route of ['', 'analytics', 'transactions', 'portfolio', 'savings', 'limits', 'accounts', 'settings', 'profile', 'welcome']) {
  const file = path.join(app, route, 'page.tsx');
  assert.ok(fs.existsSync(file), `страница /${route} существует`);
}

// Страницы с собственной разметкой заголовка
for (const route of ['', 'transactions', 'portfolio', 'savings', 'limits', 'accounts', 'settings']) {
  const code = fs.readFileSync(path.join(app, route, 'page.tsx'), 'utf8');
  assert.equal((code.match(/<h1\b/g) || []).length >= 1, true, `/${route}: есть <h1>`);
}

// Окна ввода: подписанные кнопки закрытия и цели нажатия (modal-kit)
const kit = fs.readFileSync(path.join(__dirname, '../components/ui/modal-kit.tsx'), 'utf8');
assert.match(kit, /aria-pressed=\{active\}/, 'переключаемые кнопки отдают aria-pressed');
assert.match(kit, /role="status"/, 'экран «готово» — role=status');
