# Rentra operator and owner runbook

Updated 28 September 2026, CP31. Use the current saved record and its environment as the source of truth. The in-product [operator guide](/admin/help) and [owner guide](/partner/help) show links allowed by the signed-in account's current capabilities. These paths belong to the deployed frontend, not this documentation server.

## Before a shift

Sign in to the correct portal. Admin, owner, customer and caretaker sessions are separate. Check your permissions, recent authentication and MFA enrollment before a sensitive command; a denied command is not a reason to share another operator's session. Open Operations to inspect persisted worker health, backlog and provider incidents. Missing or stale measurements are not healthy service.

Use filters to identify the intended owner, property, booking, environment and date interval. Lists are bounded; move through pages rather than assuming the first page contains every record. Keep the filtered return link when opening detail. Keyboard users can use **Skip to main content**, named form controls, Tab/Shift+Tab and the mobile navigation dialog. Escape closes navigation. Focus a named table region and use horizontal arrow keys to read its remaining columns on a narrow screen.

## Approvals and publication

| Stage | Operator procedure | Saved outcome and recovery |
| --- | --- | --- |
| Account application | Open Applications at `/admin`; inspect the submitted details and evidence. Use Need more info for correctable omissions, choose the affected fields and explain the correction. Rejection requires a reason; read the strike/block consequence before confirming. | Re-read the decision/version and history. Account activation completes Gate 1; it does not publish properties. If the version changed, reload and review the current submission. |
| Submitted property | Open `/admin/properties`; compare the submitted revision with the reviewed/public version and request precise corrections when needed. | The client edits and resubmits through the property workflow. Do not substitute direct database updates for a routine decision. |
| Verification | Schedule the supported visit/call, record actual findings and the required checklist, then publish the verified revision. | Confirm the published revision, verification evidence and public visibility. A passed checklist on an older revision does not publish a new edit. |
| Restriction or owner pause | Review impact and reason before changing an admin restriction. Owner pause/resume is a separate control. | An owner cannot undo an admin restriction. Existing accepted booking snapshots remain historical evidence. |

Owners complete their application first, then property details and evidence. On a returned submission, correct the specified fields and resubmit. Follow updates/tasks for verification and review decisions. Use the property overview to understand publication, availability and upcoming visits; do not infer booking readiness from a title/status badge alone.

## Booking incidents and resolutions

Open the exact booking from `/admin/bookings` or `/partner/bookings`. A booking can have several visits with different states. Select the relevant visits and inspect their local dates, accepted rules, inventory, payment environment and evidence.

Record actual handover, return and completion in order, with the recorded time and required attestation/evidence. A caretaker operates only assigned properties and only with the owner's evidence grant. Corrections supersede earlier evidence; they do not delete the evidence chain. Keep identity documents, access codes and payment credentials out of ordinary notes/photos.

For cancellation, amendment, no-show, damage or another incident, create/assign the supported booking case. Explain what happened and the exact visits affected. Review the current resolution preview: visit IDs, cancellation basis, component amounts, refund obligation and any replacement-inventory limitation. A replacement check does not reserve dates. Confirm only the current preview, then re-open the record to verify the committed resolution.

If a response was lost, inspect the existing command/case/evidence before repeating it. Reuse the command's request identity through the offered retry; do not invent a new cancellation to work around an unknown result. A stale version or preview requires a fresh review. Internal notes are not customer or owner replies; use the correct audience. Support acceptance alone does not cancel, amend or refund a booking.

## Payments, refunds and statements

1. Open `/admin/finance/payments` and check the provider, environment, currency, expected amount, verified capture and existing allocations. A checkout callback or operator note alone is not capture evidence.
2. For a supported operator refund, inspect the remaining captured allocation and preview the exact visit/components. An existing pending obligation reduces the remaining amount. Confirm the current preview once.
3. Open `/admin/finance/refunds`. Use Send to provider now only for an obligation that permits dispatch. Use Check with provider for an uncertain or already-dispatched obligation. The engine reconciles the same obligation; an unknown result must not become a second refund request.
4. Report **requested**, **pending**, **unknown**, **failed** and **succeeded** accurately. Only a verified provider outcome proves a successful refund. Preserve provider evidence and the audit/correlation reference for escalation.
5. Compare statement periods, environment totals, adjustments and payout reservations at `/admin/finance/statements`; owners use `/partner/finance`. Test, simulated and legacy amounts do not become eligible Live earnings. A payout obligation is not a receipt of money. Destination changes cannot redirect already pinned obligations, and failed verification prevents disbursement.

Disabling new payment attempts does not cancel an outstanding payment/refund obligation or stop callback, webhook and reconciliation processing. Hosted Razorpay Test acceptance remains **unexecuted in CP30**. This guide does not authorize or certify Live activation; use the separate CP32 business/provider and reconciliation gates.

## Privacy fulfillment and governed exports

Open `/admin/privacy`. Verify identity and authority, record the review and inspect the scoped preview before approving work. Recent authentication and the required capability must remain valid. Explain retained financial, case and audit records using the [retention policy](rentra-data-retention-policy.md); the current workflow does not erase all historical/shared/provider/backup data.

Track each stage, failure and retry. Report retained or partially anonymized data accurately. A queued job or partial result is not full deletion. Download only the authorized scoped copy/receipt; links/artifacts expire and access is audited. A failed stage uses its supported retry, preserving successful checkpoints. Do not recreate an unrestricted copy outside the workflow.

At `/admin/audit`, filter to the relevant action, actor, record and time interval. Free text, personal contacts, secrets and unrecognized payload fields are withheld. Governed exports are bounded, private to the authorized creator and expire. Both creation and retrieval require current access; a saved URL does not grant continued access after revocation. Audit history is append-only.

## Outages, incidents and uncertain delivery

- **Unavailable page:** retain the filters/form context and use Try again when the API recovers. A service failure is different from an empty list or a missing/foreign record. Failed forms preserve entered values where supported; recheck the saved record after any lost response.
- **Permission or session ended:** sign in to the correct portal or request the appropriate access through the owner/security workflow. Do not repeatedly submit a protected command or reuse another account's cookie.
- **Stale worker/backlog:** open the alert from `/admin/operations`, inspect the affected queue/record and current heartbeat, assign responsibility and record the next action. Acknowledgement, ownership, notes, escalation and snooze do not establish recovery.
- **Unknown provider/delivery result:** reconcile the existing attempt using the supported check path before another send. A network timeout may have occurred after a provider accepted the request.
- **Resolve an incident:** verify measured recovery and durable record state first. Record the evidence and reason. Reopen when measured health regresses; do not mark service healthy merely because an alert was acknowledged.

Deployment owners separately verify the correct API URL, credentialed CORS, HTTPS cookie topology, migrations and worker configuration. Do not put credentials in this runbook, tickets, screenshots or exported artifacts. See [CP30's deployment/provider continuation](rentra-client-admin-part30.md) for the exact external gate. No configured database migration or hosted deployment is performed by CP31.

## Handoff checklist

Record the filtered record link, affected visit/property IDs, environment, current status/version, permitted audience, last saved command/outcome, current assignee and next action. Include a sanitized audit/provider reference when available, and identify any uncertain or failed stage. Separate a local fixture result from an actual provider event. Never report success solely because a button was clicked, a spinner ended or a screenshot showed a success message.
