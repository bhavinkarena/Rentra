# CP25 — Public help, content and policy publication

Status: **COMPLETE — 28 September 2026.** Database, production-browser and outage acceptance passed. Implementation progress: **29/32**, next **CP30**. Acceptance: CA17, CA19, CA23; editorial portion of G24/G29. Migration `0036_content_publication` remains unapplied to the configured database.

## Implemented scope

- Admin `/admin/content` directory and `/admin/content/:kind` editors for `terms`, `privacy`, `cancellation`, `help` and `contact`. Permission-aware navigation, colocated loading boundaries, explicit forbidden/missing/outage states and read-only working-copy inspection.
- Typed working copies: policy headings/plain-text sections; help introduction, questions, answers and allowlisted internal links; support email, WhatsApp digits, staffed-hours text and Asia/Kolkata timezone. Sections/answers can be added, removed and reordered within bounded limits. Arbitrary HTML, scripts, external help destinations and extra schema fields are refused; React renders text without HTML injection.
- Draft save → recorded review → signed preview → explicit publication. Every command includes a reason and expected draft revision. Editing invalidates review. The editor preserves failed input, offers conflict reload, retains the last reason after refresh and warns on reload/close with unsaved edits.
- Publication takes effect immediately at a database timestamp. Review records the operator's acknowledgement of policy accuracy and authorized contact channels; it does not claim automated provider verification, legal approval or a guaranteed response time. The same authorized operator can review and publish; no two-person approval rule is invented.
- Published records are append-only. PostgreSQL rejects their updates/deletion. Restoring history creates a new draft; it requires review and publication under a fresh version. Paginated history and permanent URLs keep earlier publications addressable.
- Backend code-defined policy versions `2026-09-20` and `2026-09-21` are retained unchanged as original publications. The first contact draft snapshots the existing backend-configured contact channels, so later environment edits cannot rewrite that historical baseline. This snapshot is explicitly marked as a baseline, with no fabricated reviewer.
- Public `/help`, `/policies/:kind`, `/policies/:kind/:version`, and `/help/history/:kind/:version` read only public versions. The floating WhatsApp link uses the same published contact source. Sitemap policy links track current publications. Primary public content reads use `no-store`; the optional marketing WhatsApp widget uses a five-minute cache whose tag is immediately expired by contact publication through the admin UI. Admin working-copy pages refresh after successful commands. Public documents and sitemap policy reads already use `no-store`, so publication does not invalidate the entire application layout; only the cached contact widget tag needs immediate expiry. Drafts/reviews do not change live policy content. An API outage surfaces an error instead of silently substituting obsolete terms; the optional WhatsApp widget hides on outage.
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

## Verification — 28 September 2026

| Check | Actual result |
| --- | --- |
| CP25 real-database integration | **1/1 passed**, all 41 migrations applied to a disposable local database; permissions, invalid input, required review, stale revisions, actor-bound signed preview, concurrent one-winner publication, immutable publication update/delete rejection, rollback under a fresh version, contact baseline preservation, obsolete-quote refusal and accepted-hold snapshot preservation |
| Full backend regression | **141/141 passed**, zero failures or skips, using both disposable database URL variables |
| Browser/API | **43/43 passed**, production Webpack frontend and disposable Express backend; [evidence](rentra-client-admin-part25-gate.json) |
| Browser scope | Draft/public separation, publication, historical policy URLs, fresh rollback version, published help/contact rendering, removed WhatsApp, timezone hours, historical contact, stale-editor input preservation/reload and permission denial |
| Accessibility/layout | Content directory, policy editor, public policy, contact editor and public help at 1280px and 390px: no horizontal overflow or serious/critical axe WCAG 2 A/AA findings |
| API outage | **10/10 passed** with the disposable API stopped: admin directory/all five editors, help, current/historical policy and historical help show retryable errors; [evidence](rentra-client-admin-part25-outage-gate.json) |
| Frontend | **36/36 tests**, production Webpack build, full lint and format checks passed |
| Backend static | Full lint/format, whitespace and `db:check` passed; 41 migration files/journal entries verified |

The original runtime approval usage-limit blocker was superseded by authorized local execution. The CP25 test subsequently exposed two fixture errors: the legacy confirmed booking lacked explicit inventory evidence, and its held-terms assertion ran outside the listing inventory lock. This completion adds the matching committed reservation and uses `withListingInventory` for that assertion. The inventory readiness/locking protections are preserved; no production guard was weakened.

Browser acceptance uses a production Webpack build. The gate opens public documents in a fresh page after editor mutation to avoid pending editor refreshes and waits for the rendered contact link rather than treating unrelated background network activity as readiness. Early development-mode attempts timed out during refresh/navigation; they are not claimed as passing evidence. The successful recorded run covers the production frontend behavior. No hosted provider, deployment, human screen-reader or legal approval is claimed.

## Reproduce the gates

Use a disposable localhost PostgreSQL server only. Do not replace these URLs with the configured application database. Set the username/port to the local test server.

```sh
# rentra-backend
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres CP01_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres npm test
npm run lint
npm run format:check
npm run db:check

# Keep this fixture running in its own terminal.
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres CP06_GATE_FIXTURE=/tmp/cp25-fixture.json FIXTURE_STAGE=published node --import ./loader/register.mjs --env-file=.env test/helpers/serve-property-review.mjs
```

```sh
# Rentra: build and serve the production fixture, with API :4106 running.
RENTRA_BROWSER_FIXTURE=1 RENTRA_BROWSER_FIXTURE_ID=cp25 NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1 npm run build -- --webpack
RENTRA_BROWSER_FIXTURE=1 RENTRA_BROWSER_FIXTURE_ID=cp25 NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1 npx next start -p 3106

# In another terminal:
GATE_TOKENS=/tmp/cp25-fixture.json node scripts/portal-gate/cp25_gate.mjs
```

Use a fresh fixture for each publication run. Send `stop` to the API fixture stdin to drop its database, keep frontend :3106 running, then run `GATE_TOKENS=/tmp/cp25-fixture.json node scripts/portal-gate/cp25_outage_gate.mjs`. Stop the frontend and remove temporary fixture credentials afterward. Override `CHROME` and `PLAYWRIGHT_MODULE` if required. The recorded completion run used localhost PostgreSQL :55433, disposable Express :4106, Next production :3106 and Chrome.

## Operator handoff

1. Open Public content and select the content kind. Edit only the supported structured fields, add a concrete reason and save. A draft does not change public copy.
2. Review the exact saved copy for policy accuracy and authorized contact channels, record review, then request a publication preview. Changed content invalidates the previous review. A conflicting revision requires reload; failed input remains visible.
3. Confirm the preview to publish immediately. Verify the customer page and its permanent version URL. Contact publication immediately expires the optional cached widget; primary content reads stay fresh.
4. To roll back, restore a historical version as a draft, review it and publish a new version. Historical publications and already accepted booking snapshots remain unchanged.
5. On an API outage, use the retry control after service recovery. Do not substitute an obsolete policy or claim that a failed command published successfully.

## Explicit boundaries

No future-dated scheduling, automatic legal review, bulk messages, email/WhatsApp verification adapter, media library, arbitrary page builder, search-intent editor or operational pricing/refund-rule editor is included. Contact hours are bounded editorial text in the stated timezone. New copy cannot enable a payment method or change cancellation calculations. No legal or financial promises were invented.

CP25 acceptance is complete. Continue with **CP30**, including cross-role regression and explicitly separated hosted Test/provider evidence. Configured-database migration and deployment remain separate actions.
