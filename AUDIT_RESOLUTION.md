# Audit resolution

Work was committed on `llm`, one commit per numbered audit task.

1. Login throttling now separates usernames sharing a client IP. Forwarded headers are not parsed by application code; configure Uvicorn's trusted proxies explicitly at deployment. This is not a global denial-of-service defence.
2. Original finding withdrawn: `get_db` already closes sessions in `finally`, rolling back transactions and releasing locks. Added a cleanup regression test.
3. Docs, OpenAPI and metrics are hidden by default. Set `EXPOSE_INTERNAL_ENDPOINTS=true` in the backend environment only behind restricted access, or use `DEV_MODE=true` locally. `/health` remains public for readiness checks.
4. Category deletion returns 409 while transactions reference it, preserving history. The original blanket claim of an inevitable foreign-key error was inaccurate: ORM relationship handling can clear references.
5. Original missing-migration finding withdrawn: the initial migration already has cascading association foreign keys. Added an attached-tag deletion regression test.
6. Any failed financial source blocks the protected UI until retry, preventing edits against an incomplete snapshot.
7. Automatically created recurring expenses use a stable SHA-256 ID for name/category/amount/currency. Identical automatic definitions in separate tabs share one record; intentionally distinct manual expenses remain allowed. Failed persistence removes the optimistic record.
8. The indexes already existed, contrary to the original report. Concurrent PostgreSQL workers now use a non-blocking advisory lock so only one cleans expired attempts at a time. Indexed cleanup remains request-driven for this deployment's small load; a dedicated cleanup job was not introduced.
9. Monetary input uses Decimal and rejects more than two decimal places or 20 digits. Numeric JSON responses remain compatible. Existing stored data is not rounded or rewritten; investment quantities and prices retain fractional precision.
10. Added category, tag, session cleanup, shared-IP, cookie/origin and partial-load tests. An isolated PostgreSQL concurrency check exercises duplicate payment protection and concurrent balance writes.
11. Browser login/refresh requests use HttpOnly, SameSite=Strict refresh cookies; HTTPS sets Secure. Cookie refresh/logout require a trusted Origin. Existing API clients may continue sending refresh tokens in JSON. The frontend keeps access tokens in localStorage for cross-tab compatibility; XSS can still steal an active access token. Existing stored refresh tokens migrate on the next successful refresh/login.
12. Production responses no longer expose X-Process-Time.

## Verification

- `python -m pytest -q`: 18 passed.
- `node --test tests/*.test.cjs`: 9 passed.
- `npx.cmd tsc --noEmit --incremental false`: passed.
- `docker compose up -d --build`: passed, persistent database volume retained.
- `docker compose exec -T backend python tests/check_postgres_concurrency.py`: passed. Uses a unique temporary schema, removed afterward; does not modify application rows.

## Deployment limits

Serve browser and API on the same site for SameSite=Strict cookies. Cross-site hosting needs an explicitly designed cookie/CSRF policy, not a blanket SameSite=None change. Use HTTPS outside local development. Backend settings not listed in Compose must be explicitly passed to the service before they take effect.

Not checked: interactive browser flows, sustained load, external proxy/TLS configuration, dependency vulnerability scanning. This closes the numbered audit work, not a certification of production security.
