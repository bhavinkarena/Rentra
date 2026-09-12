import { BACKFILL_VERSION, planLegacyVisit } from '../../lib/domain/booking-legacy.js';

export async function auditLegacy(sql, options) {
  const rows = await sql`SELECT to_jsonb(b) AS row FROM booking b ORDER BY b.id`;
  const plans = rows.map(({ row }) => planLegacyVisit(row, options));
  // Decimal strings preserve exact totals even when the dataset exceeds JS safe integers.
  const totals = {};
  for (const key of ['amount_rent_minor', 'amount_fee_minor', 'amount_deposit_minor', 'legacy_advance_reported_minor']) {
    totals[key] = plans.reduce((sum, p) => sum + BigInt(p.amounts[key] ?? 0), 0n).toString();
  }
  const mismatchedOrders = [];
  for (const plan of plans.filter((p) => p.alreadyBackfilled)) {
    const [order] = await sql`SELECT o.* FROM booking_order o JOIN booking b ON b.order_id=o.id WHERE b.id=${plan.id}`;
    if (!order || order.request_hash !== plan.requestHash ||
        ['amount_rent_minor', 'amount_fee_minor', 'amount_deposit_minor'].some((key) => Number(order[key]) !== plan.amounts[key])) {
      mismatchedOrders.push(plan.id);
    }
  }
  return {
    version: BACKFILL_VERSION, rows: plans.length,
    eligible: plans.filter((p) => p.canBackfill).length,
    backfilled: plans.filter((p) => p.alreadyBackfilled).length,
    invalid: plans.filter((p) => p.issues.length).map((p) => ({ id: p.id, issues: p.issues })),
    mismatchedOrders, expectedMinorTotals: totals,
    unknownHours: plans.filter((p) => p.unknownHours).map((p) => p.id),
    inventoryRemediationRequired: plans.filter((p) => p.inventoryRemediationRequired).map((p) => p.id),
    unknownSettlements: plans.filter((p) => p.settlementUnknown).map((p) => p.id),
    unknownProvenance: plans.filter((p) => p.provenance === 'legacy_unknown').map((p) => p.id),
    authoritativeInventoryEnabled: false,
  };
}

/** Offline maintenance operation. Listing-first locks match the future inventory service.
 * No ledger entries or payment facts are manufactured from legacy bookings.
 */
export async function backfillLegacy(sql, options) {
  return sql.begin(async (tx) => {
    await tx`SELECT id FROM rentable ORDER BY id FOR UPDATE`;
    const before = await auditLegacy(tx, options);
    if (before.invalid.length || before.mismatchedOrders.length) throw new Error('Audit failed; no backfill changes applied');
    const rows = await tx`SELECT to_jsonb(b) AS row FROM booking b ORDER BY b.id FOR UPDATE`;
    let changed = 0;
    for (const { row } of rows) {
      const p = planLegacyVisit(row, options);
      if (!p.canBackfill) continue;
      const snapshot = { ...p.snapshot, provenanceEvidence: p.provenanceEvidence };
      const [order] = await tx`INSERT INTO booking_order (
        reference, customer_id, rentable_id, state, currency, time_zone,
        pricing_version, policy_version, policy_snapshot, listing_snapshot,
        amount_rent_minor, amount_fee_minor, amount_deposit_minor,
        payment_mode, visit_provenance, idempotency_key, request_hash, created_at
      ) VALUES (
        ${'LEGACY_' + row.id}, ${row.customer_id}, ${row.rentable_id}, 'legacy', 'INR', ${p.timeZone},
        'legacy_unknown', 'legacy_unknown', ${JSON.stringify({ known: false })}::text::jsonb, ${JSON.stringify(snapshot)}::text::jsonb,
        ${String(p.amounts.amount_rent_minor)}, ${String(p.amounts.amount_fee_minor)}, ${String(p.amounts.amount_deposit_minor)},
        'legacy_unknown', ${p.provenance}, ${'legacy:' + row.id}, ${p.requestHash}, ${row.created_at}
      ) RETURNING id`;
      await tx`UPDATE booking SET order_id=${order.id}, item_position=1, local_day=day,
        currency='INR', time_zone=${p.timeZone}, hours_known=false,
        amount_rent_minor=${String(p.amounts.amount_rent_minor)}, amount_fee_minor=${String(p.amounts.amount_fee_minor)},
        amount_deposit_minor=${String(p.amounts.amount_deposit_minor)},
        legacy_advance_reported_minor=${String(p.amounts.legacy_advance_reported_minor)},
        payment_mode='legacy_unknown', visit_provenance=${p.provenance}, collected_minor=0,
        pricing_version='legacy_unknown', policy_version='legacy_unknown',
        listing_snapshot=${JSON.stringify(snapshot)}::text::jsonb, policy_snapshot=${JSON.stringify({ known: false })}::text::jsonb,
        slot_snapshot=${JSON.stringify({ slot: row.slot, hoursKnown: false })}::text::jsonb,
        price_snapshot=${JSON.stringify({ ...p.amounts, historicalRateKnown: false })}::text::jsonb,
        backfill_version=${BACKFILL_VERSION}, backfilled_at=now()
        WHERE id=${row.id} AND backfill_version IS NULL`;
      changed++;
    }
    const after = await auditLegacy(tx, options);
    if (after.invalid.length || after.mismatchedOrders.length || after.rows !== before.rows ||
        JSON.stringify(after.expectedMinorTotals) !== JSON.stringify(before.expectedMinorTotals)) {
      throw new Error('Reconciliation failed; transaction rolled back');
    }
    return { changed, ...after };
  });
}
