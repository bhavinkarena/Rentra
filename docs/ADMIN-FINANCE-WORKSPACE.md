# Admin Finance workspace — Phase 8

Implemented and locally verified on 5 October 2026 on the existing frontend `main` and backend `master` branches. Not deployed.

## Delivered

The existing capability-filtered Finance tabs remain Payments, Refunds, Statements, Payouts and Disputes. Gateway settings remains under Settings & content. Refunds, statements, payouts and disputes now use the same semantic, keyboard-scrollable admin tables as payment investigation. Evidence details use admin headers and retain allocations, transactions, refund events, recorded payout destinations, dispute replies and private attachments. Shared owner surfaces retain their existing presentation.

Provider captures and successful refunds are evidence of provider outcomes, not verified bank transfers. Misleading “Actual bank money” figures are removed. Payment/refund details explicitly say bank settlement evidence is unavailable; payout detail distinguishes recorded settlement from bank verification. Quoted rent, receipts, refunds, refund reservations, eligibility, holds and recorded settlement stay separate. Test and simulated amounts never contribute to Live eligibility. Live payout execution remains unavailable.

Finance write capability controls reconciliation, refund requests/commands and dispute creation. Independent Records, Customers, Properties and Owners read capabilities control cross-workspace links. Existing backend route authority independently denies direct mutations and downloads. Read-only operators retain evidence without command forms.

Refund preview and confirmation retain the existing API hash, request key, concurrency and provider safeguards. Editing amounts disables confirmation until another preview. Both forms use the existing unsaved-change guard: preview does not mark the work saved; a recorded refund result clears the guard. Manual action dispatch retains entered values.

## Period contract

Admin statements, statement CSV and payout lists now use IST month boundaries, matching owner statements and dashboard dates. Start is inclusive and next month’s IST midnight is exclusive. Both boundaries are explicit timestamps, avoiding PostgreSQL session-timezone interval arithmetic. Default month is also resolved in IST. This intentionally changes the previous admin UTC receipt cohort; no schema or migration changes are needed.

Statements remain current receipt-cohort evidence with current refund/payout outcomes, not historical bank cash flow or tax statements. Downloads preserve selected period, environment, property and owner scope and keep the existing export audit and CSV escaping.

## Verification

- Frontend: 97 tests passed; repository lint and production Webpack build passed.
- Backend: five focused finance/refund/dispute integration checks passed, including exact IST boundary record identity, CSV authorization, refund limits/idempotency and dispute version/private-evidence safeguards. Lint, formatting and migration journal check passed (64 entries).
- Browser: 15 checks passed against the production build; five tables at 1280/768/390 px, keyboard scrolling, five evidence details, read-only UI/direct mutation denial, preview guard/stale amount, scoped CSV and reconciled ledger totals. All 21 axe scans had zero violations; no page errors.
- Regression evidence: the old admin query selected the wrong boundary allocation; the old refund preview cleared unsaved protection after preview. Both fail before their fixes and pass afterward.
- Fresh review, desktop/mobile screenshot inspection and Impeccable detector passed with no unresolved findings. Python gate syntax and changed-file formatting passed.

Full backend suite: 234 passed, one existing CP25 history-count failure, three skipped. `content.integration.test.js:204` expects four entries and receives five, already recorded in Phases 6–7. Frontend global formatting still flags only the unchanged `Rentra_Post_Development_Launch_Roadmap.md`. Neither is counted as a passing gate.

[Recorded checks](evidence/admin-phase8/checks.json) · [Browser results](evidence/admin-phase8/browser-results.json) · [Phone statements](evidence/admin-phase8/statement-allocations-390.png) · [Refund preview](evidence/admin-phase8/refund-preview.png)

## Reproduce

Use a disposable localhost PostgreSQL database; never load backend production `.env`. Keep the private session JSON outside the repository. Run each command from the indicated repository with local networking permitted.

```sh
# Backend; disposable PostgreSQL on 55432. Keep this process running.
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres \
ADMIN_BASELINE_FIXTURE=/tmp/admin-phase8-fixture.json \
ADMIN_BASELINE_EVIDENCE_DIR=../Rentra/docs/evidence/admin-phase8 \
ADMIN_BASELINE_API_PORT=4168 GATE_WEB_ORIGIN=http://127.0.0.1:3168 \
  node --import ./loader/register.mjs test/helpers/admin-experience-browser.mjs

# Separate backend terminal; once per fresh fixture.
ADMIN_BASELINE_FIXTURE=/tmp/admin-phase8-fixture.json \
  node --import ./loader/register.mjs test/helpers/seed-admin-finance-gate.mjs

NODE_ENV=test SESSION_SECRET=phase8-disposable-suite-secret-not-for-production \
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres \
  node --import ./loader/register.mjs --test \
  test/integration/finance-statements.integration.test.js \
  test/integration/refund-operations.integration.test.js \
  test/integration/disputes.integration.test.js

# Frontend; isolated production output.
RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4168/api/v1 \
  npm run build -- --webpack
RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4168/api/v1 \
  npx next start --hostname 127.0.0.1 --port 3168
ADMIN_BASELINE_FIXTURE=/tmp/admin-phase8-fixture.json \
  python scripts/portal-gate/admin-finance.py
```

The browser gate requires Python Playwright, Chrome and the project's pinned axe-core. The seed helper reuses the checkout fixture’s stubbed provider; the browser previews a refund and never sends it to a provider. Send `stop` to the fixture process to drop its database, stop the frontend/PostgreSQL servers and remove private session JSON. No real provider, transfer, tax/commission policy or production release journey is verified here.
