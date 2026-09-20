# Part 15 — Durable communication and actual visit lifecycle

Status: COMPLETE — 20 September 2026. Part 16 is next.

## Delivered behavior

- Booking lifecycle events create SMS outbox entries inside the booking transaction. A rollback cannot leave a notification behind. Event/recipient/channel keys deduplicate confirmations, per-visit reminders, cancellations, refund updates, completion notices and eligible review invitations.
- Customers can read their latest 50 booking updates at `/account/notifications` and mark them read even when SMS is unavailable. Records and inbox entries retain Test/simulation labels.
- The worker handles notifications independently of payment reconciliation. Messages use verified customer phones and contain booking references, not private arrival details. Obsolete reminders are suppressed before dispatch; a cancelled reminder cannot remain in the customer inbox.
- Owners of the listing and active admins record chronological handover, return and completion evidence. Required attestation, observation notes, India-local occurrence time, optimistic version and idempotency key protect each transition. Immutable evidence and database transition guards prevent completion merely because a scheduled date has passed.
- Real visit provenance plus actual completion evidence establishes eligibility for Part 16. Test/seed visits remain simulations; a payment in Test mode does not itself establish or disprove actual visit evidence. Evidence notes are restricted to operators.
- Authenticated customer, owner and admin calendar downloads use stable visit UIDs, increasing lifecycle sequence, UTC instants that preserve overnight boundaries, escaped/folded UTF-8 content and cancelled status. Downloads exclude exact address/contact data and use private, no-store/noindex responses.
- Book again asks for new dates and obtains a fresh owned quote using current listing status, hours, capacity, prices and availability. It does not copy the old price or reserve inventory before checkout.

## Delivery operations

`CUSTOMER_NOTIFICATION_DELIVERY=disabled` is the safe default. Booking and in-app updates continue; outbox SMS entries report blocked configuration. To enable Twilio later, configure `CUSTOMER_NOTIFICATION_DELIVERY=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM_NUMBER`. Test/simulation or Test-payment SMS additionally requires explicit `CUSTOMER_NOTIFICATION_ALLOW_TEST_SMS=true`; leave it false normally. This is separate from development OTP login using 123456.

Run the existing `npm run worker` continuously, or `npm run worker -- --once` for a single operational tick. The admin page `/admin/notifications` shows delivery counts, paginated entries, attempts, safe error codes and provider IDs. Never equate provider acceptance with handset delivery.

- Definitely rejected or undispatched messages can be retried by staff. Automatic retries are bounded.
- A lost POST response or expired sending lease becomes **unknown** and is never automatically sent again. Staff must recover the original Twilio Message SID and use **Reconcile original delivery**. The server fetches and verifies the pinned account, recipient, sender and unique message body before accepting it.
- Provider-accepted messages are polled for delivery. Undelivered messages remain visible as such. Preserve access to the original Twilio account when rotating configuration.
- Notification failures cannot roll back confirmed bookings. Messages already dispatched cannot be recalled by later cancellation; pending obsolete reminders are suppressed.

## Database rollout

Migration `0017_customer_lifecycle_notifications.sql` adds `visit_evidence`, `notification_outbox`, constraints, immutable terms/evidence guards and transactional notification triggers. It backfills only one reminder per existing future confirmed visit with known hours; it does not replay historical confirmation messages or invent completion evidence.

Configured database migration status: **0017 applied** after confirming it was the only pending migration. Post-check verified no pending migrations, both new tables and all six triggers. No SMS was sent by migration; no configured seed or legacy booking backfill was run beyond the migration’s scoped reminder insertion.

## Verification gate

All 14 lifecycle scenarios passed across database/calendar and focused browser/access runs, including 390px Chromium. Also passed: 7 cancellation/refund database groups, 12 payment-ledger groups and 28 foundation groups. Lint, schema drift verification and the final 48-page Webpack build passed. Disposable databases were removed. Migration 0017 is applied; both tables and all six triggers were verified. SMS/provider responses used deterministic fixtures; no real SMS, provider payment, gateway enablement or deployment was run.

| Check | Verified result |
| --- | --- |
| `verify:customer-lifecycle` plus the focused `--browser-only` rerun with `CUSTOMER_BROWSER_DRIVER` | All 14 scenarios across runs: 12 database/calendar groups, then 2 browser/access groups; 390px Chromium, Los Angeles browser timezone, consecutive lifecycle forms without reload, reload persistence, inbox/read, private calendar access, Book again/current quote, staff monitor |
| `verify:customer-cancellation` | 7 database groups; browser explicitly skipped, not counted as a fresh Part 14 browser gate |
| `verify:customer-payments` | 12 ledger/refund/payout groups, including rejection of completion without evidence |
| `verify:customer-foundation` | 28 groups |
| `npm run lint` | Clean |
| `npm run db:generate` | No schema drift |
| `RENTRA_BUILD_FIXTURE=1 npm run build -- --webpack` | Passed, 48 generated pages |
| Documentation/diff consistency | Exactly one detailed HTML card for each completed part 01–15; Part 16 next; manual checklist unchanged |

Twilio transport was exercised with deterministic responses, not real credentials or handset delivery. Production activation and broader accessibility/performance acceptance remain later gates. The cancellation regression mode does not replace its opt-in browser gate.

Interrupted-implementation repairs:

- Retry and reconciliation previously inserted into nonexistent `audit_log.entity_type`, rolling back the staff action. They now use the actual `entity` column; the gate verifies both audit records persist.
- Reconciliation now rejects a concurrent state change instead of recording a false success, and retains an undelivered provider outcome's error code.
- Completed visits with retained active reservations now remain part of inventory reconciliation. Previously they appeared as orphaned reservations and could block every later quote for the property. Historical completed visits without active reservations remain excluded. Lifecycle fixtures now include nonoverlapping reservation rows and release cancelled inventory.
- The mobile gate progresses through all three evidence forms without reload, then reloads to verify persistence. Its Book again assertion now waits for streamed checkout content instead of treating the URL change as a completed render. A focused `--browser-only` mode provisions its own fresh fixtures for browser/access reruns.
- The payment regression fixture no longer bypasses evidence by toggling confirmed directly back to completed. It explicitly checks that this transition is rejected.
- Cancellation verification now distinguishes a database-only regression run from the full browser gate; select `CUSTOMER_BROWSER_DRIVER` for the latter.

## Next part

Part 16 implements review submission, publication/moderation, replies and evidence-backed public aggregates. Part 15 provides eligibility evidence and invitations; it does not publish reviews.
