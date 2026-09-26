# CP12 — Booking work queues and operational detail

Status: **COMPLETE — 26 September 2026.** Database, browser/API and outage gates passed (evidence below). Baseline frontend `a1348db`, backend `9601911`; changes remain uncommitted. No migration or configured-database change.

## Implemented scope

CP12; CA01, CA07, CA21–23; G12's booking work queues and operational detail. Existing records, booking detail and visit evidence commands are reused.

- Owner/admin booking queues add **Today** and **Action needed**, retaining upcoming, past, cancelled, search and pagination. URLs retain filters into detail and back to the list. The optional property id filter is ownership-scoped.
- Today includes active visits overlapping the India-local day, including overnight stays. Action needed includes due handovers, overdue returns, recorded returns awaiting completion, disputes and confirmed/on-site visits whose hours need reconciliation.
- Operational queues sort by the earliest active visit. Customer history keeps its previous filter set and ordering.
- Shared owner detail displays each visit's operational cue and shows only the applicable evidence action. Future confirmed visits do not offer handover before the scheduled start. No owner accept/reject decision was added.
- Payment status is explicitly booking-wide; mixed visit states remain visible independently. The admin list no longer collapses any captured attempt into an unqualified “Paid” badge; it shows each recorded payment environment/state.
- Owner detail links to the property overview/calendar. Admin detail links to property, client and customer records, whose existing APIs enforce their own capability checks.
- Arrival details cover only active fulfillment visits for operational actors. Booking-contact phone/name are withheld when all visits are cancelled/completed/expired/requested. Customer historical access retains its existing behavior. Operational downloads reuse this same scoped record service.
- Owner list/detail and admin list now use shared missing/forbidden/outage handling. Empty operational queues no longer advertise booking a farmhouse as if the owner were a customer.

## API and state rules

Existing `GET /api/v1/{partner,admin}/records` accepts `tab=all|today|upcoming|action_needed|past|cancelled`, optional `property` UUID, `q`, and `page`. Customer routes retain their original query schema. Capability/session and ownership checks remain server-side.

Operational record detail adds:

- `relationships.propertyId`; admins additionally receive `customerId` and `clientId` for linked detail pages.
- Per-visit `operation: { label, action }`; action is handover, return, complete or null. The command service still rechecks version, role, ownership, required prior evidence and actual observation time.
- `contact.withheld=true` and null phone/name when no active visit needs fulfillment; `arrival` is null in that state. Cancelled visits never gain arrival access because another visit remains confirmed.

An order can appear in more than one queue: for example, a confirmed order with a cancelled visit and a currently due visit belongs in both Cancelled and Action needed. Queue counts describe matching orders, not mutually exclusive totals. “Past” means a scheduled end has passed, not proof that the visit was completed.

Verified payment capture still confirms automatically through the existing checkout engine. The engine, webhook verification and customer cancellation commands were not changed.

## Verification actually run — 26 September 2026

Runtime checks used disposable databases on a local PostgreSQL 14 server (`127.0.0.1:55432`); the configured database was not touched. Shared runs with CP11: backend **96/96**, frontend 19/19, ESLint/Prettier, isolated production build and `git diff --check` all passed ([CP11 evidence table](rentra-client-admin-part11.md#verification-actually-run--26-september-2026)).

**Integration test** `rentra-backend/test/integration/pricing-operations.integration.test.js` — passed:

- Owner and admin Today and Action needed each list the order once. Its visits stay confirmed plus cancelled. Arrival covers only the active visit, and the contact phone is visible while fulfilment is due. The due visit offers handover.
- Admins receive `relationships.customerId`; owners do not. Another owner sees 0 rows and `BOOKING_NOT_FOUND`. An unknown property filter returns 0.
- Handover, return and completion evidence each replay with the same request key to a single effect: 3 evidence rows total. After completion, arrival is null and the contact is `withheld`.
- **Payment/confirmation regression through the real services:** Test gateway enabled via `setPaymentGatewayConfiguration` → quote → `createCheckoutHold` → `startCheckoutPayment` against a stubbed Razorpay transport → `verifyCheckoutPayment` with a correctly signed capture confirms the order automatically, with no owner step. A wrong signature (`INVALID_SIGNATURE`) and a wrong amount (`PROVIDER_PAYMENT_MISMATCH`) are refused. Repeat verification keeps exactly one capture transaction.
- **Customer cancellation regression:** the confirmed visit keeps its accepted flexible snapshot. The preview refunds the full rent 10 days out, plus the fee only if the stored snapshot's fee rule includes it. Commit replays idempotently, and the visit is cancelled and its reservation released.

**Browser/API gate** `Rentra/scripts/portal-gate/cp1112_gate.mjs` — **44/44** ([results](rentra-client-admin-part11-12-gate.json)). CP12 checks:

- Access: anonymous 401, owner cookie cannot read the admin queue, foreign record 404, unknown tab 400, read-only admin cannot operate a visit (403), revocation blocks the next request.
- Owner queue and detail: Action needed shows mixed visit states; detail says "Mixed visit statuses"; **Back to bookings** keeps `tab=action_needed`; property overview link present; exactly one handover action (on the due visit); cancelled visit has no arrival or action.
- Admin: Today → detail with Customer and Client detail links; mixed-state wording; relationship link takes keyboard focus.
- Mobile (390px): owner queue, owner detail and admin detail have no overflow and no serious/critical axe violations.
- Evidence: a real browser handover submission records the transition, and replaying the same form data yields one evidence row. The operational empty state is the owner-queue message, not a customer booking prompt.

**Outage gate — 22/22** ([results](rentra-client-admin-part11-12-outage-gate.json)):

- Records-service outage: a fault proxy returns 503 only for `/api/v1/{partner,admin}/records` while sessions still work. Owner queue, owner detail, admin queue and admin detail each show "This page could not load" with **Try again**, keep their URL filters/return path, are axe clean and keyboard focusable. **Try again** recovers in place once the service returns (16 checks).
- Whole-API outage: all four booking routes show a retryable boundary with no login redirect and no false "not found"/empty queue, and filters stay in the URL (4 checks). The CP11 editor and setup step are covered in the same file (2 checks).

### Found and fixed by execution

- **Pre-existing checkout defect (outside CP12 code, needed by its regression):** `src/services/booking/checkout.js` wrote order/visit/payment snapshots and lifecycle payloads with `${JSON.stringify(value)}::jsonb`. postgres.js stores that as a JSON *string*. On real PostgreSQL the checkout-execution scope trigger then refused the hold (`Checkout execution scope mismatch`), so no Test checkout could start. Those four writes now use `::text::jsonb`, matching `quotes.js`. The payment regression above runs on a client configured like production (`prepare: false`).

## Remaining limits and follow-ups

- **Webhook confirmation is a silent no-op (pre-existing, not changed here):** `src/services/payments/webhooks.js` stores `redacted_payload` with the same double-encoding. `processNextPaymentEvent` then reads `data.type` from a string, matches nothing and marks the event processed. The signed browser verification and the reconcile worker still confirm payments. Fix with `::text::jsonb` plus a webhook integration test before relying on webhooks. The same pattern remains in `gateway-settings.js` (audit), `inventory.js`, `support/service.js`, `customer/account.js`, `customer/saved.js` and `reviews/service.js`.
- Whole-API outage on admin pages falls through the admin layout's session call to Next's generic "This page couldn't load · Reload" screen. It is retryable and not misleading, but not the shared `PortalState` design. That is an admin-shell concern outside CP12.
- No hosted deployment or human screen-reader pass. Queue counts are matching orders, not mutually exclusive totals.

Next part: **CP13 — Visit evidence and incident records** (depends on CP12).
