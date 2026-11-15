# Money: редизайн /transactions

- Статус: planned
- Цель: сделать страницу /transactions современной: современные иконки, свежий стиль, хорошая типографика. Две темы, 1440px и 375px.
- Ограничения: следовать frontend/DESIGN.md; только токены, без hardcoded hex; без push; credentials не записывать; логику и API не менять.
- Готово когда: страница визуально обновлена, build/tsc/тесты зелёные, designer и tester passed, всё вмержено в `llm`.
- Cleanup: C:\money\tmp-d2\ (скриншоты старого аудита, внутри репо) — удалить в конце, спросить пользователя.
- Fix-циклов: 0

## План

Корень: страница уже на токенах и lucide-react (новых зависимостей и токенов не нужно: muted, income, expense, chart-2 есть). Отставание от DESIGN.md и «современности»: H1 24px на десктопе (надо 32px), заголовок insights 18px (надо 16px/600), сводка без иконок, фильтр типа — чипы с цветными рамками вместо сегмент-контрола (DESIGN §7), строка операции без иерархии время/аккаунт, мелкие иконки Filter/Wallet. Логика, API, i18n-ключи и данные не меняются. Тесты в frontend/tests — regex по исходникам, при смене классов их нужно обновить. Скрипты: в frontend/package.json только dev/build/start/lint; тесты — `node --test tests/*.cjs` (в frontend/). Все карточки последовательные (общие файлы тестов, `.next`, docker-build, вкладка браузера).

### Карточка tx-ui-coder
- agent: coder
- title: Обновить визуал и типографику компонентов /transactions
- scope (только эти файлы): frontend/app/transactions/page.tsx (только разметка шапки/классы), frontend/components/transactions/transaction-summary.tsx, transaction-list.tsx, transaction-filters.tsx, transaction-insights.tsx; frontend/tests/transaction*.test.cjs (только подгонка regex под новые классы)
- instructions:
  1. Прочитать frontend/DESIGN.md (разд. 3, 4, 7, 9, 12) и эталон frontend/components/dashboard/recent-transactions.tsx (+ net-worth-header.tsx для шапки/плитки). Создать ветку `llm/tx-ui-coder` от `llm`.
  2. Только токены Tailwind, `formatMoney`/`formatPercent`, `t()`; новых ключей i18n по возможности не вводить (если нужны — ru и en одновременно). Иконки только из установленного lucide-react.
  3. page.tsx: H1 `text-2xl sm:text-[32px] sm:leading-10 font-bold tracking-tight` (сверить с H1 на dashboard), подзаголовок 14px muted. Кнопки действий без изменения логики, hit area ≥44px.
  4. transaction-summary.tsx: в каждую плитку иконка в плитке 40px `rounded-xl bg-muted` (lucide: TrendingUp — доход, TrendingDown — расход, Scale или Wallet — итог; цвет text-income / text-expense / по знаку net), подпись text-sm muted, сумма `text-2xl font-bold tabular-nums tracking-tight` (подстроку `text-2xl font-bold tabular-nums` сохранить, её проверяет тест). На 375px одна колонка, на sm+ три в ряд.
  5. transaction-list.tsx: название категории `text-sm font-semibold`; вторая строка 12px muted: аккаунт (иконка 14px) · описание; справа сумма `text-sm font-semibold tabular-nums`, под ней эквивалент в базовой валюте и время 12px muted tabular-nums; на sm+ muted `ChevronRight` h-4 w-4 aria-hidden; заголовок дня `text-sm font-semibold`, итог дня 12px tabular-nums. Круг иконки 32px (`h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted`) сохранить; getCategoryIcon не менять. Пустое состояние: иконка в плитке 48px `rounded-2xl bg-muted`.
  6. transaction-filters.tsx: поиск с Search слева (pl-10, не перекрывает текст); кнопка фильтров с SlidersHorizontal; фильтр типа — сегмент-контрол DESIGN §7: контейнер `inline-flex rounded-full bg-muted p-1`, пункты `rounded-full px-3 text-sm font-medium`, активный `bg-card text-foreground`, неактивный `text-muted-foreground`, высота ≥44px на мобильном; убрать цветные рамки. Сортировка: иконка ArrowUpDown h-4 w-4 в триггере. Логику setType/setSort/Select не менять.
  7. transaction-insights.tsx: заголовок `text-base font-semibold`; остальное без изменений.
  8. Обновить regex-тесты, ломающиеся от смены классов; проверки доступности и tabular-nums не ослаблять.
  9. Коммит только из scope, сообщение на русском, заканчивается на ` llm` (например «style(transactions): современная шапка, сводка с иконками, сегмент-контрол фильтра llm»). Ветку вмержить в локальную `llm`. Push запрещён.
- acceptance: изменения из instructions есть; логика/API/данные не изменены; нарушений по чеклисту DESIGN.md раздел 12 нет; dark и light, 1440px и 375px проверены в браузере, без горизонтального скролла и ошибок консоли; tap target ≥44px; commit только из scope, сообщение на русском с суффиксом `llm`, ветка `llm/tx-ui-coder` вмержена в `llm`, push не делался.
- depends_on: []
- parallel_group: —
- checks: (frontend/) `npx.cmd tsc --noEmit`; `npm.cmd run lint`; `node --test tests/*.cjs`; `npm.cmd run build`. Из корня репо `docker compose up -d --build` РАЗРЕШЁН (ресурс docker-build, одновременно не запускать). Затем Chrome MCP, отдельная вкладка: http://localhost:3000/transactions, dark и light, 1440px и 375px, консоль чистая, клик по строке открывает диалог деталей.
- forbidden: WORKFLOW_STATE.md, frontend/DESIGN.md, frontend/public/new-operation-prototype.html, globals.css, tailwind.config.ts, components/ui/*, add-transaction-dialog.tsx, transaction-details-dialog.tsx, lib/*, types, backend/, locales (кроме парных ключей ru+en при крайней необходимости), package.json/lockfile, tmp-d2/.

### Карточка tx-ui-designer
- agent: designer
- title: Визуальная проверка и доводка /transactions
- scope: файлы как в tx-ui-coder (кроме tests; page.tsx — только разметка/классы); экран только /transactions
- instructions: Chrome MCP, отдельная вкладка. Открыть /transactions в dark и light, 1440px и 375px; пройти чеклист DESIGN.md разд. 12; править стили, разметку и тексты (не логику) до исчезновения high и medium, максимум 3 итерации. Проверить иерархию размеров, tabular-nums сумм, выравнивание списка и insights, состояния loading/empty/error, фокус-кольцо, hit area ≥44px на 375px, обрезания, горизонтальный скролл. Не коммитить.
- acceptance: для каждого из dark/light × 1440/375 чеклист разд. 12 пройден, консоль без ошибок.
- depends_on: [tx-ui-coder] (стек пересобран после неё; ресурс docker-build)
- parallel_group: —
- checks: Chrome MCP, отдельная вкладка, http://localhost:3000/transactions; при правках файлов пересобрать `docker compose up -d --build` (docker-build, одновременно с другими не запускать).
- forbidden: WORKFLOW_STATE.md, DESIGN.md, globals.css, tailwind.config.ts, components/ui/*, диалоги транзакций, tests, lib/*, backend/, другие страницы.

### Карточка tx-ui-tester
- agent: tester
- title: Итоговая регрессия /transactions
- scope: проверки без правки кода
- instructions: после коммита правок designer в `llm`: (frontend/) `npx.cmd tsc --noEmit`, `npm.cmd run lint`, `node --test tests/*.cjs`, `npm.cmd run build`. Chrome MCP (отдельная вкладка, стек пересобран): smoke /transactions — список, фильтр типа, поиск, сортировка, пагинация, клик по строке открывает детали, кнопка «Добавить» открывает диалог, экспорт CSV; console и network без ошибок; dark/light, 1440/375.
- acceptance: проверки зелёные, ошибок console/network нет, регрессий поведения нет; отчёт orchestrator.
- depends_on: [tx-ui-designer]
- parallel_group: —
- checks: см. instructions; `docker compose up -d --build` (docker-build), если стек не свежий.
- forbidden: WORKFLOW_STATE.md, любые файлы приложения и тестов.

Следующий этап orchestrator: запустить tx-ui-coder; правки designer закоммитить на `llm/tx-ui-coder` (или в `llm`) до tester.
