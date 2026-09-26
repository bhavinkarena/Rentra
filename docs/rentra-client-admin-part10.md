# CP10 — Portfolio calendar and interval operations

Status: **COMPLETE — 26 September 2026.** No migration. Local disposable-database and browser evidence only; not deployed.

## Scope and revisions

- CP10; CA01, CA06, CA21–22; G11.
- Baseline: frontend `60ef33c`, backend `158e249`. Changes remain uncommitted in both repositories.
- `/partner/calendar` now provides a portfolio agenda, week and rolling 31-day month, with URL-backed date, property and slot filters and property pagination (10 properties per page).
- The existing property calendar uses the same read model and display, keeping its overview/list breadcrumb and its schedule controls.
- Text labels and colors distinguish booked visits, temporary holds, owner blocks, closed/open date slots and price overrides. Native keyboard-accessible disclosures show actual visit times, protected buffers, hold expiry, source booking links and permitted owner-block/price actions. Overnight reservations appear on each intersected India-local date.
- Expired holds are excluded from the calendar read. Modern and legacy price overrides are shown. Visits without a corresponding reservation surface a reconciliation notice instead of disappearing silently.
- Owner date additions, price changes, blocks and releases require a preview and exact-input confirmation. Changed calendars return a conflict, retain typed input and offer reload. Existing schedule changes retain their existing configuration-version guard.

## API and transaction contract

All endpoints below are under `/api/v1`, behind the existing active-client session and `client.calendar.read` / `client.calendar.write` capabilities. Ownership is checked separately.

| Endpoint | Behavior |
| --- | --- |
| `GET /partner/calendar` | `from=YYYY-MM-DD`, `days=7\|31`, optional `property`, `slot=day\|night\|full_day`, `page`. Owner-scoped safe read model; invalid filters give 400. |
| `GET /partner/listings/:id/calendar` | Existing settings and owner blocks, now from a consistent snapshot with `listing.calendar_version`. Foreign/missing ids give 404. |
| `GET /partner/listings/:id/calendar/state` | Replaces a broken internal-state endpoint with the safe calendar read model scoped to this property. Never exposes raw booking/customer records. |
| Existing POST `…/calendar/{open-dates,price-override,block,unblock}` | Existing fields plus `expectedCalendarVersion` and `mode=preview`. Preview returns `preview.token`, submitted values, affected date slots and the proposed result. Confirmation sends identical values, `mode=apply` and `previewToken`. |
| Existing POST `…/calendar/schedule` | Existing `expectedVersion` contract, unchanged. |

The route id is authoritative for all calendar writes; a body-supplied `rentableId` cannot retarget a request. Foreign mutations return 404 before producing a preview.

`calendar_version` fingerprints configuration/content versions, current booking/reservation state, availability and price overrides. The server compares it **under the shared inventory mutex**, then signs the preview token (HMAC with the existing session secret) for the owner, property, command and exact submitted values. A stale snapshot returns 409 `CALENDAR_CHANGED`; a missing or mismatched preview returns 409 `PREVIEW_REQUIRED`. Overlap refusal returns 409 `INVENTORY_CONFLICT`, with the overlapping reservation intervals.

Preview runs the **same existing domain command** inside an outer inventory transaction, then deliberately rolls it back. Availability, reservations, expiry changes and audit rows are all rolled back. Confirmation revalidates and commits the command and audit together. `withListingInventory` can reuse this explicitly supplied internal transaction context; retries remain on the outer transaction, so it never retries a statement inside an aborted transaction. No alternative availability engine or reservation table was added.

Bulk operations are bounded to 31 ordered dates on one property. Date-addition previews enumerate both slots for every date and distinguish additions from preserved existing rows. Receipts state how many date slots were added. Existing closed slots, reservations and accepted booking prices remain intact. A block is one exact continuous interval; any overlapping reservation refuses the whole command. Release still filters `source='owner_block'`, so a booking reservation id cannot be released by an owner-calendar command.

## Verification

| Check | Result |
| --- | --- |
| Backend suite with `CP01_TEST_DATABASE_URL` and `PORTAL_TEST_DATABASE_URL` | 92/92 passed; all integration tests ran against disposable local PostgreSQL databases. |
| New `test/integration/owner-calendar.integration.test.js` | Passed: owner scoping, safe serialization, active/expired holds, overnight buffer conflict, preview inventory/audit rollback, exact-input confirmation, stale override, concurrent booking vs owner block, booking-id unblock refusal, concurrent release, existing closed dates preserved. |
| Browser/API `scripts/portal-gate/cp10_gate.mjs` | 37/37 passed — [recorded gate](rentra-client-admin-part10-gate.json). Covers desktop/mobile, axe, keyboard disclosure, agenda and month filters, source links, previews, persistence, stale UI input/reload, direct API denials and session revocation. |
| Browser outage `scripts/portal-gate/cp10_outage_gate.mjs` | 2/2 passed — [recorded gate](rentra-client-admin-part10-outage-gate.json). Both portfolio and property calendar show retryable failure rather than not-found. |
| Frontend tests | 19/19 passed. |
| Both repositories: ESLint and Prettier | Passed. |
| Backend `npm run db:check` | Passed: 28 migration files and journal entries agree; no database access. |
| Frontend `RENTRA_BUILD_FIXTURE=1 npm run build -- --webpack` | Passed. |

The browser viewport checks use 1280×950 and 390×844. Scanned desktop/mobile calendar and filtered month pages had no horizontal overflow and no serious/critical axe WCAG A/AA violations. This is automated fixture evidence, not a human screen-reader or hosted environment certification.

Initial sandbox runs could not bind test servers or download Google Fonts. The corresponding checks were rerun with the required local-server/network access. Browser assertions were corrected to wait for completed submissions and rendered content rather than loading indicators or Next hydration script text.

### Reproduce locally

1. Start an isolated local PostgreSQL server with a database-creation user. Set `PORTAL_TEST_DATABASE_URL` to that local server, never a production URL.
2. In the backend, run the full test suite with that variable and `CP01_TEST_DATABASE_URL`. The helpers apply the real 28 migrations to throwaway databases and drop them afterwards. Without PostGIS, fixture-only geometry columns use the existing text fallback.
3. Start `test/helpers/serve-property-review.mjs` with `FIXTURE_STAGE=published` and `CP06_GATE_FIXTURE` pointing to a temporary JSON path. Use the backend Node loader and `.env` loading as in the other CP gates. It serves port 4106. Then run `test/helpers/seed-calendar-gate.mjs` with that same fixture path.
4. Start Next on port 3106 with `RENTRA_BROWSER_FIXTURE=1`, a unique `RENTRA_BROWSER_FIXTURE_ID`, and `NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1`.
5. Run `node scripts/portal-gate/cp10_gate.mjs` in the frontend with `GATE_TOKENS` set to the fixture JSON. Set `PLAYWRIGHT_MODULE` and `CHROME` to your local Playwright package and Chrome executable if needed. The gate revokes the owner session at its last check.
6. For the outage gate, use a valid fixture session, stop the disposable API, keep Next running and run `cp10_outage_gate.mjs`. It records its own evidence file.

Never commit fixture JSON: it contains disposable session tokens and a database URL.

## Migration, deployment and limits

- No schema change, new configuration secret or configured-database write. The configured database was not re-audited or migrated in CP10. Local disposable databases applied all 28 existing migrations.
- Deploy the frontend and backend together: date-operation APIs now require preview/version fields. Old clients receive a conflict instead of an unguarded write.
- Existing schedule validation, customer quote/hold/checkout behavior and reservation exclusion constraints remain authoritative. The calendar's open-date labels are not a guarantee that a visit can be booked.
- The month view is an explicitly labeled rolling 31-day window. Property filters list the properties on the current portfolio page; use property pagination to reach others.
- Cross-property bulk writes are not offered. Existing legacy closed slots are preserved, not reopened by date addition. Maintenance is an owner block with a reason, not a new inventory category.
- Price links open the existing date-price editor; callers choose the displayed date/slot there. CP11 owns further pricing-policy controls.
- No hosted deployment, live provider execution, large-portfolio performance benchmark or human screen-reader pass was performed.
- **Next: CP11 — Versioned pricing and supported booking policy.** Read its business-decision prerequisites before exposing new settings.
