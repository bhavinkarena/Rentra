# CP25 — Public help, content and policy publication

Status: **IN PROGRESS — implementation present; runtime acceptance blocked, 28 September 2026.** Do not mark complete or deploy until the database and browser gates below pass. Acceptance: CA17, CA19, CA23; editorial portion of G24/G29.

## Implemented scope

- Admin `/admin/content` directory and `/admin/content/:kind` editors for `terms`, `privacy`, `cancellation`, `help` and `contact`. Permission-aware navigation, colocated loading boundaries, explicit forbidden/missing/outage states and read-only working-copy inspection.
- Typed working copies: policy headings/plain-text sections; help introduction, questions, answers and allowlisted internal links; support email, WhatsApp digits, staffed-hours text and Asia/Kolkata timezone. Sections/answers can be added, removed and reordered within bounded limits. Arbitrary HTML, scripts, external help destinations and extra schema fields are refused; React renders text without HTML injection.
- Draft save → recorded review → signed preview → explicit publication. Every command includes a reason and expected draft revision. Editing invalidates review. The editor preserves failed input, offers conflict reload, retains the last reason after refresh and warns on reload/close with unsaved edits.
- Publication takes effect immediately at a database timestamp. Review records the operator's acknowledgement of policy accuracy and authorized contact channels; it does not claim automated provider verification, legal approval or a guaranteed response time. The same authorized operator can review and publish; no two-person approval rule is invented.
- Published records are append-only. PostgreSQL rejects their updates/deletion. Restoring history creates a new draft; it requires review and publication under a fresh version. Paginated history and permanent URLs keep earlier publications addressable.
- Backend code-defined policy versions `2026-09-20` and `2026-09-21` are retained unchanged as original publications. The first contact draft snapshots the existing backend-configured contact channels, so later environment edits cannot rewrite that historical baseline. This snapshot is explicitly marked as a baseline, with no fabricated reviewer.
- Public `/help`, `/policies/:kind`, `/policies/:kind/:version`, and `/help/history/:kind/:version` read only public versions. The floating WhatsApp link uses the same published contact source. Sitemap policy links track current publications. Primary public content reads use `no-store`; the optional marketing WhatsApp widget uses a five-minute cache whose tag is immediately expired by contact publication through the admin UI. Successful publication also invalidates the Next layout. Drafts/reviews do not change live policy content. An API outage surfaces an error instead of silently substituting obsolete terms; the optional WhatsApp widget hides on outage.
- New booking quotes include terms, privacy and cancellation publication versions, content hashes and permanent URLs in their existing policy snapshot and quote digest. Checkout displays these links with the acceptance control. A new policy publication invalidates an unaccepted older quote; the customer must review a fresh quote. Accepted order/visit snapshots retain their versions, as does the hold acceptance event. Payment dispatch for an already accepted hold compares its pinned policy publications, rather than rewriting them to the latest copy.
- Booking detail links the accepted public versions. Older bookings without those references are not backfilled with invented acceptance. New support requests link to the current terms version; their historic version remains unchanged.
- `admin.content.read` and `.write` are separate capabilities, checked by route middleware and the active-admin service layer. Per-kind transaction locks serialize draft/publication changes; a shared publication lock ties quote acceptance to a consistent current policy set. Publications and audit records commit together.

## API and migration

Admin API under `/api/v1/admin/content`:

- `GET /`: directory with current publication and working-copy status.
- `GET /:kind?historyPage=1`: current public document, saved working copy and publication history, 25 stored publications per page plus original versions on the final page.
- `POST /:kind`: `{ command, version, reason, body?, sourceVersion?, confirmed?, previewHash? }`. Commands: `save`, `restore`, `review`, `preview`, `publish`. A signed preview binds operator, reviewed draft/body, current publication and publication reason.

Public API: `GET /api/v1/discovery/content/:kind/:version?`. Missing versions are 404; drafts have no public route. No delete/unpublish operation exists.

Migration [0036_content_publication.sql](../../rentra-backend/drizzle/0036_content_publication.sql) adds working-copy and publication tables, version/current indexes, type/review constraints and an immutable-publication trigger. The schema, snapshot and journal are included. Booking acceptance uses existing JSON snapshots and lifecycle history; it does not rewrite historical rows.

**0036 remains unapplied to the configured database.** It was applied to disposable databases during CP26 verification; the original CP25 runtime command had been rejected before execution. No configured database was inspected or changed. Prior pending migration status is recorded in the session tracker and was not rechecked. After runtime acceptance and deployment authorization, apply the outstanding migrations through 0036 before deploying backend and frontend together. A configured `SESSION_SECRET` is required for publication signatures. Before initial contact editing, ensure the backend's `RENTRA_SUPPORT_EMAIL`, `NEXT_PUBLIC_WHATSAPP_NUMBER` and `RENTRA_SUPPORT_HOURS` reflect the intended existing channels; the public UI no longer reads a separate frontend contact configuration.

## Verification actually passed

- Backend service/unit tests: **54/54 passed**, including four CP25 tests for original policy preservation, unknown versions, plain-text/link/contact validation, capability separation and outage propagation. These do not open a database.
- Frontend tests: **36/36 passed**.
- Both repositories: lint and formatting checks passed.
- Frontend Webpack production build passed.
- Migration-file/journal check: **37 entries**, without database access. Drizzle generation reports no schema drift.
- Whitespace checks passed. No browser, accessibility, database integration or runtime migration acceptance is claimed.

## Original blocker and required completion gates

Automatic approval review rejected the disposable local database command because its approval service reported: **"You've hit your usage limit"**. The command did not execute. No alternate database connection, browser launch or indirect execution was used to bypass that rejection.

At the original CP25 handoff, the following files were prepared but **not executed**. The later CP26 run attempted the integration test and found the fixture failure recorded below; browser/outage gates remain unexecuted:

1. Backend `test/integration/content.integration.test.js`: real migration, scope, duplicate/stale commands, required review, signed preview/actor binding, one-winner publication, immutable history, rollback under a fresh version, contact baseline preservation, quote invalidation and accepted-hold preservation. Run the full backend suite afterward for booking/payment/support regressions.
2. Frontend `scripts/portal-gate/cp25_gate.mjs`: draft/public isolation, review/publish, historical URLs, rollback, help/contact customer rendering, channel removal, stale-editor recovery, scoped access and desktop/mobile axe/overflow checks.
3. Frontend `scripts/portal-gate/cp25_outage_gate.mjs`: retryable admin and public content failures with the API stopped.

[Browser evidence placeholder](rentra-client-admin-part25-gate.json) and [outage evidence placeholder](rentra-client-admin-part25-outage-gate.json) explicitly say **not run**; they are not passing gate evidence. Actual gate scripts replace them only when executed.

Once local runtime execution is available and approved, run against disposable PostgreSQL only:

```sh
# rentra-backend
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres CP01_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres npm test
npm run lint
npm run format:check
npm run db:check
```

Then start the shared fixture and frontend in separate terminals:

```sh
# rentra-backend
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres CP06_GATE_FIXTURE=/tmp/cp25-fixture.json FIXTURE_STAGE=published node --import ./loader/register.mjs --env-file=.env test/helpers/serve-property-review.mjs

# Rentra
RENTRA_BROWSER_FIXTURE=1 RENTRA_BROWSER_FIXTURE_ID=cp25 NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1 npx next dev --webpack -p 3106
```

Run `GATE_TOKENS=/tmp/cp25-fixture.json node scripts/portal-gate/cp25_gate.mjs` from `Rentra`. Use a fresh fixture for each workflow run. Send `stop` to the fixture stdin to drop its database, retain the frontend, then run `GATE_TOKENS=/tmp/cp25-fixture.json node scripts/portal-gate/cp25_outage_gate.mjs`. Stop the frontend and remove temporary fixture credentials afterward. Override Chrome/Playwright paths with `CHROME` and `PLAYWRIGHT_MODULE` if necessary.

Fix any gate failures, rerun affected checks and update this runbook, tracker, audit and generated plan HTML together. Only then mark CP25 complete and add its detailed delivered card to `scripts/build-client-admin-plan.py`.

## Explicit boundaries

No future-dated scheduling, automatic legal review, bulk messages, email/WhatsApp verification adapter, media library, arbitrary page builder, search-intent editor or operational pricing/refund-rule editor is included. Contact hours are bounded editorial text in the stated timezone. New copy cannot enable a payment method or change cancellation calculations. No legal or financial promises were invented.

The next session should **continue CP25 runtime gates**. CP26 was completed independently because its dependencies are CP01–02; CP25 remains in progress.

## Verification update during CP26 — 28 September 2026

Local execution is available. The broader backend suite reached the CP25 integration test and failed with `INVENTORY_REMEDIATION_REQUIRED`: its seeded confirmed booking has no matching inventory reservations. Correct/reconcile that disposable fixture, then run the integration, browser and outage gates. No CP25 browser acceptance was performed. Migration 0036 was applied only to disposable databases during this run and remains unapplied to the configured database. CP25 stays **IN PROGRESS**; CP26 is complete independently.
