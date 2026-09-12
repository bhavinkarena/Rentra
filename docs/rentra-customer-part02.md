# Part 02: reservation migration and backfill runbook

The implementation is an additive database expansion. `booking` remains one visit, with the same IDs, references, whole-rupee fields and review/payout foreign keys. The new tables are `booking_quote`, `booking_order` and `inventory_reservation`.

## Scope and rollout

Migration `0008_customer_reservations.sql` adds the schema and an exclusion constraint on the **new, empty** single-property reservation ledger. It does not switch availability readers or create inventory from legacy records. Part 04 must reconcile active legacy visits and owner blocks and implement shared listing-first locking before the ledger becomes authoritative. Part 11 implements customer holds/confirmation. Multi-unit inventory is deliberately rejected by this ledger.

Apply the expansion before deploying code paths that select the new booking columns. Use versioned migrations, not `drizzle-kit push`. Preserve the custom GiST exclusion DDL when generating future migrations: Drizzle's snapshot does not model it. The reviewed SQL also creates `booking_id_rentable_idx` before the composite foreign key that requires it.

`btree_gist` must be available and installable on the target database. The test runner verifies it on a disposable database provisioned using the configured server. If installation is unavailable on another deployment, stop the migration and provision the extension; do not remove the constraint as a workaround.

## Audit and conversion

Run the dry-run before any data change. `--time-zone=Asia/Kolkata` is an explicit operator assertion that this timezone has been verified for the selected legacy dataset; the tool does not derive it from the machine timezone. Mixed or unsupported property zones require a separately reviewed mapping and are outside this backfill.

```sh
npm run db:audit-customer -- --time-zone=Asia/Kolkata
```

The command executes in a read-only transaction, works before migration 0008, and outputs internal booking IDs and reconciliation totals, with no contact/address/payment credentials. Keep its detailed output in restricted operational storage.

For an approved deployment, retain a verified backup and the before-audit report, apply `npm run db:migrate`, then run:

```sh
npm run db:audit-customer -- --time-zone=Asia/Kolkata --apply --database-name=YOUR_VERIFIED_DATABASE_NAME
```

The database-name argument must match the connected database. The tool does not apply schema migrations. Backfill is intended for a maintenance window before new customer booking writes are enabled. It locks listings in ID order, then legacy bookings, creates one order per visit and updates the visit in a single transaction. A concurrent rerun waits and becomes a no-op. Existing migration markers, partially populated fields or changed source amounts are checked; invalid records abort the entire apply. Re-run the dry-run afterward and retain its reconciliation report.

Money conversion uses the shared `legacyRupeesToMinor` boundary. Original rent, fee and deposit become minor-unit mirrors. `amount_advance_paid` is retained unchanged and mirrored only into **`legacy_advance_reported_minor`**. It is not an intended advance, verified capture, deposit holding, refund or payout fact. New `amount_advance_minor` stays null and `collected_minor` stays zero. Historical policies/rates/listing descriptions are labelled unknown rather than reconstructed using today's listing.

Every legacy order has `state=legacy`; the child keeps its original state. Payment mode is `legacy_unknown`. Exact slot hours/buffers remain unknown even if partial start/end data exists. No reservation is created by this backfill. The report identifies active child states requiring inventory remediation, and all unknown hours/settlements/provenance. Historical completed/cancelled visits create no inventory blocks.

Do not infer seed or real-visit provenance from a reference prefix, customer phone, booking state or payout label. Fresh development seed rows now explicitly carry `visit_provenance=seed`. To classify old rows, supply an independently reviewed per-ID evidence manifest:

```json
{
  "BOOKING_UUID": {
    "provenance": "seed",
    "evidence": "Reviewed immutable import/seed manifest reference"
  }
}
```

Use `--provenance-file=/path/to/manifest.json` in both audit and initial apply. Classification changes after backfill require a separate reviewed remediation; rerunning the tool does not rewrite provenance. Even `real` visit provenance is not evidence of payment.

## Verification

```sh
npm run verify:customer-reservations
npm run verify:customer-foundation
npm run lint
```

The database verifier creates a unique `rentra_test_p02_*` database, applies migrations 0000–0007, creates synthetic legacy booking/review/payout fixtures, applies 0008 and reruns migration/backfill, tests constraints and concurrent interval claims, then runs the existing development seed and verifies seed conversion. It removes only its own newly created database. It never seeds or migrates `DATABASE_URL` itself. An optional `TEST_DATABASE_ADMIN_URL` can select another provisioner with CREATE DATABASE rights. Neon provisioning uses the direct endpoint because transaction pooling cannot reliably create/drop databases.

The configured Rentra database was audited read-only during this session. No migration/backfill/seed was applied to it. Its 44 rows reconciled to expected minor totals of rent **37,100,000**, fee **2,968,000**, deposit **22,800,000**, and reported legacy advance **12,243,000**. All 44 had unknown hours, settlement evidence and unclassified provenance; none had an active state requiring inventory remediation at audit time. This is a point-in-time report, not rollout approval or proof that future availability is safe.

Part 03 must add the complete payment/refund schema and gate existing revenue/payout queries. Part 02's zero-collected constraints alone do not fix legacy dashboard queries that still sum whole-rupee seed payouts.
