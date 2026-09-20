# Part 14 — Per-visit cancellation and Test refunds

Status: COMPLETE — 20 September 2026. Verified using disposable databases and provider/hosted browser fixtures; a genuine Razorpay sandbox refund remains a credential-dependent integration check.

## Delivered behavior

Customers open **Cancel visits or change plans** from an owned booking record. They select one or more visits, obtain a server preview, review the Test refund and explicitly confirm. An optional reason is stored on the cancelled visits. Selected visits must still be confirmed and unstarted when committed. Missing or unsupported historical policies/payments require operational review; there is no guessed refund policy.

Cancellation uses the accepted `customer-v1` policy and exact arrival instant, with elapsed 24-hour cutoff days. Integer paise arithmetic rounds fractional refund paise down. Flexible/moderate/strict rent entitlement follows the existing policy bands; the fee is refundable only with a full flexible rent refund. The per-component entitlement is capped at verified captured Test allocations, less existing reserved/completed obligations. An advance collection cannot refund uncollected rent, fees or deposits. This is the Test policy; live commercial terms remain Parts 20–22.

Preview hashes cover the selected visit versions, current entitlement and refund allocations. A changed estimate requires another preview and acceptance. Commit uses the shared listing mutex and active customer/session authorization. A durable immutable cancellation receipt and stable request key make retries replay the same result. Inventory releases once for the selected visits; unaffected children retain their original states and reservations. The parent becomes cancelled only when all children are cancelled. Existing record readers remove private arrival access when no qualifying visit remains.

Started visits direct customers to the host contact on their booking record. Changes are explicitly cancel-and-rebook at current availability and prices; no replacement is reserved or promised. Structured operational support requests remain Part 17.

## Refund execution and recovery

Migration `0016_customer_cancellation.sql` adds immutable cancellation receipts and durable refund dispatch scheduling. It does not change historical payment/refund amounts. Existing database cap and reconciliation triggers remain authoritative.

The worker processes cancellation refunds and existing Part 11 late-capture obligations. Each refund uses the original Test provider, captured payment and pinned credential key. Admin disablement does not stop an existing obligation. No provider call occurs inside a database transaction.

Before dispatch, the service durably claims one POST for the refund UUID receipt. It fetches provider status before recording success. A lost response or crash enters receipt lookup; subsequent runs never repeat the create request. Paginated lookup is bounded and rejects ambiguity. Provider ID, original payment, receipt, amount, currency and Test credentials must match. Processed evidence updates the refund and allocation totals atomically; replay cannot duplicate completion.

Pending or failed provider status retains the financial reservation. A provider failure is shown as an unresolved obligation with reconciliation attention, not as a bank refund or permission to send another refund. Retry fetches the same refund, allowing provider-side recovery. A crash before the sole POST or an unresolved provider failure needs operator investigation in the original Razorpay Test account; do not clear the dispatch marker or manufacture another obligation. Missing pinned credentials remain retryable after restoring them.

Subscribe Test webhooks to `refund.created`, `refund.processed` and `refund.failed` in addition to Part 11 payment events. Raw signed events are verified and redacted before durable ingestion. Processing re-fetches original provider state; browser/webhook amounts are not accepted as evidence. Duplicate payment callbacks/events after refunds reuse the already verified capture rather than attempting to confirm again.

Booking records, operator records and downloadable summaries distinguish nonzero provider Test refund amounts from **actual bank refund ₹0**. Completion hooks are append-only. Test refunds remain excluded from live revenue/payout reports.

## Verification and rollout

Run `npm run verify:customer-cancellation` with `CUSTOMER_BROWSER_DRIVER` pointing to Playwright core. It creates/removes a disposable database and uses deterministic provider HTTP responses. The 390px browser gate covers visit selection, preview, acceptance, duplicate submission, receipt, reload, mixed status and anonymous rejection.

Migration status: `0016_customer_cancellation.sql` applied successfully to the configured database on 20 September 2026. The read-only preflight confirmed it was the only pending migration; application followed the successful disposable gates. No seed/backfill, gateway enablement, provider transaction, bank money or deployment is part of this change. A genuine Razorpay sandbox refund still needs Test credentials and the separate provider integration smoke test.

Verified gate — 20 September 2026:

- All **8 cancellation/refund groups passed**, including precise cutoff/paise rules, one-of-three and concurrent replay, ownership, immutable receipts, inventory release, lost provider response, no provider network under locks, disabled-gateway continuation, failed/pending recovery, amount mismatch rejection, complete cancellation and private arrival removal, duplicate redacted refund webhooks, advance caps and reacceptance.
- The 390px Chromium group passed selection, preview/acceptance, duplicate click, receipt, record reload, unaffected visits and anonymous rejection. Its additional refund recovery check loaded the final refund module, verified lookup-only completion without any create POST, and replayed it safely. The screenshot was inspected and horizontal-overflow assertion passed.
- All **12 payment-ledger regression groups passed**, including concurrent caps and stale Repeatable Read rejection. All **5 booking-record database groups passed**, preserving customer/owner/admin scope, immutable details and arrival privacy. All three disposable databases were removed.
- All **28 foundation groups passed**. Full lint passed without warnings, schema generation reported no drift, and the final isolated Webpack production build generated **46 pages**. Diff and completion-document consistency checks passed.
- Migration 0016 was applied. No configured seed/backfill, provider payment/refund, gateway enablement, bank-money movement, external message or deployment was run. Test credentials remain absent locally.

The provider responses are deterministic fixtures, not evidence of a completed Razorpay sandbox integration or full accessibility audit. Worker scheduling/monitoring and actual provider sandbox acceptance remain release checks. A refund stuck before its sole dispatch or in provider failure requires operator investigation; there is deliberately no automatic duplicate POST.

## Next part

Part 15 adds durable notifications and actual visit lifecycle operations. Consume the append-only per-cancellation and per-refund hooks, preserve Test labels, and do not infer completion from elapsed visit dates. Parts 16–17 add reviews and structured support.

Provider reference: [Razorpay refund API examples and fetch contracts](https://github.com/razorpay/razorpay-python/blob/master/documents/refund.md).
