# Контекст пайплайна Money

- Статус: blocked
- Цикл исправлений: 2/2; дальнейшие изменения остановлены по лимиту пайплайна.
- Цель: выровнять все non-main страницы с Overview и frontend/DESIGN.md; Overview/Dashboard и prototype не менялись.

## Проверки
- Docker `config`, `up -d --build`, `ps`: passed.
- Health/login: 200/200.
- Frontend: 14/14 tests, lint, build: passed.
- Backend pytest: 18 passed.
- Browser: доступные non-main маршруты открываются; console/network в штатной навигации без системных 4xx/5xx.
- Demo password отсутствует в `.env`; auth submit и полноценное ru/en переключение не подтверждены.

## Остаточные findings после второго цикла
- Analytics: `frontend/components/analytics/asset-allocation.tsx:70` — в ru сумма остаётся en-формата; передать `i18n.language` в `formatMoney`.
- Limits: `frontend/components/limits/limit-card.tsx:39,42` — Edit/Delete 32×32 вместо минимум 44×44.
- Transactions: `frontend/app/transactions/page.tsx:176` — мобильная «Добавить N» 40px вместо минимум 44px.
- Portfolio: `frontend/components/portfolio/investment-forecast-card.tsx:186` и `frontend/components/dashboard/asset-allocation-chart.tsx` — Recharts width/height -1.
- Savings: `frontend/app/savings/page.tsx:242-259,264-270,277+` — поля без label/id/name; иконки около 32×32 вместо минимум 44×44.
- Не подтверждены: light 375px для всех экранов, английская локаль на каждом маршруте, loading/empty/error и полный keyboard-flow.

## Коммиты в ветке llm
- `aecef41`, `d08ec05`, `2d12dfd`, `45aa300`, `5dec413`, `a161e19`, `74ed486`
- `fc4bc04`, `1f4b6d7`, `7fe073f`, `ca262ae`, `2a0caad`, `2ad13e0`, `f5f54ba`
- `13fdd16`, `6af086e`, `9f02a5a`, `1e1c421`, `520f30b`, `2c08f44`, `3ff6da3`, `fa182a7`
- Push не выполнялся.
