# SmartAid — REST endpoint tests

Manual click-through tests for every endpoint built so far. Each `.http` file
is self-contained: logs in at the top, captures the token, runs through every
endpoint in that group.

## How to run

1. Open VS Code in this repo.
2. Install the **REST Client** extension (search "REST Client" by Huachao Mao).
3. Make sure the Docker stack is up:
   ```
   docker compose up -d
   ```
4. Open any `.http` file in this folder.
5. Click **"Send Request"** above each request block (or `Ctrl/Cmd+Alt+R`).
6. **Run requests top-to-bottom** — later requests use tokens / ids captured
   from earlier ones (via `# @name xxx` references).

## Files

| File | What it covers |
|---|---|
| `00_health.http` | `/` and `/health` (no auth) |
| `01_auth.http` | `POST /api/auth/login`, `GET /api/auth/me`, plus 401/400 cases |
| `02_users.http` | Users CRUD + admin role guard + auto NGO-account on admin create + self-delete block |
| `03_shops.http` | Shops CRUD + shop_managers assign/list/unassign |
| `04_beneficiaries.http` | Beneficiaries CRUD + search by phone OR qr_code + shop_manager access to search only |
| `05_campaigns.http` | Campaigns CRUD + draft→active→closed transitions + NGO account money movement |
| `06_enrollments.http` | Enroll into campaign, list enrollments, update allocation, budget cap enforcement |
| `07_transactions.http` | Process redemption transaction (shop_manager), GET list/detail, receipt code generation, all edge cases |
| `08_reports.http` | Campaign summary, shop report, dashboard, filterable transactions report, campaign performance overview |
| `09_audit_logs.http` | Audit log listing, filters (user_id, action, entity_type, entity_id, date range), pagination, bad-input + role guards |

## Other REST clients

If you're not using VS Code:

- **JetBrains IDEs** (IntelliJ, WebStorm, etc.) support `.http` files natively.
- **Postman / Insomnia**: can import `.http` files in newer versions, otherwise
  ask Claude to convert to Postman JSON.

## Reset between runs

The destructive test data uses emails/phones prefixed with `rest-` or
`REST` so it's easy to spot. To reset to a clean state:

```
docker compose exec server npm run migrate:down
docker compose exec server npm run migrate:up
docker compose exec server npm run seed
```
