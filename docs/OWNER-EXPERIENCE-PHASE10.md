# Owner experience Phase 10 — State feedback

Implemented locally on 2 October 2026; not deployed. This phase changes the frontend only. No dependencies or migrations were added.

## Delivered

- Reused `EmptyState`, the native `ConfirmDialog`, `PortalState` and the existing owner `react-hot-toast` toaster. Added `InlineAlert` and a small `ConfirmedForm` submission gate; keyboard and button submissions share the same confirmation path.
- Unified empty properties, bookings, calendar, earnings, statements, payouts, reviews, inbox, support, disputes, caretaker, privacy, activity and guide panels. Filtered views offer a clear-filter action; empty statements offer the previous month. Calendar auto-open links lead to the actual booking-rules form.
- Replaced both pulse-only loading boundaries with labelled layout skeletons. Query screens accept a specific loading label; pending submissions show visible text with their spinner.
- Background identity checks retain verified content on focus, visibility and network recovery. A temporary verification failure shows an inline retry. Explicit identity changes and logout still dispose the store and hide protected content. Expiry redirects carry the current return path.
- Owner action errors retain status, stable codes, API state and validation fields. `error-copy.js` supplies owner recovery copy. A 401 form error links back to sign-in. Domain conflicts continue to use their existing reload/preview controls.
- Added document-removal, caretaker-revocation, application-withdrawal and actionable mark-all-read confirmations. Existing photo, draft, pause, trust-edit and calendar confirmation/Undo flows remain in use. Public review-reply deletion also uses the shared dialog.
- Added pause/resume, read-update, document/photo deletion and clipboard feedback. Existing invite feedback remains. Photo reorder now offers a version-checked Undo; existing calendar Undo remains. Long-form saves show their save time. Draft deletion redirects to a visible success banner.

## Verified

- Frontend tests: **75 passed**, no failures or skips.
- Whole frontend lint and production build passed. Build uses `RENTRA_BUILD_FIXTURE=1` to keep the user's development cache separate.
- [Browser results](evidence/owner-phase10/results.json): **31 checks**, zero uncaught page errors. Twelve empty-account views have screenshots and zero WCAG axe violations. The gate checks retained content during delayed/failed identity reads, session expiry with `next`, pause confirmation and polite toast feedback, native dialog keyboard behaviour, and keyboard cancel/confirm of a real mark-all-read Server Action.
- The fault proxy checks nine principal list-page APIs and all five independent Today reads. Each Today fault affects only its own section.
- Disposable local PostgreSQL fixtures only; no production accounts, provider calls or money were used.

## Boundaries and follow-up

- Network/5xx mutation copy deliberately says to refresh and check whether a change was saved. A response can be lost after a commit, so promising “Nothing was changed” would be false. Read-only page failures can safely retain that statement.
- The existing toast package is reused instead of installing Sonner. It already supplies the required polite `role="status"` announcement.
- The rollout flag `PARTNER_RTK_ENABLED=true` enables the query-cache/session-check path; browser checks exercise it. Existing server-rendered screens remain available when the flag is off.
- The shell-wide unsaved-change guard is explicitly scheduled under **Phase 12 / DS-07**. This phase does not claim that future dependency is complete.
- Mark-read has no restore-unread API, so this phase supplies confirmation for actionable bulk reads and success feedback, rather than an Undo that cannot restore state. Adding an authorized inverse is follow-up work.
- Provider-backed photo/document deletion, every application/caretaker mutation and every property-detail error permutation still need their individual end-to-end checks. The shared confirmation path is exercised through mark-all-read; source inspection is not presented as full mutation QA.

## Repeat the browser gate

1. Start the backend's `test/helpers/serve-property-review.mjs` with `PORTAL_TEST_DATABASE_URL` pointing to localhost, `FIXTURE_STAGE=published`, `GATE_API_PORT=4206`, `GATE_WEB_ORIGIN=http://localhost:3107`, and `CP06_GATE_FIXTURE` pointing to a temporary JSON file. It creates a disposable database and prints no fixture tokens.
2. Run `node scripts/portal-gate/fault-proxy.mjs` from the frontend; it forwards port 4106 to 4206.
3. Start Next on 3107 with `RENTRA_BROWSER_FIXTURE=1`, a unique `RENTRA_BROWSER_FIXTURE_ID`, `PARTNER_RTK_ENABLED=true`, `NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1` and `NEXT_PUBLIC_SITE_URL=http://localhost:3107`.
4. Run `node scripts/portal-gate/owner-phase10.mjs` with the same `CP06_GATE_FIXTURE`. Optional `PLAYWRIGHT_MODULE` and `CHROME_PATH` override the local installed tools. The gate refuses non-local/non-disposable database URLs before fixture mutations.
5. Stop Next and the proxy, then send `stop` to the fixture API's stdin to drop its database. Keep temporary tokens outside version control.
