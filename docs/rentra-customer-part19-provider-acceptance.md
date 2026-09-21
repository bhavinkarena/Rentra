# Part 19 — Hosted Razorpay Test acceptance record

Status: **NOT EXECUTED**. This is the remaining release gate, not evidence that it passed. Part 19 was closed on 21 September 2026 for implementation and automated acceptance; this gate was carried into Parts 20–22 and must pass before any live enablement.

As of 21 September 2026 the Test key pair is configured and the read-only Test API probe passes, but no Test webhook signing secret is configured and the site is localhost, so no deployment can receive signed provider events. Configure secrets privately in the deployment environment. Never paste secrets, OTPs, customer contact details or payment tokens into this record.

## Environment to record

- Reachable Test deployment URL:
- Deployment revision and UTC test time:
- Dedicated Test webhook configured at `/api/webhooks/razorpay`:
- Worker running and operations heartbeat current:
- Test credentials and webhook signing secret configured (booleans only):
- Operator and sanitized evidence references:

## Required observed results

| Scenario | Expected result | Observed result / sanitized evidence |
| --- | --- | --- |
| Disabled checkout | Browsing/quotes work; new payment attempts are blocked | Pending |
| Full collection | Hosted Test flow captures the accepted full amount; server verification confirms the booking | Pending |
| Advance collection | Captured Test amount and allocations match the accepted advance; balance is shown separately | Pending |
| Refresh / lost response | Reopening the quote/order recovers the same owned booking and provider order | Pending |
| Failed / forged browser outcome | No booking confirmation without verified capture | Pending |
| Signed webhook / replay | Deployed endpoint accepts valid Test events; duplicate delivery has one financial effect | Pending |
| Partial cancellation | Only selected eligible visits cancel and release inventory | Pending |
| Provider refund | Original Test payment refund is provider-confirmed, reconciled once and stays within remaining captured allocations | Pending |
| Disable with work outstanding | New attempts stop; pinned existing attempts, callbacks, webhooks and refunds can finish | Pending |
| Accounting | Test captures/refunds reconcile; actual live revenue and payout remain zero | Pending |

Supported webhook events: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`.

Use Test instruments only. The read-only API probe and deterministic fixture HMACs do not satisfy these rows. Keep pinned credentials available for outstanding work. This gate runs inside Parts 20–22 and blocks live enablement until every row above is observed.

After the observations pass, update the runbook, session tracker and HTML plan together, including exactly one detailed Part 19 completion card and all progress/next-part labels.
