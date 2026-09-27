# CP18 — Review detail and moderation history

Status: **COMPLETE — 27 September 2026.** All 34 browser/API checks and four outage checks passed. Backend 111/111 and frontend 23/23 tests passed; lint, formatting, migration checks and the frontend production build passed.

## Scope and revisions

- Linked scope: CP18; CA01, CA15, CA21, CA23; G15 (with CP02 navigation).
- Baselines: frontend `5af8163`, backend `b59dbbe`. CP18 changes are in the working trees of both repositories.
- Owner `/partner/reviews/[id]` and admin `/admin/reviews/[id]` show the original review, score, current reply, publication state, property totals, booking/evidence and property links. Admin also has the customer link. Queues lead to these detail pages.
- Owners see their own reports and reply history. Admin sees reports and moderation/response history. A reporting owner can still follow a closed report after the review is hidden. Other owners cannot retrieve that review; private moderation reasons and third-party reports are excluded from owner detail and queue responses.
- Empty queues, missing records, unauthorized access and retryable API failures have explicit states.

## Commands and API contract

`GET /api/v1/partner/reviews/:reviewId` and `GET /api/v1/admin/reviews/:reviewId` return scoped detail. Admin reads require `admin.reviews.read`; moderation and resolution require `admin.reviews.write`. Scope is checked on the backend as well as the page.

Owner reply and admin publication commands now require a preview followed by confirmation. The preview shows the exact public review, unchanged guest score, owner reply and publication effect. Moderation additionally shows the reason shared with the author. Editing a field discards the preview. Signed preview tokens bind the actor, record, version and command values; mutation uses the locked current version. Concurrent confirmations have one winner. Stale errors retain the typed input and offer a reload.

Publication requires the `meets_policy` basis. Hiding/rejection requires a policy category: private information, harassment, spam or unrelated content, plus a reason. A low rating or negative sentiment is not a removal category. Eligibility is checked before preview and apply. Guest text and ratings remain immutable, enforced by the existing database rules.

Reply changes append previous/new reply text and versions to the audit trail. Moderation preserves previous/new publication state, reason and version, plus the decision category. Resolving a report records the resolution separately and does not implicitly hide or rewrite its review; concurrent closure succeeds once.

Successful mutations invalidate the frontend layout; previews do not. Existing database triggers maintain eligible public review count/rating. Public search cards now read these derived values instead of returning hardcoded zero/null. Hidden reviews disappear from public review reads and derived totals, while restoration retains their original score.

## Verification evidence

- Backend: `CP01_TEST_DATABASE_URL=<disposable-local-postgres> PORTAL_TEST_DATABASE_URL=<disposable-local-postgres> npm test` — **111 passed, zero failures/skips**. The new `test/integration/review-moderation.integration.test.js` covers permissions, cross-owner isolation, score-neutral publication, preview tampering, stale and racing mutations, reply history, report isolation/closure, public totals, immutable ratings, restoration and eligibility loss.
- Frontend: `npm test` — **23 passed**; `npm run lint`, `npm run format:check`, and `npm run build -- --webpack` passed. Backend lint/format and `npm run db:check` passed (33 migration files).
- [Browser/API results](rentra-client-admin-part18-gate.json): **34/34**, using `scripts/portal-gate/cp18_gate.mjs`. Real local frontend/API with disposable PostgreSQL, owner/admin/customer/foreign-owner/read-only sessions. Covers public preview and confirmation, report resolution, racing moderation, preserved stale input and reload recovery, original score restoration, public listing/search totals, privacy and keyboard focus. Desktop/mobile automated axe and overflow checks passed on the tested detail pages.
- [Outage results](rentra-client-admin-part18-outage-gate.json): **4/4**, using `scripts/portal-gate/cp18_outage_gate.mjs` after stopping the fixture API. Both queue and detail routes for owner/admin show retry controls rather than misleading not-found results.
- Seed helper `test/helpers/seed-review-moderation-gate.mjs` is restricted to a disposable local test database. Its review fixture records completed visit evidence through the lifecycle service before submitting a one-star customer review. Fixture tokens remain outside the repository.

## Migration, configuration and deployment

No CP18 migration, environment variable or external provider is required. CP18 reuses existing review/report/audit tables and derived-score triggers. All 33 existing migrations were exercised in disposable databases. The configured application database was not changed by CP18: the previously verified state is 32/33 migrations applied, with CP17 migration `0032_support_cases` pending. Apply that migration before deploying the combined current backend, and deploy frontend/backend together for the new preview contract.

Verification is local fixture evidence, not hosted deployment, provider certification or a human screen-reader review. Temporary fixture API/database and frontend processes were stopped after verification; the pre-existing local PostgreSQL server was left running.

## Limits and continuation

Historical reply audit entries created before CP18 may lack old reply text; the UI identifies this instead of inventing a history. Existing review pagination remains 30 records per page; the open-report queue remains capped at 30. CP18 does not add automatic moderation, legal policy publication or automated removal based on sentiment.

CP18 is complete independently of CP17. The tracker is **17/32 complete**; CP17 stays **IN PROGRESS** until its separate remaining acceptance work is finished. Continue from the [CP17 handoff](rentra-client-admin-part17.md), then the next new planned slice is CP19.
