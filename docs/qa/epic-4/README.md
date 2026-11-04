# Epic 4 local browser verification — 4 November 2026

These are real local application checks, not hosted acceptance. They cover Stories 4.1–4.6: guest stay-issue intake, urgent routing, private notes versus guest replies, incident remedy preview and decision, Test award execution, and case and money tracking per audience.

Guest, admin, support-reader and owner actions ran in Playwright's bundled Chromium 153 on macOS, at two action widths:
- **1440:** mouse pointer;
- **390:** touch emulation (`hasTouch`, `isMobile`).

Each run also audited six screens at 320, 390, 768, 1024 and 1440px. The audit checked reflow, ran an axe WCAG 2.1 A/AA scan, and measured 44px primary targets.

The target check runs only where the emulated pointer is coarse, because the portals deliberately use a compact density for `pointer: fine` (`app/globals.css`, `.portal-ui --spacing`). In practice that means 320 and 390 on five of the six screens in the 390 run. The 1440 run records no target checks.

This is desktop emulation. It does not certify WCAG 2.2 AA, native mobile browsers, screen readers or field performance.

## Result

Both runs passed on one fresh fixture: first 390, then 1440.

| Run | Passed | Failed | Browser | SQL observation | Fixture step |
| --- | --- | --- | --- | --- | --- |
| `390/results.json` | 107 | 0 | 101 | 4 | 2 |
| `1440/results.json` | 98 | 0 | 92 | 4 | 2 |

Checks are labelled by `source`:
- `sql` checks are read-only database observations, such as saved priority, photo count and alert count; the first-response time; the decision row; and the refund reason prefix.
- `fixture` steps stand in for jobs or providers that cannot run locally. Each run has two:
  - marking the urgent alert email `failed`;
  - setting the executed Test refund to `unknown` (1440, as the dispatcher does on a provider error) or to verified `succeeded` (390).

## Journeys per run

- **4.1 intake**
  - Booking detail → "Report a problem" opens the intake with the order preselected.
  - An empty submit focuses the first error.
  - A late report (80 h) without a reason is refused, and the entered values are kept.
  - An urgent `access` report with 2 photos is saved and shows its reference and acknowledgement. No refund, and no order change.
  - A plain booking-help request is saved without the urgent block.
  - The admin sees the issue type, the remedy and 2 private photo links.
- **4.2 urgent routing**
  - The intake lists `stranded`.
  - The guest sees "Marked urgent. A person will reply within 12 hours.", the configured phone and email, and 112, with no 24/7 claim.
  - The admin `urgent`, `aged` (seeded 13 h case), `unassigned` and `failed_delivery` views list the right cases with their badges.
  - The detail page shows alert delivery and "No reply yet".
- **4.3 notes versus replies**
  - The "Private note" tab shows the admin-only notice. A saved note is labelled and leaves the first response unset.
  - "Reply to guest" sets `first_response_at`.
  - The guest thread shows the reply and never the note.
  - A `admin.support.read`-only admin gets only the note tab and no remedy controls.
- **4.4 remedy**
  - The Test-mode label and the owner-funded projection label are shown.
  - Preview for 100% owner-funded: paid ₹1,080, additional ₹1,080, provider call at execution.
  - Saving creates the active decision and moves no money.
  - At 390 a decline is saved first. The guest sees "Declined." with the reason, and the later award supersedes it, keeping 2 rows.
  - The guest sees "100% refund approved — refund being prepared." before execution.
- **4.5 execute**
  - The confirmation states ₹1,080 refund and ₹80 owner obligation.
  - The execution rows show a Test refund of ₹1,080 · Queued and an obligation of ₹80 · Due (payout already succeeded).
  - The refund reason carries the "Rentra support case <ref>" prefix.
  - "Create repayment link" opens a ₹80 Test link.
- **4.6 tracking**
  - The guest sees a Decision block and a separate Refund block (Queued). There is no owner or obligation wording and no note.
  - The owner earnings page shows "Incident case <ref> · 100% refund, owner funded · <reason>", with no guest details, photos or note.
  - At 1440, an unknown refund shows the guest "Needs attention — Rentra is checking". The admin sees a "needs investigation" link to `/admin/finance/refunds/<id>`, which opens, and there is no retry on the case.
  - At 390, a verified refund shows "Refunded".
- **All screens:** no runtime or hydration errors.

## Defects found and fixed

1. **Owners could not reach any repayment endpoint.** This affected Stories 2.18–2.20 and 4.6.
   - `routeCapability` mapped `/partner/repayments*` to the non-existent `client.repayments.*`, so `requirePortalCapability` returned 403 `CAPABILITY_REQUIRED` to every active owner.
   - The earnings page swallows that error, so repayment links, notices and the 4.6 incident row never appeared.
   - **Fix:** `rentra-backend/src/services/auth/capabilities.js` maps `repayments` to the `finance` domain and adds `client.finance.write` to active owner capabilities. Only the repayment POSTs (verify, notice view/ack) map to it.
   - **Test:** `test/services/portal-access.test.js`.
2. **Admin support case overflowed horizontally on phones.** The page overflowed by 14px at 320px under touch density, and by 3px under mouse density.
   - The single-column grid used an implicit `auto` track sized by min-content.
   - **Fix:** `components/admin/AdminSupport.jsx:312` adds `grid-cols-[minmax(0,1fr)]` below `lg`.

## Reproduce safely

Keep a disposable PostgreSQL server on `127.0.0.1:55432` (superuser `postgres`). Never use a configured or hosted database, and never run `db:migrate`.

From `rentra-backend`, start the API:

```sh
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres \
DATABASE_URL=postgres://nobody@127.0.0.1:1/never \
node --import ./loader/register.mjs --env-file=.env test/helpers/serve-epic4.mjs
```

What the helper does:
- It rejects any other host or port, creates a unique `rentra_test_*` database, and seeds two completed Test-Razorpay orders (₹1,000 rent + ₹80 fee) with succeeded fixture payouts, plus a 13-hour-old unanswered case.
- It injects a memory evidence store and the file-backed fake Razorpay, and fails closed on any other outbound fetch.
- Tokens and the database URL stay in ignored `tmp/epic4qa/fixture.json`.

Send `stop` on stdin, or SIGTERM, to drop the database.

From `Rentra`, start Next:

```sh
NEXT_PUBLIC_API_URL=http://127.0.0.1:4114/api/v1 RENTRA_BROWSER_FIXTURE=1 RENTRA_BROWSER_FIXTURE_ID=epic4 \
RENTRA_SUPPORT_PHONE=+919000000111 RENTRA_SUPPORT_EMAIL=support@fixture.invalid RENTRA_SUPPORT_HOURS="09:00-21:00 IST" \
npx next dev --hostname 127.0.0.1 --port 3114
```

Then run both widths. Set `PLAYWRIGHT_MODULE` if `playwright` is not resolvable, and `CHROME` to use system Chrome. Each width uses its own order; restart the API for a clean replay.

```sh
EPIC4_ACTION_WIDTH=390 node scripts/portal-gate/epic4-support.mjs
EPIC4_ACTION_WIDTH=1440 node scripts/portal-gate/epic4-support.mjs
```

The runner writes an "incomplete" result before it starts, so a setup failure never leaves earlier green output behind. Screenshots are kept for 390 and 1440 only; the JSON records every width.

## Limits

- **Photos:** stored in a memory store, not Cloudinary.
- **Alert emails:** not sent; the failed state was set by a fixture step.
- **Refunds:** queued through the real execute command. The dispatcher and provider were not run: the refund outcome was set by a fixture step.
- **Owner payouts:** fixture transfers, not RazorpayX.
- **Owner repayment:** the repayment-link payment itself (owner verify) was not exercised in the browser.
- **Timed alerts:** the 1-hour and 12-hour unanswered-alert jobs were not run. The `aged` view used a seeded case.
- **Devices and performance:** no actual iOS or Android hardware, human screen reader, native zoom or field performance was used.
- **Frontend unit tests:** `npm test` shows 9 failures ("Failed to load bindings") both with and without the AdminSupport change. This is an environment issue on this machine, not caused here.
- **Untouched:** Neon, hosted services, push and deployment.
