# Admin operations and configuration workspace

Phase 10 is locally verified on 5 October 2026. Existing contracts, deep links and independent capability grants remain authoritative.

## Delivered

Service health puts incidents and heartbeat evidence before diagnostic aggregates. Seven queues use the shared semantic, locally scrollable table: operational alerts, privacy requests, audit events, governed exports, public content, catalogues and operators. Details retain review, reason, preview, confirmation, version and history safeguards. Dates are IST; audit export filter boundaries remain UTC.

Privacy covers customer accounts only. Partial anonymization can retain historical personal information. Identity/authority and verified receipt-delivery references, blocking conditions, retention acceptance, worker status, receipts and expiring copies remain explicit. No broader identity scope is implied.

Governed exports are creator-scoped and capability-checked at download time. Expired/revoked copies cannot be downloaded; receipts remain independently available under their existing retention policy. Downloads use authenticated, non-prefetching private links and no-store/nosniff headers. Event fields remain redacted. Read-only roles have no mutation forms; related records require their separate read grants.

Settings retain publication review/preview/history, catalogue impact previews, Test-only gateway configuration and operator access/enrollment/recovery/session controls. Owner guide now works through route, server action and immutable public-history allowlists. No new endpoint, dependency, stored preference or migration was added.

## Verification

98 frontend tests, seven focused backend tests (zero skipped), 15 browser checks and 37 axe scans pass with zero accessibility violations and page errors at 1280/768/360 px. Browser checks exercise actual TOTP enrollment and single-use token refusal, Owner guide publication, private export/receipt downloads, expiry refusal, readonly command denial, incident open/acknowledge, privacy review and gateway persistence. CP25 verifies preserved seeded versions plus both newly published versions; it no longer assumes a fixed seed count. Production build, changed-source lint/format, backend lint and Python syntax pass. Existing global formatting/lint issues are recorded in checks.json. Full production/provider/release journeys remain unverified. Not deployed.

## Reproduce

Use disposable localhost PostgreSQL, never backend production .env. Keep private fixture JSON outside both repositories. Commands below use shell environment syntax; use equivalent PowerShell `$env:` assignments on Windows.

```sh
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5470/postgres \
ADMIN_OPS_FIXTURE=1 ADMIN_BASELINE_FIXTURE=../.tmp/admin-phase10-fixture.json \
ADMIN_BASELINE_EVIDENCE_DIR=../Rentra/docs/evidence/admin-phase10 \
ADMIN_BASELINE_API_PORT=4170 GATE_WEB_ORIGIN=http://127.0.0.1:3170 \
  node --import ./loader/register.mjs test/helpers/admin-experience-browser.mjs

PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5470/postgres \
CP01_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5470/postgres \
NODE_ENV=test SESSION_SECRET=phase10-disposable-tests-only \
  node --import ./loader/register.mjs --test \
  test/integration/privacy.integration.test.js \
  test/integration/audit-browser.integration.test.js \
  test/integration/operators.integration.test.js \
  test/integration/catalogues.integration.test.js \
  test/integration/operational-incidents.integration.test.js \
  test/integration/content.integration.test.js
```

From the frontend:

```sh
RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4170/api/v1 \
  npm run build -- --webpack
RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4170/api/v1 \
  npx next start --hostname 127.0.0.1 --port 3170
ADMIN_BASELINE_FIXTURE=../.tmp/admin-phase10-fixture.json \
  python scripts/portal-gate/admin-operations.py
npm test
```

Python Playwright, Chrome and installed axe-core are required. Use a fresh fixture per gate: it queues an export, records an incident/review, saves Test configuration, publishes a guide and enrolls a synthetic operator. No provider worker runs. Send `stop` to the fixture helper to drop its database, stop the isolated frontend/PostgreSQL and remove the private session JSON. Never commit enrollment URIs, passwords, cookies or private fixture JSON.

[Checks](evidence/admin-phase10/checks.json) | [Browser evidence](evidence/admin-phase10/browser-results.json)
