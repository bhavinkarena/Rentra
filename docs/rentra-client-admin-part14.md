# CP14 — Admin booking change and cancellation cases

Status: **COMPLETE — 27 September 2026.** The database, browser/API and failure-path gates passed (evidence below). Baseline: frontend `a1348db`, backend `9601911`, plus the uncommitted CP11–CP13 changes; CP14 changes are also uncommitted.

**Migration `0029_booking_cases` is not applied to the configured database.** Booking detail now reads case tables for every actor, so apply it before deploying this backend. It has been applied only to disposable local databases.

Linked IDs: CP14; CA07, CA08, CA11, CA23; G13 (and the owner-cancellation decision in plan §9).

## Delivered

- **Cases tied to exact visits.** Each case records type, requester (customer, owner or Rentra), source (portal, support, phone, email, internal), reason, requested outcome and, for change requests, the requested dates/slot/guests. Every case has a `CASE-XXXXXXXXXX` reference.
  - **Owners** open cases from their booking page under **Requests to Rentra**: owner cancellation, no-show, late arrival or operational issue. There is still no owner accept/reject step and no direct owner cancellation.
  - **Admins** open cases from a booking's new **Cases** tab, including customer cancellation and change requests received by support, phone or email.
- **Queue and assignment.** New admin pages: `/admin/booking-cases` (Open, Unassigned, Assigned to me, Resolved, All, type filter, search, pagination) and `/admin/booking-cases/[id]`. Both appear in admin navigation under Operations. Assignment is version-guarded to an active admin.
- **Case detail.** Shows the request, the exact visits with state, times, amounts, provenance and CP13 evidence, photo and open-incident counts, and links to booking and property. It also shows the accepted policy and outcome.
- **Communication.** Every update names who can read it: internal, owner and Rentra, customer and Rentra, or everyone. Owners' messages are always owner-and-Rentra only.
  - The first update's audience follows the requester, so a guest never learns of an owner's request unless Rentra shares it.
  - Customers see only updates shared with them, on their booking page under **Updates from Rentra**.
  - A cancellation also sends the existing customer cancellation notice through the unchanged lifecycle event.
- **Previewed resolution, once.** The preview shows the exact effects before anything changes:
  - which visits would be cancelled and which are unchanged (with reasons such as already cancelled, started or awaiting payment)
  - the inventory interval released
  - the refund per visit and component, capped by remaining verified capture
  - whether the booking stays confirmed, and the Test/actual-bank split
  - for change requests, a non-reserving availability and price check of the requested dates, stated as "Nothing is reserved"; the customer books through **Book again**

  The admin then confirms the cancellation, declines, or resolves without changes, with a resolution note and audience.
- **No mutation of accepted terms.** Cancellation reuses the customer cancellation engine. The shared helpers `capturedAllocations`, `allocateRefund` and `createRefundObligations` were extracted from `cancellation.js` without behavioral change. The command creates one refund obligation per captured transaction, releases the reservation, cancels the whole order only when no visit remains, records a `booking_cancellation`, and emits the existing `cancel_` lifecycle event. `booking.cancelled_by` stays NULL for an admin decision; the enum only allows customer or client, and adding `admin` would pollute user roles. The cancellation reason names the case.

### Recorded business decision: refund basis

The plan left owner-cancellation refunds as "case-based admin resolution and existing rules". CP14 records the following:

- **Full** refund of rent and fee (and any captured deposit component) is the default for `owner_cancellation`, because the guest is not at fault.
- **Accepted policy** (the visit's snapshot bands, exactly as a customer cancellation) is the default for every other type.
- The admin can choose either and sees the effect before confirming.
- Both are bounded by what was actually captured and not already refunded. They create Test refund obligations only; the actual bank refund is ₹0.
- A legacy visit without an accepted snapshot cannot use the policy basis. The preview blocks it and asks for the full basis.
- A visit with no verified capture cancels with a ₹0 refund, stated as "no verified payment to refund".
- Change the default in `defaultRefundBasis` (backend domain) if the business decides otherwise.

## Schema (migration 0029)

- **`booking_case`:** checks for type, requester, source, reason length and state/outcome consistency.
  - An owner-created case must be owner/portal and of an owner type.
  - A resolved case needs an outcome, note, resolver and resolve key/hash, and `visits_cancelled` needs a cancellation id and a refund basis.
  - Unique `(created_by_kind, created_by_id, request_key)`. Indexes on queue, order and assignee.
- **`booking_case_visit`:** primary key `(case_id, booking_id)`.
- **`booking_case_update`:** kind, audience, body and author checks. An owner update must use the owner audience. Idempotency index on the request key.
- **Triggers:**
  - A case changes only in assignment/resolution fields, each change bumps the version by 1, and resolution is final. Assignee and resolver must be active admins, and the cancellation must belong to the same order.
  - Creation requires the property's active owner or an active admin.
  - Case visits must belong to the case's order while the case is open.
  - Case visits and updates are append-only; updates need a valid author.
- 30 migrations; journal, snapshot and schema agree (`db:check` and `drizzle-kit generate` report no drift).

## API contract

Everything lives under `/records`, so capability checks stay `records.read`/`records.write`. Admin case `GET` routes are registered before `/records/:id`.

| Method and path | Body | Result |
| --- | --- | --- |
| `GET /admin/records/cases` | `state, type, assigned, q, page` | List, summary counts (open/unassigned/mine) and pages |
| `GET /admin/records/cases/:caseId` | — | Case detail with visits, updates (all audiences) and active admins; 404 when missing |
| `POST /admin/records/cases`, `POST /partner/records/cases` | `orderId, type, visitId[]` (repeated), `reason, requestedOutcome?, requestKey`; admin also `requesterKind, source, changeDate[], changeSlot, changeGuests` | `{ message, caseId, reference }`. 404 for a foreign booking; 422 for owner type, visits from another order, or field errors; replay returns the same case; 409 when the same key has a different body |
| `POST /admin/records/cases/assign` | `caseId, version, assigneeId` (`''` unassigns) | 409 `CASE_CHANGED` when stale |
| `POST /admin/records/cases/update`, `POST /partner/records/cases/update` | `caseId, body, requestKey`; admin also `audience` | Owner: own cases, open only |
| `POST /admin/records/cases/preview` | `caseId, basis` | `{ preview, hash, replacement }`; writes nothing and never reserves |
| `POST /admin/records/cases/resolve` | `caseId, version, outcome, basis?, hash?, note, audience, requestKey` | 409 `PREVIEW_CHANGED` when effects changed since the preview; 409 `CASE_CHANGED` when stale or already resolved; 422 when blocked or nothing to cancel. The same key after success replays the first result. |

Booking record detail adds `cases`:

- **Admins:** reference, type, state, outcome, visits, assignee and all updates.
- **Owners:** cases they opened, plus any with owner-visible updates; only owner/everyone updates.
- **Customers:** only `{ reference, state, updates }`, and only customer/everyone updates.

## Verification — 27 September 2026

All runtime checks used disposable databases on a local PostgreSQL 14 server (`127.0.0.1:55432`). The paid fixtures were created through the real checkout services with a stubbed Razorpay transport. The configured database was not touched.

| Check | Result |
| --- | --- |
| Backend full suite (both disposable-DB variables) | **105/105 passed**, including CP14 unit and integration tests and the CP11/12 customer-cancellation regression after the helper extraction |
| Unit `test/services/booking-cases.test.js` | 3/3: audience isolation, created-update audience, reference format, cancellable-visit rules, policy vs full entitlement, legacy policy refusal |
| Integration `test/integration/booking-cases.integration.test.js` | **Passed**. Evidence listed below. |
| Browser/API gate `scripts/portal-gate/cp14_gate.mjs` | **34/34 passed** ([results](rentra-client-admin-part14-gate.json)) |
| Failure-path gate (lost response, outage) | **6/6 passed** ([results](rentra-client-admin-part14-outage-gate.json)) |
| CP13 gate / CP11–CP12 gate re-run as regression | 31/31 / 44/44 |
| Frontend tests / ESLint / Prettier / isolated production build | 19/19; passed; passed; passed |
| Backend ESLint / Prettier / `db:check`; `git diff --check` in both repositories | Passed |

**Integration test evidence:**

- **Case creation:** a real paid two-visit order. The owner case is idempotent; a foreign owner gets 404; the owner type rule holds; visits from another order are refused.
- **Assignment and updates:** version-guarded assignment rejects a stale second admin. Update audiences apply, and a foreign owner cannot message.
- **Preview:** writes nothing. Full basis returns rent and fee for visit 1 only, and policy ≤ full. The order stays confirmed and the released interval is exact.
- **Resolution:** a stale hash is refused. The exact preview cancels visit 1 only, with `cancelled_by` NULL and one refund obligation whose total and allocations equal the preview. v1's reservation is released and v2's stays committed. Exactly one customer cancellation notice is queued. Replay returns the first result; a second key is refused.
- **Race with the customer:** a customer cancellation that lands first makes the case preview stale (`PREVIEW_CHANGED`). v2 has only the customer's refund, and the re-preview shows "Already cancelled" and `NOTHING_TO_CANCEL`. When two admins resolve at once, exactly one wins.
- **Unpaid legacy visit:** policy is blocked; full cancels with ₹0 and releases inventory.
- **Change request:** available, not reserved; no quote or reservation rows are created; then declined.
- **Read models:** owner sees owner/everyone updates only and not the customer-only case; customer sees exactly `{reference, state, updates}` with customer/everyone updates; admin list totals and detail cancellation totals are correct.
- **Database:** direct edits, reopening, update deletes and foreign case visits are refused.

**Browser gate (34):**

- Anonymous, foreign-owner and owner→admin-queue denials.
- The owner requests cancellation of one visit from the booking page, sees the acknowledgement, and messages Rentra. The booking is unchanged while the case is open.
- The read-only admin can read the queue but cannot preview or resolve.
- The queue link is keyboard focusable. The admin assigns the case, and full refund is the default for the owner cancellation.
- The preview names the exact visit, the release, the refund and "1 other visit(s) stay booked", and the API preview equals v1 rent plus fee. A stale confirmation is refused, and previews wrote nothing.
- Confirmation cancels v1 only, the booking stays confirmed, and exactly one refund obligation of the previewed amount is created. A repeat is refused with no second refund. The owner sees the resolution.
- The **customer booking page still renders** and shows the shared resolution under **Updates from Rentra**. It never shows owner-only messages, and the customer record carries no case internals.
- The admin opens a change request from the booking's Cases tab. The preview checks the new date and says nothing is reserved. The admin declines, visit 2 stays booked with no new refund, and the owner does not see the customer-only case.
- Case resolve form, owner requests panel and admin queue at 390px: no overflow, no serious or critical axe violations. Revocation blocks the next owner request.

**Failure paths (6):**

- A preview during an outage shows an error and no confirm button.
- A **lost response after commit** shows the honest retry message and keeps the note; the database shows the resolution committed once. Retrying from the same form replays, and there is still exactly one refund obligation.
- A refresh after resolution offers no second resolve, and visit 1 is released once while visit 2 stays booked.

### Found and fixed by execution

- The case queue server page imported the `CASE_TYPES` array from a client (`'use client'`) module. Next passes a client reference, not the array, so the page failed. Shared case labels now live in `lib/domain/booking-cases.js`.
- The CP14 gate seed signs a customer session and needed the fixture's full environment, not just the signing secret.

## Remaining limits and next step

- **Apply migration 0029** before deploying the backend, then deploy frontend and backend together.
- **Refund money:** refunds are Test obligations. Provider execution, retries and operator refund screens are CP20; live money is CP32.
- **No amendment:** a change request is cancel-and-rebook only; no atomic amendment product exists.
- **Channels:** no SMS/email template was added for case updates. Customers read shared updates in their booking, and a cancellation uses the existing notice.
- **Customer self-service:** customers cannot open cases themselves (support remains the channel, CP17). No case attachments; the case links to CP13 visit evidence.
- **Disputes:** no-show and late-arrival cases record an operational outcome only. Charges, liability and deposits belong to CP23.
- Case updates are not reopened once the case is resolved.
- Still open from CP12: webhook `redacted_payload` double-encoding.
- Hash drift for `0009`/`0024`/`0026` on the configured database is recorded in the [CP13 handoff](rentra-client-admin-part13.md).

**Re-run the gates:**

1. Disposable PostgreSQL on `:55432`; backend `npm test` with both database variables.
2. `serve-property-review.mjs` (published fixture), then `seed-pricing-operations-gate.mjs`, then `seed-booking-cases-gate.mjs`.
3. Isolated Next on `:3106`.
4. `GATE_TOKENS=<temp json> node scripts/portal-gate/cp14_gate.mjs`.
5. For failure paths, remap the fixture port and use a fault proxy that can either fail a request or forward it and lose the response.

Next part: **CP15 — Client task dashboard and persisted updates** (depends on CP05–CP14).
