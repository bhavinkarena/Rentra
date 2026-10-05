# Admin communication workspace - Phase 9

Guest reviews remain under Reviews & approvals, Support inbox stays in the footer, and Message delivery remains under Operations. Existing routes, endpoints and capabilities are preserved. No production backend service, schema, migration or dependency changes are required.

## Delivered

| ID           | Behavior                                                                                                                                                                                                                                                                                                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADM-COMMS-01 | Guest feedback uses the shared semantic, keyboard-scrollable admin table. Scores, full submitted feedback, owner replies, moderation states and separate open reports remain available. Counts derived from loaded rows explicitly say "on page" or "loaded".                                                                                                                      |
| ADM-COMMS-02 | Review details retain original scores/text, score-neutral publication previews, confirmation, reasons shared with the author, report resolution and durable history. Related property, booking and customer links use their independent read grants.                                                                                                                               |
| ADM-COMMS-03 | Support is subject-led with state, participant and assignment filters, matching total, pagination and filtered return context. Conversation details retain replies, private photos, internal notes, history, assignment, escalation and separate booking/privacy operations. Owner support categories resolve correctly.                                                           |
| ADM-COMMS-04 | Delivery shows queued, provider accepted, delivered, failed, unknown and suppressed outcomes separately. Details retain masked recipients, provider IDs, attempts, schedules and audit history. Unknown dispatch offers original-SID reconciliation; definitely undispatched failures offer retry. Existing atomic backend predicates reject repeated retries and ambiguous sends. |
| ADM-COMMS-05 | Read-only inspection is explicit; command forms and cross-workspace links require their grants. Tables scroll locally on phones, operator dates use deterministic IST, and View/return controls have 44 px targets. Review and delivery details retain list-page return context.                                                                                                   |

## Verification

Locally verified on 5 October 2026: 98 frontend tests; five focused backend integrations, zero skipped; 11 browser checks and 24 axe scans with zero violations and page errors. Production Webpack build, changed-source lint/format, backend lint, fixture formatting, Python syntax and 64-entry migration journal check pass. Successful admin replies return to the same conversation with validated list context; stale refusals retain the draft.

Existing unrelated global failures remain: 418 frontend review-script formatting errors and three icon warnings, the frontend launch roadmap formatting and backend `.prettierrc` formatting. Build retains configured public sitemap policy API warnings. Full backend suite and production providers were not exercised. Not deployed.

## Contract limits

Support's admin contract has no per-operator unread tracking: its `unread` field is not an admin unread count. Owner support unread/update behavior remains unchanged and is verified by the existing support integrations. This UI makes no unread claim or badge inferred from a page. Support matching totals and delivery state totals come from the API; loaded-page counts are labelled separately.

Suppression is recorded by existing lifecycle rules. There is no manual admin suppression endpoint, so the workspace displays Suppressed without inventing a suppression command. Provider accepted does not mean handset delivery. Reconciliation verifies the original dispatch and does not send a new message. No live chat, external messaging channel, provider worker or production send was added or exercised.

Private support attachments remain plain, non-prefetching audited download links behind the existing authenticated proxy. Internal notes/photos remain admin-only. Resolving support or closing a review report does not change a booking, refund, privacy request or publication by itself.

## Reproduce

Use an isolated localhost PostgreSQL server. Do not load backend production `.env`. Keep session JSON outside the repositories. From the backend:

```sh
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5469/postgres \
ADMIN_COMMS_FIXTURE=1 ADMIN_BASELINE_FIXTURE=../.tmp/admin-phase9-fixture.json \
ADMIN_BASELINE_EVIDENCE_DIR=../Rentra/docs/evidence/admin-phase9 \
ADMIN_BASELINE_API_PORT=4169 GATE_WEB_ORIGIN=http://127.0.0.1:3169 \
  node --import ./loader/register.mjs test/helpers/admin-experience-browser.mjs

PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5469/postgres \
CP01_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5469/postgres \
NODE_ENV=test SESSION_SECRET=phase9-disposable-tests-only \
  node --import ./loader/register.mjs --test \
  test/integration/review-moderation.integration.test.js \
  test/integration/support-cases.integration.test.js \
  test/integration/support-cases-extended.integration.test.js \
  test/integration/operational-incidents.integration.test.js
```

From the frontend:

```sh
RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4169/api/v1 \
  npm run build -- --webpack
RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4169/api/v1 \
  npx next start --hostname 127.0.0.1 --port 3169
ADMIN_BASELINE_FIXTURE=../.tmp/admin-phase9-fixture.json \
  python scripts/portal-gate/admin-comms.py
npm test
```

The gate needs Python Playwright, Chrome and pinned axe-core. Use a fresh fixture because it saves replies, publishes a review, closes a report and queues one safe retry; no worker sends it. Send `stop` to drop the fixture database, stop the isolated services and remove the private session JSON.

[Check record](evidence/admin-phase9/checks.json) | [Browser results](evidence/admin-phase9/browser-results.json)
