# Money: активная новая волна

- Статус: verifying
- Прежние 2 цикла не ограничивают новую волну: пользователь разрешил продолжить. Максимум 2 цикла исправлений по результатам этой волны; затем остановка и решение orchestrator.
- Следующий этап: общий Docker build/health → final tester → designer-аудит.
- Риски: глобальные токены затрагивают все экраны, включая Overview; не менять его код. Не менять API, CRUD, исходные финансовые расчёты, данные и fixtures; destructive-сценарии только на изолированных тестовых данных.
- Общие правила coder: ветка `llm/<task_id>`; менять только перечисленный scope, не менять этот state, `frontend/DESIGN.md`, `frontend/public/new-operation-prototype.html`, Overview/Dashboard-экраны и остальные файлы; без зависимостей и попутного рефакторинга. Прочитать DESIGN.md и ближайший эталон раздела 11; только токены, `formatMoney` и `t()` с ключами ru/en. Нарушений по чеклисту DESIGN.md раздел 12 нет. Commit только из scope, сообщение заканчивается суффиксом `llm`, push запрещён. `docker compose up -d --build` coder выполнять нельзя.

## План

### tokens
- task_id: tokens
- agent: coder
- title: Исправить глобальный контраст существующих токенов
- scope: `frontend/app/globals.css`.
- instructions: Измерить и минимально скорректировать light `primary`, `primary-foreground`, `muted-foreground`, при необходимости согласовать существующий `ring`; проверить их на реальных фонах и состояниях обеих тем. Tailwind уже экспортирует токены; новых цветов и изменений общих controls не требуется: Button уже имеет h-11, нарушения вызваны локальными override.
- acceptance: текст и суммы ≥4.5:1, иконки и focus ≥3:1 в обеих темах на применимых фонах, включая Savings и состояние hover; общие правила coder выполнены.
- depends_on: []
- parallel_group: wave-tokens
- max_fix_cycles: 2
- checks: `frontend`: `npm.cmd run lint`; измерение контраста фактических computed цветов в браузере на light/dark Savings и репрезентативных кнопках.
- forbidden: все файлы вне scope; Docker rebuild.

### shared-controls
- task_id: shared-controls
- agent: coder
- title: Закрепить общий минимум для интерактивных controls
- scope: `frontend/components/ui/button.tsx`.
- instructions: Сохранить существующие варианты и визуальный API, но зафиксировать в общем Button минимальный 44×44 размер для default, sm и icon (широкие текстовые кнопки могут расти по ширине); сохранить существующий видимый focus-visible ring. Не компенсировать это уменьшением текста или локальными отрицательными отступами. Не менять Dialog, Select, Input или вызывающие экраны.
- acceptance: все Button-варианты по умолчанию имеют tap target не менее 44×44 и видимый focus без поломки `asChild`, disabled и keyboard поведения; общие правила coder выполнены.
- depends_on: [tokens]
- parallel_group: wave-shared-controls
- max_fix_cycles: 2
- checks: `frontend`: `npm.cmd run lint`; browser computed-size/focus smoke для default, sm, icon в обеих темах.
- forbidden: все файлы вне scope; локальные экраны, Dashboard/Overview, Docker rebuild.

### analytics-limits-profile
- task_id: analytics-limits-profile
- agent: coder
- title: Локализация и доступные controls аналитики, лимитов и профиля
- scope: `frontend/components/analytics/account-breakdown.tsx`, `detailed-expenses.tsx`, `spend-velocity-chart.tsx`, `asset-allocation.tsx`, `detailed-tags.tsx`, `spending-heatmap.tsx`, `analytics-filter.tsx`, `frontend/components/limits/limit-card.tsx`, `frontend/components/profile/motivational-stats.tsx`, `frontend/locales/ru/translation.json`, `frontend/locales/en/translation.json`, `frontend/tests/analytics-localization.test.cjs`.
- instructions: Использовать образец категорий из `components/transactions/transaction-list.tsx`: известные стандартные имена через `dashboard.categories.*`, пользовательские без преобразования; не менять ключи данных и агрегацию. Во всех затронутых analytics форматтерах передать i18n.language, перевести подписи, категории, tooltip и серии через t; корректно определять tooltip по dataKey, не по переведённому имени. Оси ≥12px. Убрать локальные h-8 overrides presets и edit/delete, delete — expense. Для Recharts использовать положительные размеры и при необходимости измерение/монтирование по паттерну ResizeObserver `dashboard/net-worth-chart.tsx`, не меняя Dashboard. Добавить небольшой regression на стандартную и пользовательскую категорию и локализованные строки/суммы, с существующим node:test паттерном.
- instructions: Перед правкой прочитать `frontend/DESIGN.md` и эталон ближайшего типа из §11 (`recent-transactions`, `expenses-donut` или `limits-summary`); использовать только токены, `formatMoney` и `t()` с ключами ru/en.
- acceptance: Analytics ru/en без смешения языков; пользовательские категории неизменны; стандартные Food/Shopping переведены в Limits и Profile; controls ≥44×44 с focus; графики видимы без предупреждений width/height -1 при переключении вкладок и resize; финансовые данные неизменны; нарушений по чеклисту DESIGN.md раздел 12 нет.
- depends_on: [tokens, shared-controls]
- parallel_group: wave-analytics
- max_fix_cycles: 2
- checks: `frontend`: `node --test tests/analytics-localization.test.cjs`; `npm.cmd run lint`; браузер: Analytics обе локали, графики и пресеты, Limits edit/delete, Profile категория.
- forbidden: файлы вне scope; Dashboard и Overview, Docker rebuild.

### savings
- task_id: savings
- agent: coder
- title: Доступные controls и поля Savings
- scope: `frontend/app/savings/page.tsx`, `frontend/locales/ru/translation.json`, `frontend/locales/en/translation.json`, `frontend/tests/savings-accessibility.test.cjs`.
- instructions: Заголовок text-2xl; edit/delete видимы на touch и focus, ≥44×44, подписаны через t, delete — expense. Связать Label htmlFor с уникальными id/name трёх calculator inputs; range с собственным id/name и локализованным aria-label, зона касания ≥44px, сохранив визуальный track. Не менять формулу, валидацию, обработчики и CRUD. Regression по связям labels/controls и range.
- instructions: Перед правкой прочитать `frontend/DESIGN.md` и эталон `components/dashboard/limits-summary.tsx` из §11; использовать только токены, `formatMoney` и `t()` с ключами ru/en.
- acceptance: calculator доступен keyboard и screen reader; цели можно безопасно редактировать/удалять после confirm; размеры и focus соблюдены; расчёты неизменны; нарушений по чеклисту DESIGN.md раздел 12 нет.
- depends_on: [analytics-limits-profile]
- parallel_group: wave-savings
- max_fix_cycles: 2
- checks: `frontend`: `node --test tests/savings-accessibility.test.cjs`; `npm.cmd run lint`; браузер: calculator и CRUD на изолированной цели.
- forbidden: файлы вне scope; Docker rebuild.

### portfolio
- task_id: portfolio
- agent: coder
- title: Адаптивная доступная аллокация и controls Portfolio
- scope: `frontend/app/portfolio/page.tsx`, `frontend/components/dashboard/asset-allocation-chart.tsx`, `frontend/components/portfolio/investment-forecast-card.tsx`, `frontend/tests/portfolio-allocation.test.cjs`.
- instructions: `asset-allocation-chart.tsx` находится в dashboard-каталоге, но его единственный caller — Portfolio; не менять остальные Dashboard файлы или Overview. Заголовок text-2xl; edit/delete ≥44×44, aria-label через существующие t, delete expense. Убрать фиксированную высоту, сжимающую мобильную легенду; min-h-11 для её controls. Центр доната адаптировать без усечения: при невозможности вместить полную `formatMoney` сумму показывать её вне кольца с доступной подписью. Округлить только отображаемые проценты методом наибольших остатков с детерминированным tie-break, согласовать легенду и tooltip, сохранить исходные значения сегментов. Обработать нулевые и некорректные значения без деления на ноль, не скрывая исходные данные. Устранить -1 Recharts в обоих графиках через положительные размеры/измерение, используя существующий ResizeObserver паттерн. Добавить node:test regression: 43+30+25+3 → 100, равные остатки, ноль и неизменность исходных значений.
- instructions: Перед правкой прочитать `frontend/DESIGN.md` и эталон доната `components/dashboard/expenses-donut.tsx` из §11; использовать только токены, `formatMoney` и `t()` с ключами ru/en.
- acceptance: 375px и 1440px сумма читаема целиком, легенда не сжата, проценты согласованы и дают 100 для положительного total; графики без -1 при mount/resize; API/CRUD/денежные расчёты неизменны; нарушений по чеклисту DESIGN.md раздел 12 нет.
- depends_on: [savings]
- parallel_group: wave-portfolio
- max_fix_cycles: 2
- checks: `frontend`: `node --test tests/portfolio-allocation.test.cjs`; `npm.cmd run lint`; браузер: разные суммы, распределения, resize и CRUD на изолированной позиции.
- forbidden: файлы вне scope, включая прочие `frontend/components/dashboard/*`; Docker rebuild.

### transactions
- task_id: transactions
- agent: coder
- title: Доступные controls и разделители Transactions
- scope: `frontend/app/transactions/page.tsx`, `frontend/components/transactions/transaction-filters.tsx`, `frontend/components/transactions/transaction-list.tsx`.
- instructions: Удалить локальные overrides h-8/h-10 для Add, Export, поиска, filter, type и sort; обеспечить каждому ≥44×44, видимый focus и аккуратную mobile-компоновку; применять существующие controls и токены. В списке заменить divide-white/[.09] на divide-border. Не менять сортировку, CSV, CRUD, фильтрацию или данные.
- instructions: Перед правкой прочитать `frontend/DESIGN.md` и эталон списка `components/dashboard/recent-transactions.tsx` из §11; использовать только токены, `formatMoney` и `t()` с ключами ru/en.
- acceptance: targets ≥44×44, keyboard и focus работают, разделитель различим в обеих темах, поиск/filter/sort/export/delete работают как прежде; нарушений по чеклисту DESIGN.md раздел 12 нет.
- depends_on: [portfolio]
- parallel_group: wave-transactions
- max_fix_cycles: 2
- checks: `frontend`: `node --test tests/transactions-design.test.cjs tests/transaction-list-day-total.test.cjs`; `npm.cmd run lint`; браузер: фильтры, export и удаление тестовой операции с undo.
- forbidden: файлы вне scope; Docker rebuild.

### regression
- task_id: regression
- agent: tester
- title: Финальная сборка, regression и browser smoke
- scope: все изменения волны; тестовые данные изолированы от рабочих.
- instructions: Не менять приложение или общий state; отчёт orchestrator. После всех coder объединений orchestrator единолично выполняет из корня `docker compose up -d --build`, ресурс `docker-build` эксклюзивен, параллельная пересборка запрещена. Только после завершения использовать свежий стек, Chrome MCP и отдельную вкладку tester. Проверить console/network, все findings, ru/en, обе темы, 375/1440; CRUD и delete/undo только на изолированных данных, CSV без раскрытия реальных данных. Указать пропуски, а не выдумывать результаты.
- acceptance: regression и сборка проходят; smoke проверяет консоль и сеть без неожиданных ошибок, локализацию, controls, расчёты, предупреждения Recharts и защиту пользовательских данных; отчёт отправлен orchestrator.
- depends_on: [transactions]
- parallel_group: wave-tester
- max_fix_cycles: 2
- checks: `frontend`: `node --test tests/*.test.cjs`, `npm.cmd run lint`, `npm.cmd run build` последовательно с выделенным `.next`; `backend`: `python -m pytest`; браузерные сценарии выше.
- forbidden: изменение файлов приложения, state и fixtures; самостоятельный Docker rebuild; общие вкладки и одновременное использование `.next`.

- max_fix_cycles: 2

### designer-analytics
- task_id: designer-analytics
- agent: designer
- title: Аудит Analytics
- scope: экран Analytics, без изменений приложения.
- instructions: Отчёт orchestrator; после tester использовать docker-build, Chrome MCP и отдельную вкладку. Проверить обе темы, 1440px/375px, ru/en, графики/оси/пресеты, keyboard, focus, contrast, loading/empty/error, overflow. Нарушений по чеклисту DESIGN.md раздел 12 нет.
- acceptance: отдельные результаты для Analytics и обеих тем/размеров; нет смешения языков, chart warning, tap/focus/contrast нарушений; checklist DESIGN.md §12 пройден.
- depends_on: [regression, analytics-limits-profile]
- parallel_group: wave-designer-analytics
- max_fix_cycles: 2
- checks: Chrome MCP, отдельная вкладка, ресурс docker-build.
- forbidden: приложение, state, Dashboard/Overview, prototype, Docker rebuild.

### designer-limits-profile
- task_id: designer-limits-profile
- agent: designer
- title: Аудит Limits и Profile
- scope: экраны Limits и Profile, без изменений приложения.
- instructions: Отчёт orchestrator; Chrome MCP, отдельная вкладка и docker-build после tester. Проверить обе темы, 1440px/375px, ru/en, категории, controls, focus, contrast, loading/empty/error. Нарушений по чеклисту DESIGN.md раздел 12 нет.
- acceptance: отдельные результаты Limits и Profile; стандартные категории переведены, пользовательские сохранены, controls доступны; checklist DESIGN.md §12 пройден.
- depends_on: [regression, analytics-limits-profile]
- parallel_group: wave-designer-limits-profile
- max_fix_cycles: 2
- checks: Chrome MCP, отдельная вкладка, ресурс docker-build.
- forbidden: приложение, state, Dashboard/Overview, prototype, Docker rebuild.

### designer-savings
- task_id: designer-savings
- agent: designer
- title: Аудит Savings
- scope: экран Savings, без изменений приложения.
- instructions: Отчёт orchestrator; Chrome MCP, отдельная вкладка и docker-build после tester. Проверить обе темы, 1440px/375px, labels/id/name/range, CRUD, focus, contrast, keyboard, loading/empty/error, overflow. Нарушений по чеклисту DESIGN.md раздел 12 нет.
- acceptance: отдельные результаты Savings для обеих тем/размеров; поля и range доступны, targets ≥44, confirm/delete безопасны; checklist DESIGN.md §12 пройден.
- depends_on: [regression, savings]
- parallel_group: wave-designer-savings
- max_fix_cycles: 2
- checks: Chrome MCP, отдельная вкладка, ресурс docker-build.
- forbidden: приложение, state, Dashboard/Overview, prototype, Docker rebuild.

### designer-portfolio
- task_id: designer-portfolio
- agent: designer
- title: Аудит Portfolio
- scope: экран Portfolio, без изменений приложения.
- instructions: Отчёт orchestrator; Chrome MCP, отдельная вкладка и docker-build после tester. Проверить обе темы, 1440px/375px, donut/legend/100%, charts, CRUD, aria-label, focus, contrast, loading/empty/error, overflow. Нарушений по чеклисту DESIGN.md раздел 12 нет.
- acceptance: отдельные результаты Portfolio для обеих тем/размеров; сумма и легенда читаемы, проценты согласованы, chart warnings отсутствуют, controls доступны; checklist DESIGN.md §12 пройден.
- depends_on: [regression, portfolio]
- parallel_group: wave-designer-portfolio
- max_fix_cycles: 2
- checks: Chrome MCP, отдельная вкладка, ресурс docker-build.
- forbidden: приложение, state, Dashboard/Overview, prototype, Docker rebuild.

### designer-transactions
- task_id: designer-transactions
- agent: designer
- title: Аудит Transactions
- scope: экран Transactions, без изменений приложения.
- instructions: Отчёт orchestrator; Chrome MCP, отдельная вкладка и docker-build после tester. Проверить обе темы, 1440px/375px, controls search/filter/sort/add/export, focus, contrast, delete/undo, разделители, loading/empty/error, overflow. Нарушений по чеклисту DESIGN.md раздел 12 нет.
- acceptance: отдельные результаты Transactions для обеих тем/размеров; все targets ≥44, focus виден, delete/undo работает на изолированных данных, checklist DESIGN.md §12 пройден.
- depends_on: [regression, transactions]
- parallel_group: wave-designer-transactions
- max_fix_cycles: 2
- checks: Chrome MCP, отдельная вкладка, ресурс docker-build.
- forbidden: приложение, state, Dashboard/Overview, prototype, Docker rebuild.
