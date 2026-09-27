# CP21 — Versioned payout destinations

Status: **COMPLETE — 27 September 2026.** The database, browser/API and failure-path gates passed (evidence below). Baseline: frontend `a38d51c`, backend `770ec56`; CP21 changes are uncommitted.

**Migration `0033_payout_destinations` is not applied to the configured database.** The owner payout page and admin client detail now read the new table, so apply it before deploying this backend. It backfills existing payout details as version 1 (submitted, unverified). It has been applied only to disposable local databases.

Linked IDs: CP21; CA02, CA12, CA19; G20, and the payout part of G29.

## Delivered

- **Destination versions** (`payout_destination`), append-only per client. Each version records:
  - method (UPI or bank) and holder name
  - **bank: the last four digits and IFSC only**, or UPI: the UPI ID
  - an informational name comparison (same / different / unknown)
  - source (onboarding / settings / migration)
  - state: **draft**, **submitted**, **verified**, **failed** or **superseded**

  Submitting a new version supersedes the previous current version and any draft. Nothing is overwritten, and history stays visible.
- **No full account number is stored.** The number is validated, reduced to its last four digits and discarded. It never appears in any row, audit entry, request hash or response (proven in the integration test and the browser gate). A future provider integration should collect the full number straight into the provider's vault during verification. That is safer than adding an encryption key and new secret now.
- **Provider verification boundary.** `verified` is reachable only with a provider name, provider reference, evidence hash and verification time; a database check enforces it. No provider adapter exists, so no code path marks anything verified:
  - The UI says "Bank verification is not available yet, so payouts stay disabled".
  - The admin view has no verify control.
  - A name or last-four comparison is labelled a comparison, never verification.
- **Recent sign-in for changes** (`RECENT_AUTH_MINUTES = 15`, taken from `portal_session.created_at`):
  - An **approved** owner whose sign-in is older than 15 minutes has their change saved as a **draft**. They are offered "Sign in again to confirm", which ends the session and returns to login with a notice. After a fresh sign-in the draft is submitted.
  - Pending applicants (onboarding, reviewed at Gate 1) are not held to the window.
  - Admin "mark failed" also needs a sign-in within 15 minutes.
- **Stale and repeated changes.** Every change carries the latest version the form saw; a stale form gets 409. The same request key returns the first result, and a different body with that key is refused. Changes are serialized per client.
- **Owner page `/partner/settings/payout`**, linked from Settings:
  - a readiness banner, the current destination (masked), a draft card, and version history with failure reasons
  - a preview of each change: new version, what it replaces, and how many scheduled payouts stay pinned to the old version
  - a preview kept through a failed submit, so the owner can retry with the same request key

  Settings no longer claims "re-runs the name check" or that "bookings pay to the destination saved".
- **Admin client detail → Payout destinations tab.** It lists every version with its name comparison, source, open payouts pinned and decision. **Mark version failed** requires a reason (shown to the owner), shows an impact preview, needs a recent sign-in (with a sign-in-again path), is audited and replay-safe. The owner gets a required-action inbox update, "Payout destination failed review — submit a new one", that opens the payout page. Owners never see which admin decided.
- **Pinned obligations.** `payout.destination_id` pins an obligation to a version. Database guards:
  - a pinned destination can never be redirected
  - the destination must belong to the payout's client
  - a funded payout needs a verified destination
  - a payout can move to `processing` or `paid` only while its pinned version is **verified**

  A failure therefore stops disbursement, and the recovery is a new version.
- **Onboarding and legacy mirrors.** The onboarding payout step also records a version (source onboarding). The legacy application/user payout columns are kept in step for Gate 1 review and profile completion. Onboarding and application-review copy now describe a name comparison, not verification.
- **Capability.** `client.settings.read` was added to the base client capabilities so owners can read their own payout page; writes still need `client.settings.write`.

## Schema (migration 0033)

- **`payout_destination`** checks:
  - method-specific fields: bank needs 4 digits and a valid IFSC; UPI needs a valid UPI ID
  - holder name length
  - state consistency: draft means not submitted; failed needs a reason and decision time; verified needs the provider evidence
- **Indexes:** unique `(client_id, version)`; one draft per client; one current (submitted or verified) per client; request-key idempotency.
- **Triggers:**
  - append-only except the state and decision fields
  - allowed transitions only: draft→submitted or superseded; submitted→verified, failed or superseded; verified→failed or superseded
  - inserts need a client, the next version number, and a draft or submitted state (except backfill)
  - a failure decided by an admin needs an active admin
- **`payout.destination_id`** plus the disbursement guard trigger described above.
- **Backfill:** existing application/user payout details become version 1. It skips clients that already have a version and rows that fail the checks; those stay in the legacy columns for the owner to resubmit. The integration test proves it is idempotent.
- 34 migrations; journal, snapshot and schema agree.

## API contract

| Method and path | Input | Result |
| --- | --- | --- |
| `GET /partner/settings/payout` | — | `{ current, draft, latestVersion, history[], readiness, verificationAvailable: false, recentAuth: { fresh, authenticatedAt, freshUntil, required, minutes } }` (masked only) |
| `POST /partner/settings/payout` | `method, upiId \| accountNumber+ifsc, holderName, expectedLatest, mode=preview\|submit, requestKey` | Preview, or `{ state: submitted \| draft, version, reauthRequired, message }`. 422 field errors; 409 `DESTINATION_CHANGED` or `IDEMPOTENCY_CONFLICT`. |
| `POST /partner/settings/payout/draft` | `draftId, expectedLatest` | Submitted; 403 `REAUTH_REQUIRED` when the sign-in is stale; a repeat is harmless |
| `POST /admin/clients/:id/payout-destinations/fail` | `destinationId, expectedState, reason, mode=preview\|apply, requestKey` | Impact preview, or failed; 403 `REAUTH_REQUIRED`; 409 `DESTINATION_CHANGED`; replay by key. Needs `admin.clients.write`. |

`GET /admin/clients/:id` adds `payoutDestinations`, which includes the decider's name and pinned counts for admins.

## Verification — 27 September 2026

All runtime checks used disposable databases on a local PostgreSQL 14 server. The configured database was not touched.

| Check | Result |
| --- | --- |
| Backend full suite (both disposable-DB variables) | **123/123 passed**, including the CP21 unit and integration tests and the CP03/CP05 integration regressions |
| Unit `test/services/payout-destinations.test.js` | 2/2: masking (UPI prefix, last four), name comparison as a hint, readiness never ready without verification |
| Integration `test/integration/payout-destinations.integration.test.js` | **Passed**. Evidence listed below. |
| Browser/API gate `scripts/portal-gate/cp21_gate.mjs` | **28/28 passed, `completed: true`** ([results](rentra-client-admin-part21-gate.json)) |
| Outage and failure-path gate `scripts/portal-gate/cp21_outage_gate.mjs` | **10/10 passed** ([results](rentra-client-admin-part21-outage-gate.json)) |
| Frontend tests / ESLint / Prettier / isolated `next build --webpack` | 23/23; passed; passed; passed |
| Backend ESLint / Prettier / `db:check` (34 files) / drizzle drift; `git diff --check` in both repositories | Passed |

**Integration test evidence:**

- **Validation and preview:** invalid IFSC field error; preview writes nothing.
- **Submission:** submit keeps only the last four digits. The full number is absent from rows, audits and legacy mirrors. Replay works and an idempotency conflict is refused, as is a stale form.
- **Pinning:** an obligation pinned to v1 survives later changes and cannot be redirected, and it cannot move to processing because v1 is not verified.
- **Stale sign-in:** creates a draft and leaves the current version unchanged. The draft submit is refused (`REAUTH_REQUIRED`) until a fresh session, then submits; a repeat is harmless.
- **Verification boundary:** verified cannot be set without evidence. With evidence a pinned payout may move; after the admin fails the version, it cannot.
- **Admin failure:** impact preview counts 2 pinned payouts; a stale admin sign-in is refused; apply, replay and stale expected state all behave; the owner update is a required account action; owners see the failure reason but not the decider.
- **Database:** direct `UPDATE` and `DELETE` and invalid transitions are refused.
- **Access, onboarding, backfill:** another owner sees their own empty history; the admin actor is refused on the owner API, and an inactive admin is refused. A pending onboarding client records a version without the window. The backfill turns a legacy UPI row into v1, skips an invalid legacy bank row, and is idempotent.

**Browser gate (28):**

- Anonymous, admin-cookie, other-owner and records-only-admin denials.
- Settings links to the new page without misleading claims, and readiness says payouts are disabled because verification is unavailable.
- Invalid IFSC keeps the typed values. The preview shows the masked bank destination and "stay pinned to version 1". Version 2 is submitted and version 1 kept as history. The full number is never returned, and a stale form is refused.
- The owner page at 390px has no overflow and is axe clean; the method radio takes keyboard focus.
- A **stale sign-in** saves a draft and offers sign-in, not submit, and the current version is unchanged. "Sign in again" ends the session and shows the login notice. A fresh session submits draft version 3.
- The **admin view** lists every version with the pinned payout on version 1 and has no verify control. A **stale admin sign-in cannot confirm** a failure, while a fresh admin previews (390px, axe clean) and marks version 3 failed.
- The owner sees the failure and reason, but not the decider. The inbox update opens the payout page, which explains the recovery. Revocation blocks the next read.

**Failure paths (10):**

- A payout-API outage on the owner page and admin tab shows the retryable state, keeps context, and **Try again** recovers.
- A submit during an outage keeps the typed values and the preview and records nothing.
- A **lost response after commit** records exactly one version. The retry with the same form replays, so there is still exactly one new version.
- With the whole API down, both pages are retryable with no false empty state or login redirect.

### Found and fixed by execution

- Owners could not read their own payout page because `GET /partner/settings/...` needs `client.settings.read`, which did not exist. It is now a base client capability.
- "Sign in again" first landed on `/`, because the API's own post-logout redirect was followed. The action now calls logout directly and then shows the re-auth notice.
- The backfill re-ran onto clients that already had versions, so it now skips them.
- A submit form lost its preview after a failure, which would force a second preview before retrying. The preview is now kept.

## Remaining limits and next step

- **Apply migration 0033** before deploying the backend, then deploy frontend and backend together.
- **No provider verification adapter.** Verified is unreachable and payouts stay disabled; activation is CP32. When an adapter is added, it must collect the full account number directly into the provider's vault and write the evidence fields.
- There is no payout creation or execution yet (CP22 read models, CP32 live). The pinning and disbursement guards are enforced by the database and proven in tests.
- Onboarding (pending applicants) is not held to the recent sign-in window; approved owners are.
- The configured database's migration hash drift (`0009`, `0024`, `0026`, `0029`) is still unreviewed; reviewing it needs permission.
- The CP03 and CP05 browser gates are Python Playwright runners, which cannot run in this environment; their integration tests passed.

**Re-run the gates:**

1. Disposable PostgreSQL on `:55432`; backend `npm test` with both variables.
2. `serve-property-review.mjs` (published), then `seed-payout-destinations-gate.mjs`.
3. Isolated Next on `:3106` with `--webpack`.
4. `GATE_TOKENS=<json> node scripts/portal-gate/cp21_gate.mjs`.
5. Outage: start the fixture with the `port-remap.mjs` preload plus `fault-proxy.mjs`, run `cp21_outage_gate.mjs partial`, stop both, then run `cp21_outage_gate.mjs full`.

Next part: **CP22 — Statements and payout read models** (depends on CP19–CP21; "approved display definitions" still needs the business's display rules).
