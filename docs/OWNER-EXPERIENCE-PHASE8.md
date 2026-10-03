# Owner experience Phase 8 — earnings and payments

Completed 2 October 2026 on `feat/owner-experience` in both repositories. Local implementation and verification; not deployed. EARN-01 through EARN-06 are delivered. EARN-07 remains the separately tracked payout-engine dependency.

## Delivered

- **EARN-01:** Earnings overview with Booked rent, Refunded and Completed visits’ rent; one row per visit; rent-only immutable owner attribution; active gateway environment by default; a booking-type selector only when multiple environments exist; property/month filters and server pagination of 30 visits. Totals cover the entire selection. Test and practice bookings are explicitly labelled. Dates use IST and money uses exact integer paise, including negative and large values.
- **EARN-02:** Booking detail links to its owner-scoped earning lines. Earning-line detail displays quoted rent under the corrected key. Owners cannot open the guest-fee allocation or another owner’s earning line. A property transfer retains the original owner’s financial history and removes their operational booking link.
- **EARN-03:** R0’s payout promises remain conditional on payouts being switched on. Pricing and calendar amount labels now say Booked rent. The money-copy glossary is below; commission and tax policy (D8) remains unresolved.
- **EARN-04:** IST receipt-month statements with property title, visit date, guest first name and booking reference; CSV rupees always have two decimals, UUID columns are omitted, spreadsheet formula prefixes are escaped, and downloads are audited. Filename is `rentra-statement-YYYY-MM.csv`. Print HTML includes every selected visit, hides the shell/navigation and uses the browser’s Print / Save as PDF flow.
- **EARN-05:** Payouts shows an explainer, recorded totals and the method on file. Missing and failed methods have appropriate actions. The rail is explicitly unavailable. Legacy Test/simulated payout records are classified using their receipt environment without treating an unfunded quote as paid money. Quote display uses integer minor-unit strings.
- **EARN-06:** Bank confirmation; account/IFSC normalization; all bank errors in one reply; controlled UPI/bank fields retained when switching; optional IFSC bank/branch lookup with a nonblocking outage message. Preview, versioning and drafts remain. An OTP confirms identity in the same session, retaining the draft and cookie; the server supplies the recent-auth window. Only account last four digits are persisted. Copy explains that the payment partner must re-collect details before the first payout.

## Calculation and copy contract

The selection is the **IST month when a rent allocation was recorded**, with current visit and refund outcomes. It is a receipt-cohort statement, not a visit-date or monthly bank settlement report. A visit’s quoted rent is counted once per selected month/environment even when several receipt allocations contribute. Completed visits’ rent includes only `completed`, not `no_show`; it is gross booked rent and is not reduced by refunds. Refunded reports completed refund allocations; outstanding refund reservations are shown separately on each row. Offline bookings produce no earning row. Legacy records without established historical owner attribution stay excluded.

| Concept | Approved wording |
|---|---|
| Gross rent | Booked rent |
| Deductions | Commission and tax deductions are not applied yet. Booked rent is not a payout amount. |
| Future payouts | Rentra pays your earnings after each completed visit, once payouts are switched on. We’ll tell you before the first payout. |
| Current rail | Payouts are not switched on yet. No transfer date has been set. |
| Provider details | We’ll ask you to confirm these details with our payment partner before your first payout. |

The shared UI strings are in `lib/domain/owner-earnings.js`. Nothing here defines commission, TDS or GST rates or promises net earnings. EARN-07 still needs D8, a payout rail/KYC, scheduling, provider references and refund recovery.

## Security and migration

Apply backend migration **`0061_owner_earnings.sql` before deploying the backend**, then deploy the frontend. It adds nullable `auth_session.reauthenticated_at` and expands the OTP constraint for session-bound `payout_confirm` challenges. Existing sessions keep their original freshness until confirmed. No live database was migrated.

OTP HMAC input binds purpose, challenge, owner, session and verified recipient. Challenges expire after ten minutes, are single-use, allow five failed attempts and have a one-minute request cooldown and three requests per hour per owner. Confirmation rechecks the active account, live session and verified recipient under locks. Delivery failure removes an undelivered challenge so it can be retried. Codes and full bank accounts are absent from returned DTOs. Email/SMS copy identifies the payout-method change. Earnings, print and identity responses use `private, no-store`.

Production email needs the existing Resend configuration; SMS needs the existing Twilio configuration. The IFSC integration follows the [official Razorpay API contract](https://github.com/razorpay/ifsc/wiki/API); its bank/branch hint is advisory and does not verify the account.

## Verified locally

- **Backend:** 206 tests passed, zero failures/skips, using disposable local databases. Final focused earnings rerun also passed after adding missing/failed method checks. Coverage includes rent/fee/refund reconciliation, 00:30 IST month boundary, gateway defaults, 1,200 visits across 40 pages and full export, historical ownership, two drafts, same-session confirmation, wrong-session rejection, wrong-code limits, replay, revoked sessions and delivery failure/retry. Adapter tests check payout-specific email and SMS messages.
- **Frontend:** 71 tests passed; production build passed. Changed JavaScript lint and whitespace checks passed. Whole-repository frontend lint still reports two pre-existing unused directives in `app/(marketing)/listing/[handle]/opengraph-image.js` and `app/apple-icon.js`; neither file changed here. Backend service/schema files follow the repository’s existing lint exclusions.
- **Migrations:** 62 SQL files/journal entries verified. Migrations were exercised only in disposable local databases.
- **Browser:** [Recorded checks](evidence/owner-phase8/browser-checks.json) cover Test default, 35 visits on two pages, live rent/refunds, statement aliases, full CSV/print, earning links, payout explainer, all field errors, switching inputs, normalized bank details, IFSC outage, stale session → draft → wrong code → correct code → submission with the same session, and an empty second owner. Six audited views have zero WCAG axe violations and there are zero page errors. Earnings has no horizontal overflow at 360/390/768/1024/1440 px; the payout method also has no overflow at 360 px.
- **Rollback:** [Flag checks](evidence/owner-phase8/rollback-checks.json) confirm legacy earnings, period statement and payout screens with `NEXT_PUBLIC_OWNER_V2_EARNINGS=false`. This public flag requires a frontend rebuild. It does not reverse the additive migration or revert payout-form improvements.
- **Artifacts:** [Mobile earnings](evidence/owner-phase8/earnings-mobile.png), [desktop earnings](evidence/owner-phase8/earnings-desktop.png), [mobile payout method](evidence/owner-phase8/payout-method-mobile.png), [fixture CSV](evidence/owner-phase8/statement.csv) and [browser PDF](evidence/owner-phase8/statement.pdf).

Live Resend/Twilio delivery, live IFSC responses, hosted smoke checks and actual payout execution were not tested. Browser OTP uses the local development bypass; IFSC failure is stubbed. No production money or account data was touched. Phase 7’s recorded remaining work and Phase 9 notifications remain separate.

## Repeatable checks

From `rentra-backend`, set both `PORTAL_TEST_DATABASE_URL` and `CP01_TEST_DATABASE_URL` to a local disposable PostgreSQL cluster, then run `npm test` and `npm run db:check`. The test helper creates and drops its own databases and rejects remote hosts.

From `Rentra`, run `npm test`, ESLint for the changed JavaScript files, and `RENTRA_BUILD_FIXTURE=1 npm run build` (separate build cache). Run `git diff --check` in both repositories.

For browser checks, run `node --import ./loader/register.mjs test/helpers/owner-earnings-browser.mjs` from the backend with `PORTAL_TEST_DATABASE_URL` and `OWNER_EARNINGS_FIXTURE` set to a temporary JSON file. It serves a disposable API on 4148. Start Next on 3148 with `RENTRA_BROWSER_FIXTURE=1`, `RENTRA_BROWSER_FIXTURE_ID=owner-phase8` and `NEXT_PUBLIC_API_URL=http://127.0.0.1:4148/api/v1`. Run `node scripts/portal-gate/owner-earnings.mjs` with the same fixture path, `PLAYWRIGHT_MODULE` pointing at Playwright’s `index.mjs` and `CHROME_PATH` pointing at Chrome.

For rollback, start a separate Next fixture on 3149 with a unique fixture ID and `NEXT_PUBLIC_OWNER_V2_EARNINGS=false`. Run the gate with `OWNER_EARNINGS_LEGACY=1` and `GATE_WEB_ORIGIN=http://localhost:3149`. Stop the API with `stop` on its stdin, or SIGTERM, to drop its database. Never commit the temporary fixture file or session tokens.
