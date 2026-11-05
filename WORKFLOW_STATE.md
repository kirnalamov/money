# Контекст пайплайна Money

## Управление
- Статус: coding
- Следующий этап: `settings-design`
- Цикл исправлений: 0

## План
- Завершить Settings, затем tester/designer-аудит изменённых экранов.
- Не менять расчёты, данные, API, локали, страницы Overview/Dashboard или общий state.
- После coder: передать результат orchestrator для обычного порядка проверок; designer/tester в эту минимальную карточку не добавляются.

## Blockers
- Предыдущий blocker снят: `frontend/components/dashboard/asset-allocation-chart.tsx` проверен как единственный caller на Portfolio (`frontend/app/portfolio/page.tsx`).

## Task cards

### settings-design
- `task_id`: `settings-design`
- `agent`: `coder`
- `scope`: `frontend/app/settings/page.tsx`, `frontend/locales/ru/translation.json`, `frontend/locales/en/translation.json`, `frontend/tests/settings-design.test.cjs`
- `acceptance`: видимые строки локализованы симметрично; reset требует подтверждения; категории/tags и unsaved warning работают; цвета только токены; focus/tap targets/aria-label соответствуют DESIGN.md; commit scope-only с suffix `llm`.
- `forbidden`: Overview/Dashboard, backend, API, DESIGN.md, prototype, WORKFLOW_STATE.md, push.
- `checks`: regression test, lint/build если доступны, git diff --check.

## Completed task cards
- `ui-tokens`: `aecef41`
- `sidebar-collapse`: `d08ec05`
- `formatter-coder`: `2d12dfd`
- `transactions-coder`: `45aa300`
- `portfolio-coder-allocation`: `5dec413`

### portfolio-coder-allocation
- `task_id`: `portfolio-coder-allocation`
- `agent`: `coder`
- `title`: `Привести график распределения активов Portfolio к DESIGN.md`
- `scope`:
  - `frontend/components/dashboard/asset-allocation-chart.tsx` — только визуальная разметка и presentation-состояния shared-компонента, используемого Portfolio.
- `instructions`:
  1. Работать в ветке `llm/portfolio-coder-allocation`; общий `WORKFLOW_STATE.md` не менять.
  2. Перед правкой прочитать `frontend/DESIGN.md`, раздел 11 и эталонный компонент `frontend/components/dashboard/expenses-donut.tsx`; сверить caller в `frontend/app/portfolio/page.tsx`.
  3. Устранить в этом компоненте hex-цвета, inline-цвета/тени и стили вне шкалы через уже существующие токены Tailwind; для сегментов доната использовать только `chart-1`…`chart-5`. Не добавлять новые токены.
  4. Заменить `formatCurrency` на `formatMoney` из `frontend/lib/utils.ts` с текущей валютой и локалью; не менять вычисления allocation, конвертацию, сортировку и значения.
  5. Использовать `t()` для всех отображаемых строк и только существующие одинаковые ключи ru/en; не менять файлы локалей.
  6. Привести размеры текста, карточку без теней, tooltip и легенду к DESIGN.md; убрать текст 10px и сохранить tabular-nums для сумм.
  7. Добавить/сохранить обязательные loading, empty и error presentation-состояния без нового API, изменения store или расчётной логики; empty не должен скрывать доступное состояние Portfolio.
  8. Сохранить доступность графика и интерактивной легенды: текстовая альтернатива, keyboard/focus-visible и aria-label там, где нужны интерактивные элементы.
  9. Не выполнять попутный рефакторинг. `docker compose up -d --build` не нужен и запрещён для этой карточки; ресурс `docker-build` не занимать.
  10. Проверить diff и создать commit только из разрешённого файла с сообщением, заканчивающимся `llm`; push запрещён. Commit должен быть пригоден для cherry-pick orchestrator-ом.
- `acceptance`:
  - В изменённом компоненте нет hex/hsl-цветов, декоративных теней, градиентов или цветов вне существующих токенов; сегменты используют только `chart-1`…`chart-5`.
  - Все суммы компонента выводятся через `formatMoney`; расчёты, конвертация, сортировка и формат данных не изменены.
  - Все новые/изменённые строки используют `t()` с ключами, существующими и в `locales/ru/translation.json`, и в `locales/en/translation.json`.
  - Нет текста меньше 12px; карточка и tooltip соответствуют токенам и паттерну эталонного доната; Overview/Dashboard поведение и расчёты не затронуты.
  - Реализованы проверяемые loading, empty и error состояния, а график имеет текстовую альтернативу и доступные интерактивные элементы.
  - Нарушений по чеклисту DESIGN.md раздел 12 нет.
  - Commit содержит только `frontend/components/dashboard/asset-allocation-chart.tsx`, его сообщение заканчивается `llm`, push не выполнялся.
- `depends_on`: `[]`
- `parallel_group`: `null`
- `checks`:
  - Рабочая директория `C:\money\frontend`: `npm.cmd run lint`.
  - Рабочая директория `C:\money\frontend`: `npm.cmd run build`.
  - Ручной сценарий без запуска Docker: открыть Portfolio с данными, проверить обе темы и отсутствие изменений в расчётах/поведении Overview/Dashboard; проверить loading, empty и error состояния компонента, tooltip, клавиатурный focus и текстовую альтернативу.
- `forbidden`:
  - Любые файлы, кроме `frontend/components/dashboard/asset-allocation-chart.tsx`.
  - `frontend/app/portfolio/page.tsx`, любые Overview/Dashboard callers и поведение других экранов.
  - `frontend/DESIGN.md`, `frontend/public/new-operation-prototype.html`, `frontend/app/globals.css`, `frontend/tailwind.config.ts`, `frontend/lib/utils.ts`, store, локали, API, backend, миграции, fixtures, exports и конфигурацию.
  - Изменение расчётов allocation, курсовой конвертации, состава данных, API-контрактов, persistence или общего state.
  - `docker compose up -d --build`, push и изменение общего `WORKFLOW_STATE.md`.
