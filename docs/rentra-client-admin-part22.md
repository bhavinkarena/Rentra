# CP22 — Statements and payout read models

Status: **COMPLETE — 27 September 2026.** Technical gates passed; the user approved the documented display definitions by requesting completion after reviewing the handoff. This is CP22-only work. Earlier parts and configured database migrations were not reopened or inspected.

## Scope and revisions

- Scope: CP22; CA01, CA09, CA12, CA19; the statement/payout follow-up in G04.
- Baselines: frontend `68a6588`, backend `fc92cf0`. The CP22 changes are uncommitted in both repositories.
- Owner: `/partner/finance`, `/partner/statements/[YYYY-MM]`, `/partner/allocations/[id]`, `/partner/payouts` and `/partner/payouts/[id]`.
- Admin: `/admin/finance/statements`, `/admin/finance/statements/[YYYY-MM]`, `/admin/finance/allocations/[id]`, `/admin/finance/payouts` and `/admin/finance/payouts/[id]`.
- Navigation, UTC-month/environment/property filters, paginated detail links, empty states, invalid-filter recovery, scoped CSV download, booking/allocation/refund/payment links, masked pinned destinations, actual recorded provider references and settlement timestamps.

## Approved display definitions

The following implemented display definitions were approved by the user on 27 September 2026 through the instruction to mark CP22 complete. This satisfies the tracker’s approved-display-definitions dependency. No commission, tax, retention or settlement policy has been invented.

| Figure | Implemented definition |
| --- | --- |
| Period | UTC calendar month of the allocation's creation. Refund and payout outcomes are current at the displayed “as of” time. This is a receipt-cohort statement, not an immutable historical cash-flow or tax statement. |
| Quoted rent | Booked rent for contributing visits, counted once per visit across rent/fee/deposit allocations. Quotes without receipt allocations are outside this statement. Quote value is not collection evidence. |
| Receipts | Actual allocation amount from recorded capture evidence. Live, Test, simulated and legacy/unverified categories are separate; no “all environments” money sum. Simulated value has its own total. |
| Completed refunds | Actual refund allocations with succeeded outcomes, joined and summed once per funding allocation. |
| Live rent after refunds | Only rent allocations admitted by the existing `captured_payment_allocation` live-evidence view, less succeeded refunds. Fees/deposits do not become owner earnings. |
| Reserved refunds | Expected allocations of requested, processing or unknown refunds. Failed refunds do not reserve funds. |
| Pending | Remaining rent for incomplete visits plus recorded pending/processing payout funds with a currently verified pinned destination. |
| Held | Frozen payouts, pending payouts whose pinned destination is no longer verified, and remaining completed rent without reliable attribution, an active recorded owner or a currently verified destination. |
| Accounting eligible | Remaining completed live rent after completed/reserved refunds and nonfailed payout reservations, with an active recorded owner and verified current destination. This does not imply an executable transfer. |
| Recorded settled | Actual funded amount on a payout whose recorded status is paid. UTR and settlement time are shown only if stored. |
| Adjustments/deductions | Refund allocations are the supported adjustments. Legacy gross/commission/TDS/GST fields are explicitly quoted rupee values, separate from funded amounts; they are not presented as verified deductions or recalculated tax. No manual adjustment ledger is created. |

For live rent, the displayed identity is: **net rent = reserved refunds + pending + accounting eligible + held + recorded settled**. All arithmetic uses integer minor units and decimal strings, including aggregate/export amounts.

## Evidence, attribution and permissions

New checkout order and visit snapshots preserve `ownerId`. Existing immutable snapshots are not backfilled with today's property owner. A funded payout's recorded owner can establish attribution for its source allocation if no snapshot exists. Conflicting or missing ownership evidence stays in the admin unresolved view and cannot leak to current or foreign owners. After a property transfer, original financial access remains; operational booking links are suppressed for the previous owner because those pages use current property access.

Reads run in a repeatable-read transaction so header/detail inputs reconcile within one response. The shared `captured_payment_allocation` view determines live evidence eligibility; the view's current-property owner field is deliberately not used for historical access. Separate requests have their own “as of” time and can change as new refund/payout outcomes arrive.

Owner routes require active-client access and the new `client.finance.read` capability. Admin routes require `admin.payments.read`. Both services recheck active actor scope. Export uses the same filters and ownership checks, neutralizes spreadsheet formula prefixes, and appends a `finance_statement_downloaded` audit record. Private responses/downloads use no-store headers. No full bank account or UPI ID is returned.

Payouts retain their recorded destination version. A destination change never substitutes the current version for a pinned obligation. Failed/frozen states explain the need for finance review. No payout creation, retry, disbursement, provider verification or money-moving endpoint is added.

## API and bounds

- Owner API root: `/api/v1/partner/finance`.
- Admin API root: `/api/v1/admin/payments/finance` (existing payment read permission).
- Root: statement; `/allocations/:id`: allocation/refund detail; `/payouts`: payout list; `/payouts/:id`: payout detail; `/statement.csv`: audited download.
- Filters: `period=YYYY-MM`, `environment=live|test|simulated|legacy_unknown`, optional `propertyId`, optional admin `ownerId`, and page. Owner identity always comes from the session; an attempted foreign owner filter is refused.
- Up to 1,000 matching allocations/payouts per read/export, with 30 visible rows per page and totals for the entire filtered result. An oversized result asks for narrower scope rather than exporting a truncated statement. Payout details are fetched in bulk.
- Statement month URLs are current projections; they are not stored statement snapshots. The UI and CSV state this explicitly. Manual adjustments and certified historical closing balances require a separate approved accounting model.

## Verification

- Focused backend: `PORTAL_TEST_DATABASE_URL=<disposable-local-server> node --import ./loader/register.mjs --env-file=.env --test test/integration/finance-statements.integration.test.js test/services/portal-access.test.js` — **12/12 passed**, zero skips. CP22 integration covers partial/succeeded/pending/failed refunds, quote deduplication, totals identity, list/detail/export agreement, nonlive exclusion, unknown ownership, cross-owner denial, inactive owners, read capability, period/property filters, property transfer, pinned destination replacement, pending/frozen/failed payouts and export auditing.
- Frontend unit suite: **23/23 passed**. Both repositories' lint and format checks passed. Backend migration-file check verified **34 existing files/journal entries**; no configured database access. Production Webpack build passed (network access was needed for the existing Google Fonts dependency).
- [CP22 browser/API gate](rentra-client-admin-part22-gate.json): **38/38 passed**; owner/admin statement and allocation/payout detail; direct API scope denial; separated environments; period/property filtering and filter recovery; CSV attachment/no-store and totals; pinned destination masking; recorded provider reference; keyboard focus; desktop/mobile axe and overflow checks.
- [CP22 outage gate](rentra-client-admin-part22-outage-gate.json): **10/10 passed**; both audiences' statement, period detail, allocation, payout list and payout detail show retryable failure when the disposable API is stopped.
- Helpers: `test/helpers/finance-fixture.js`, `seed-finance-gate.mjs`; browser runners: `scripts/portal-gate/cp22_gate.mjs`, `cp22_outage_gate.mjs`. The fixture models live/Test/simulated ledger facts only in an explicitly disposable local database. No provider is contacted and no actual funds move. This does not certify hosted live settlement.

## Migration, deployment and continuation

No CP22 schema migration, configuration secret or provider integration. CP22 uses existing reviewable ledger tables and CP21's destination schema. The configured database was neither inspected nor changed, following the instruction to work only on CP22. Confirm target deployment prerequisites through the normal deployment process; no migration status from earlier parts is recertified here.

Temporary fixture API/database and the isolated frontend are stopped after verification. The pre-existing local PostgreSQL server remains running. No hosted deployment or human screen-reader acceptance is claimed.

**Next part: CP23 — Dispute and deposit cases.** CP22 is complete; the tracker is 22/32 complete. Live payout execution remains outside this read-model scope.
