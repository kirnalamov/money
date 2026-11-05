# Контекст пайплайна Money

## Управление
- Статус: checking
- Следующий этап: дождаться независимого browser retest, затем узкий dialog fix
- Цикл исправлений: 0
- Approval: designer подтвердил минимальную причину и предложил добавить скрытый `DialogTitle` в wrapper. Coder разрешён только на этот scoped fix, сохранив фактический чужой diff.

## Текущая задача
- Запрос: Провести полный аудит страницы «Операции» и исправить все проблемы.
- Цель: безопасно интегрировать накопленные UI-ветки, закрыть подтверждённый a11y defect диалога и повторно проверить незавершённые browser/build сценарии.
- Ограничения: не менять `frontend/DESIGN.md` и `frontend/public/new-operation-prototype.html`; без новых зависимостей; не терять чужие изменения; не push; remote `origin/llm` не менять; текущую ветку `llm/tx-coder-fixes` не переключать и не reset; credentials только через prompt агенту.
- Критерии готовности: commit `2e20f9c` принят; подтверждён безопасный минимальный способ обработки `DialogContent` без `DialogTitle`; regression, lint, build и требуемый browser smoke повторно пройдены; локальная plain branch `llm` создана от накопленного HEAD без изменения remote.

## План и активные task cards

### Волна 1 — независимые подтверждения и retest

#### tx-dialog-confirm
- task_id: tx-dialog-confirm
- agent: designer
- title: Подтвердить безопасную обработку a11y ошибки AddTransactionDialog
- scope: только аудит текущего `frontend/components/transactions/add-transaction-dialog.tsx` и связанного Radix Dialog поведения; отдельная Chrome MCP страница/контекст; отчёт orchestrator
- instructions: используй ponytail full; код и `WORKFLOW_STATE.md` не меняй. Проверь, что console error вызван отсутствующим `DialogTitle`, определи минимальный совместимый вариант исправления в wrapper (не в `frontend/public/new-operation-prototype.html`), и зафиксируй, как сохранить незакоммиченные чужие изменения. Не выполняй merge, reset, checkout или commit. Если изменение файла действительно необходимо, только опиши точный допустимый scope для последующего coder и явно запроси orchestrator approval.
- acceptance: кратко подтверждены причина, минимальный патч и отсутствие необходимости менять prototype; чужие изменения не затронуты; указано, можно ли после отчёта выдать coder scope. Designer не меняет приложение и state.
- depends_on: []
- parallel_group: confirm-and-retest
- checks: Chrome MCP в отдельной странице/контексте; открыть `http://localhost:3000/transactions`, login только credentials из prompt, открыть Add Transaction и проверить console a11y error и dialog semantics; не перезапускать сервер и не выполнять Docker build.
- forbidden: все файлы приложения, `WORKFLOW_STATE.md`, `frontend/DESIGN.md`, `frontend/public/new-operation-prototype.html`, чужая browser page/context, git branches/commits/push.

#### tx-browser-retest
- task_id: tx-browser-retest
- agent: tester
- title: Повторить незавершённые browser smoke сценарии Operations
- scope: только browser smoke страницы Operations: login/list/filter panel/add dialog/CSV/responsive overflow; отдельная Chrome MCP страница/контекст; отчёт orchestrator
- instructions: используй ponytail full; код и state не меняй. Повтори только ранее неполные сценарии на текущем runtime: login, список, фильтр, add dialog, CSV button, responsive overflow; отдельно отметь console error при открытии add dialog и не трактуй его как исправленный. Не занимай страницу designer и не перезапускай сервер.
- acceptance: для каждого сценария дан pass/fail и один краткий finding; console/network ошибки записаны только кратко; credentials и финансовые данные в отчёт не попадают. Tester не меняет приложение и state.
- depends_on: []
- parallel_group: confirm-and-retest
- checks: Chrome MCP, отдельная страница/контекст; `base_url=http://localhost:3000`, demo credentials только из prompt; browser smoke без build и без изменения тестовых данных сверх необходимого.
- forbidden: все файлы приложения, `WORKFLOW_STATE.md`, `frontend/DESIGN.md`, `frontend/public/new-operation-prototype.html`, чужая browser page/context, Docker rebuild, git branches/commits/push.

### Волна 2 — только после подтверждения dialog

#### tx-dialog-fix
- task_id: tx-dialog-fix
- agent: coder
- title: Минимально устранить подтверждённую DialogTitle a11y ошибку
- scope: только `frontend/components/transactions/add-transaction-dialog.tsx`; при явном подтверждении orchestrator — существующий `frontend/tests/add-transaction-dialog.test.cjs` только для regression этого дефекта; не трогать другие файлы
- instructions: используй ponytail full; запускать только после положительного отчёта `tx-dialog-confirm` и явного разрешения orchestrator. Не перезаписывай чужую незакоммиченную работу: сначала сохрани и проверь фактический diff, затем внеси минимальное изменение в wrapper Dialog согласно существующим `frontend/components/ui/dialog.tsx` паттернам. Добавь/обнови только необходимый regression assert для наличия доступного DialogTitle, если он входит в подтверждённый scope. Создай отдельную ветку `llm/tx-dialog-fix`, commit только scope карточки, message с отдельным суффиксом `llm`, push запрещён. Не редактируй общий state.
- acceptance: console a11y error устранён без изменения prototype/данных/API; regression воспроизводит прежнюю ошибку и проходит после фикса; commit создан только из scope карточки, message заканчивается `llm`; branch оставлена `llm/tx-dialog-fix`; push не выполнялся.
- depends_on: [tx-dialog-confirm]
- parallel_group: dialog-fix
- checks: рабочая директория `C:\money`; перед правкой `git diff -- frontend/components/transactions/add-transaction-dialog.tsx frontend/tests/add-transaction-dialog.test.cjs`; `npm run lint` и `npm run build` из `C:\money\frontend`; targeted regression существующим способом проекта; не выполнять Docker build параллельно с другими build.
- forbidden: `WORKFLOW_STATE.md`, `frontend/DESIGN.md`, `frontend/public/new-operation-prototype.html`, API/store/types, exports/config/fixtures вне scope, reset/checkout чужих изменений, `git push`.

### Волна 3 — после dialog fix

#### tx-final-checks
- task_id: tx-final-checks
- agent: tester
- title: Выполнить финальные regression, browser smoke и build проверки
- scope: только проверки объединённого результата; отдельная Chrome MCP страница/контекст; отчёт orchestrator
- instructions: используй ponytail full; не меняй код и state. После интеграции dialog fix повтори regression, lint/build и весь затронутый browser smoke, включая отсутствие console a11y error при Add Transaction. Используй существующие npm scripts из `frontend/package.json`; `npm test` не предполагай.
- acceptance: regression/lint/build/browser smoke фактически passed или есть точный blocker; ни один файл приложения не изменён tester; отчёт без credentials и сырых финансовых данных.
- depends_on: [tx-dialog-fix]
- parallel_group: final-verification
- checks: `C:\money\frontend`: `npm run lint`, `npm run build`, существующий targeted regression command; Chrome MCP отдельная страница/контекст на `http://localhost:3000`; не перезапускать чужой сервер и не запускать параллельный Docker build.
- forbidden: код приложения, `WORKFLOW_STATE.md`, `frontend/DESIGN.md`, `frontend/public/new-operation-prototype.html`, чужая browser page/context, git branches/commits/push.

#### tx-branch-consolidate
- task_id: tx-branch-consolidate
- agent: coder
- title: Безопасно консолидировать накопленный HEAD в локальную plain branch llm
- scope: только git refs/локальная интеграция; текущая ветка `llm/tx-coder-fixes` и её рабочие изменения не reset/не переключать до проверки; remote refs не менять
- instructions: используй ponytail full; запускать только после `tx-final-checks` passed и отдельного решения orchestrator. Проверить ancestor-цепочку всех UI commits, включая `2e20f9c` и dialog fix; создать локальную plain branch `llm` от текущего накопленного HEAD безопасным fast-forward/branch operation без push и без изменения `origin/llm`. Не коммитить чужие незакоммиченные изменения и не редактировать state. Branch policy: оставить локальную ветку `llm`; если требуется commit только для интеграции, message заканчивается `llm`.
- acceptance: локальная `llm` указывает на проверенный accumulated HEAD; `origin/llm` не изменён; текущие незакоммиченные чужие файлы сохранены или явно переданы orchestrator до операции; no reset/data loss; commit history содержит required llm suffixes; push не выполнялся.
- depends_on: [tx-final-checks]
- parallel_group: final-verification
- checks: `C:\money`: `git status --short --branch`, `git merge-base --is-ancestor` для UI branches и `2e20f9c`, `git branch --list llm`, сравнение `refs/remotes/origin/llm` до/после; никаких `git push`, `git reset --hard`, `git clean`.
- forbidden: application files, `WORKFLOW_STATE.md`, `frontend/DESIGN.md`, `frontend/public/new-operation-prototype.html`, remote `origin/llm`, deletion/overwrite of foreign uncommitted files, Docker/browser resources.

## Порядок слияния отчётов
- Сначала orchestrator получает `tx-dialog-confirm` и `tx-browser-retest`; карточки одной группы используют разные Chrome contexts.
- Только после подтверждения и явного решения о foreign diff запускается `tx-dialog-fix`; его Docker/build ресурс не совмещается с другими build.
- После coder commit orchestrator интегрирует его и запускает `tx-final-checks`; затем `tx-branch-consolidate` создаёт только локальную `llm` и не меняет `origin/llm`.
