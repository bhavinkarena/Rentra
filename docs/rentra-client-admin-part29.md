# CP29 — Operational incidents and service settings

Status: **COMPLETE — 28 September 2026.** Implementation progress: **28/32**. CP25 remains independently **IN PROGRESS**. CP30–CP32 remain planned. Migration `0040_operational_incidents` passed on disposable local PostgreSQL; it is **not applied to the configured database**.

## Delivered behavior

The operations overview links every measured alert code to `/admin/operations/incidents/[code]`. The detail reads a fresh count and sample time, shows missing worker heartbeats as unknown and old heartbeats as stale, and provides up to 25 related records where the underlying signal has a navigable operational record. Payment, refund, booking, property, support and delivery rows link into their existing consoles. Anonymous aggregate customer-measurement alerts have no per-person drilldown by design. Provider webhook and unmatched capture samples link to the payment investigation directory because no event/transaction-specific admin page exists. The overview always lists both expected workers, including ones with no heartbeat row.

An operator can open, assign to an active administrator, add a note, acknowledge, snooze for 1/4/24 hours, escalate, and resolve an incident. Each command requires a reason, expected version and UUID request key. The database serializes commands per alert; exact request replay returns the prior result, stale versions fail, and incident events plus the audit log append evidence. A resolved incident can reopen if the signal recurs. Snoozing and acknowledgement do not hide or clear the measured alert. Resolution requires a fresh zero-count sample; the event records the count and sample time. This is application measurement, not proof of infrastructure deployment or sustained provider recovery. Human resolution and measured recovery remain separate states.

`/admin/notifications/[id]` adds a restricted delivery drilldown with event key, template, explicit unrecorded template version, channel, masked recipient, attempts, provider SID, failure, schedule/delivery timestamps, booking link and recorded operator actions. The existing safe retry command remains available only for blocked/retry/failed rows with no provider ID; uncertain POSTs cannot be resent and require reconciliation against the original Twilio SID/account/recipient/sender/body hash. The existing atomic state update rejects duplicate retry attempts. Provider acceptance is not described as handset delivery.

Only the already-supported Razorpay **Test** gateway is editable under `/admin/payments`. Its typed provider/enablement/collection controls now show an immediate impact preview and the last 20 immutable revisions with actor and time. Disabling stops new payment attempts while pinned outstanding intents and webhook/refund processing remain eligible. Readiness describes locally configured credentials, not connectivity. Notification adapter configuration, worker deployment, Live payment activation, arbitrary feature flags and bulk sends remain outside these controls.

## Verification

| Check | Result |
| --- | --- |
| Real migration/incident fixture | 1/1 passed: missing and stale heartbeat, active-signal refusal to resolve, assignment, acknowledgement versus measured recovery, duplicate request key, stale version, fresh recovery and inactive admin |
| Delivery fixture | 1/1 passed: masked detail, one of two concurrent retries succeeds, unknown send refuses retry, fake-provider SID/account/body reconciliation succeeds once |
| Existing gateway regression | CP19 disabled-gateway/pinned-obligation test passed in full backend run |
| Backend suite | 140 passed, 1 failed, 0 skipped. The sole failure remains CP25 `INVENTORY_REMEDIATION_REQUIRED` in its publication fixture; no CP29 test failed |
| Frontend | 36/36 tests, production Webpack build, lint and formatting passed |
| Backend static | Full lint/format and `db:check` passed with 41 migration files/journal entries |

The database tests used a disposable local PostgreSQL server and synthetic provider response; they do not establish hosted Twilio delivery, hosted Razorpay capture, an actual deployed worker recovery, or application of migration `0040` to the configured database. No browser/axe or human screen-reader pass was run for these new screens; CP31 covers measured accessibility. Do not operate the incident routes against a database missing migration `0040`.

## Operator runbook

1. Open Operations, select the measured alert, and review the sample time, worker heartbeat and linked records. A missing heartbeat is unknown; check the worker deployment/logs before declaring failure or recovery.
2. Open an incident with a concrete note. Assign an active operator, acknowledge or escalate it, and use snooze only for a documented follow-up window. The alert count continues to display regardless of those actions.
3. Investigate the linked booking/payment/refund/support/notification record. For blocked delivery with no provider ID, retry once; for an unknown send, enter the original Twilio SID and reconcile. Never resend an uncertain POST without provider evidence.
4. After the underlying count reaches zero and a fresh heartbeat is recorded where applicable, record the recovery evidence in a resolution note. A recurring signal may reopen the incident.
5. For new Test payment attempts, inspect the payment settings impact preview and provider readiness, then save a versioned change. Review revision history after saving. Disabling does not cancel outstanding obligations. Rollback is a new revision, not a mutation of history.

Migration: `rentra-backend/drizzle/0040_operational_incidents.sql` adds current incident state and append-only action history. Existing business/finance tables are untouched. Apply through the normal migration path to each target database before deploying the new API/UI. No migration was applied to the configured database in this session.
