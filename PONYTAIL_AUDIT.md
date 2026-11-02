# Repository audit

What this repo does: It is a personal-finance app with a Next.js website, a FastAPI backend and a PostgreSQL database. People can record accounts and transactions, set goals and limits, and view financial summaries.

I assumed a small multi-user deployment, with people using several browser tabs and keeping years of transactions. The audit focused on money, authentication, data storage and deployment; it does not establish that the app is safe for public production use.

## Must fix

1. **The capital chart can show money before an account existed** (`frontend/components/dashboard/net-worth-chart.tsx:103-110, 142-158`)
   - **What this is:** The chart starts with today’s account balances and reverses later transactions to estimate past balances.
   - **Problem:** An account created today with an opening balance of $1,000 and no transactions appears to have held $1,000 throughout earlier selected dates. Long periods are also sampled weekly, so changes between sampled days can disappear.
   - **Fix:** Record an opening balance with its date, exclude accounts before that date, and preserve meaningful changes when choosing chart points.
   - **If we skip it:** The chart can present an invented financial history as fact.

2. **The limits page does not calculate spending** (`frontend/components/limits/limit-list.tsx:12-37`, `frontend/components/limits/add-limit-dialog.tsx:55-60`, `frontend/components/dashboard/limits-summary.tsx:29-45`)
   - **What this is:** A limit has a stored `spent` value; the dashboard separately calculates monthly spending from transactions.
   - **Problem:** A new limit starts with `spent: 0`, and transactions do not update it. A user can spend $100 against a $100 limit and still see zero spent on the limits page, while the dashboard shows a different result.
   - **Fix:** Calculate spending from transactions for the selected daily, weekly or monthly period in one shared calculation.
   - **If we skip it:** Users can believe they are within budget after exceeding it.

3. **Reset can erase the only copy of old browser data** (`frontend/app/settings/page.tsx:126-130`, `frontend/lib/legacy-backup.ts:1-9`)
   - **What this is:** The app preserves old browser data as a backup and offers it for download or import.
   - **Problem:** Settings calls `localStorage.clear()`, which also deletes that backup. The confirmation says all data will be reset, but server records remain and the local backup can be irrecoverably lost.
   - **Fix:** Remove only the intended preference keys; keep the backup unless the user explicitly chooses to delete it after a clear warning.
   - **If we skip it:** A user can permanently lose financial records that exist only in the browser.

4. **Changing a password leaves existing sessions usable** (`backend/app/api/api_v1/endpoints/users.py:43-52`, `backend/app/api/api_v1/endpoints/auth.py:127-180`)
   - **What this is:** A refresh token lets a device obtain new access tokens without entering the password again.
   - **Problem:** Password changes update the password hash but do not revoke existing refresh tokens. Someone with an old token can continue renewing access after the owner changes the password.
   - **Fix:** Revoke the user’s refresh tokens in the same database transaction as the password change, and require a new login.
   - **If we skip it:** A password change does not reliably remove an unwanted session.

5. **The API accepts non-finite money values** (`backend/app/schemas/account.py:6-10`, `backend/app/schemas/core.py:70-72, 89-90`)
   - **What this is:** These schemas validate account balances and transaction amounts received by the API.
   - **Problem:** `AccountCreate` accepts `NaN` and `Infinity`, and a transaction amount accepts `Infinity`; I confirmed this directly against the schemas. These are not usable financial amounts and can cause database or response-serialization failures.
   - **Fix:** Reject non-finite numbers at every money input boundary, including creates and updates, and add tests for these values.
   - **If we skip it:** A malformed request can produce errors or unusable financial data.

6. **Profile totals add different currencies as if they were dollars** (`frontend/components/profile/motivational-stats.tsx:17-29, 48-56, 96`)
   - **What this is:** The profile shows savings and compares spending between months and categories.
   - **Problem:** It adds raw amounts without currency conversion, then prefixes savings with `$`. For example, 100 USD plus 10,000 RUB is displayed as `$10,100`.
   - **Fix:** Convert each amount to the selected display currency using the existing conversion helper, and label the currency.
   - **If we skip it:** Savings totals and spending comparisons can be materially wrong.

7. **Goals, categories and tags disappear after the first 100** (`backend/app/api/api_v1/endpoints/goals.py:31-44`, `frontend/lib/api/goals.ts:30-32`, `frontend/lib/api/categories.ts:4-6`, `frontend/lib/api/tags.ts:4-6`)
   - **What this is:** The backend returns at most 100 items by default. Account and transaction clients request subsequent pages.
   - **Problem:** The goals, categories and tags clients request only one page. The 101st item remains in the database but is absent from the website.
   - **Fix:** Fetch all pages as the account and transaction clients do, with stable ordering on the backend.
   - **If we skip it:** Existing data becomes invisible as a user’s records grow.

8. **The displayed exchange rate can be a silent fallback** (`backend/app/services/exchange_rates.py:15-21, 87-100`, `frontend/lib/store.ts:98-105`)
   - **What this is:** The app converts balances and spending into a chosen currency.
   - **Problem:** If the rate provider fails before a successful fetch, fixed fallback rates are used; if it fails later, the last rate is kept. The frontend records the update marker but financial totals do not clearly warn that the rate is fallback or stale.
   - **Fix:** Show the rate date and a visible fallback/stale warning wherever converted totals are presented.
   - **If we skip it:** Users can rely on materially incorrect converted balances without knowing the rate is old.

9. **A failed reload after a successful edit leaves the screen wrong** (`frontend/lib/store.ts:336-355, 385-398`)
   - **What this is:** After editing or deleting a transaction, the client reloads related data.
   - **Problem:** The server may successfully save an edit or deletion, then a subsequent account/category/tag request may fail before local state is updated. The user sees an error and the old transaction even though the server already changed it.
   - **Fix:** Apply the successful transaction response or deletion immediately, then reload related data separately and show a refresh warning if that fails.
   - **If we skip it:** Users can retry an operation that already succeeded or make decisions from stale balances.

## Should fix

10. **Refresh tokens are stored as usable secrets in the database** (`backend/app/models/refresh_token.py:9-14`, `backend/app/api/api_v1/endpoints/auth.py:113-119, 144-145`)
    - **What this is:** The database stores refresh tokens to support session revocation.
    - **Problem:** The complete token is stored, so someone who obtains a database dump can use an unexpired, unrevoked token to obtain access.
    - **Fix:** Store a cryptographic hash of each refresh token and compare hashes when refreshing or logging out.
    - **If we skip it:** A database or backup leak can also become an account-access leak.

11. **The normal backend test command and frontend lint do not pass** (`backend/test_docker_auth.py:1-9`, `frontend/package.json:8-12`)
    - **What this is:** These commands are the project’s basic automated checks.
    - **Problem:** `python -m pytest -q` fails during collection in the current environment because a Docker authentication helper loads local settings; `npm run lint` reports 26 errors and 35 warnings. In contrast, `python -m pytest -q tests` passed all 11 tests, and all four frontend test scripts passed individually.
    - **Fix:** Keep the Docker-only helper out of normal test collection, fix the lint errors, and provide a single documented test command.
    - **If we skip it:** Developers cannot rely on the default checks to distinguish a regression from existing failures.

**Verdict:** Fix the incorrect financial displays and backup-loss risk first, then session revocation and money validation.

**Not checked:** I did not modify code or financial records, run destructive tests, test concurrent writes against PostgreSQL, perform a full security penetration test, or inspect every UI component and dependency. The existing backend tests use SQLite, so they do not prove PostgreSQL locking behavior.
