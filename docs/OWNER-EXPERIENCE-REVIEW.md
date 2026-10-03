# Owner experience verification — 3 October 2026

**Follow-up:** the three behavior defects and lint/formatting failures below have been addressed in [Owner review fixes](OWNER-EXPERIENCE-REVIEW-FIXES.md), with fresh regression evidence. The JavaScript budget and production evidence remain open. The rest of this document preserves the original audit findings and measurements.

**Verdict:** the tested owner workflows work locally, but the code is not fully ready for release. Three behavior defects remain, both repositories have failing formatting gates, and the owner JavaScript budget fails. Passing tests do not establish that every requirement in the plan or every production integration works.

Reviewed [OWNER-EXPERIENCE-PLAN.md](OWNER-EXPERIENCE-PLAN.md) against frontend commit `4e7edf2` and backend commit `63cbf77`. Application code was not changed during this review. Database writes and browser submissions used disposable localhost fixtures; external notification delivery was disabled or replaced with fake providers.

## Confirmed findings

### 1. Caretaker WhatsApp rejection does not fall back to SMS — P2

Backend: [caretaker-invite.js](../../rentra-backend/src/services/notifications/caretaker-invite.js), lines 17–24.

The SMS fallback runs only when `send()` returns an `undelivered` outcome. A definite provider rejection throws `NotificationError('CHANNEL_REJECTED', true)` and goes directly to the outer catch, which saves `failed`. The main owner notification worker handles this rejection, but the separate invitation sender does not.

Reproduced against a disposable invitation with an injected provider: WhatsApp threw a definite rejection and the SMS adapter was ready to succeed. Observed `channelsAttempted: ['whatsapp']`, `deliveryState: 'failed'`. The copy-link fallback works, but the promised automatic SMS fallback is missing for this case.

Use the same definite-rejection fallback rule as the main worker. Keep ambiguous outcomes separate so a timeout cannot cause a duplicate invitation.

### 2. Completed email events remain in the polling queue — P2

Backend: [owner-delivery.js](../../rentra-backend/src/services/notifications/owner-delivery.js), line 32; [owner-jobs.js](../../rentra-backend/src/services/notifications/owner-jobs.js), provider polling and due-row selection.

Only the exact email event `delivered` maps to `delivered`. `opened`, `clicked`, `complained`, and `canceled` all map to `accepted`. The worker therefore keeps polling these records instead of settling their outcome. In particular, an email opened before the first poll can remain `accepted` even though it reached the recipient.

Reproduced with scoped fake Resend responses: `delivered → delivered`; each of the four other events above returned `accepted`. The [Resend retrieve endpoint](https://resend.com/docs/api-reference/emails/retrieve-email) points to the [documented email events](https://resend.com/docs/dashboard/emails/manage-emails#understand-email-events), which include those states.

Define the terminal outcomes explicitly, including cancellation and complaint handling, and test polling after an opened or clicked event. These outcomes should not all fall through to pending delivery.

### 3. Contact-change success feedback disappears — P3

Frontend: [OwnerSecurity.jsx](../components/partner/OwnerSecurity.jsx), lines 24–29 and 82–83; [partner.js](../lib/actions/partner.js), line 411.

Email and mobile confirmation save correctly, rotate the session, and keep the current device signed in. However, the action revalidates the owner layout, and each contact form is keyed by its contact value. The changed value remounts the form before its effect can display the success toast; its inline success state is lost too.

Both contact changes were submitted in Chromium at 360 px. The updated contact was visible and subsequent authenticated requests worked, but zero success announcements were visible after either save. Display feedback inside the action-state callback before the remount, as the review-reply form already does, or keep the result in a persistent parent.

## Failing quality and performance gates

| Check | Result |
|---|---|
| Backend `npm run lint` | **Failed:** 601 errors and 1 warning. 599 errors are formatting; two are unused variables in `src/scripts/seed-gujarat-partners.js`. |
| Backend `npm run format:check` | **Failed:** 24 files. |
| Frontend `npm run format:check` | **Failed:** `DESIGN.md`. |
| Owner first-load JavaScript budget | **Failed:** all 53 owner routes exceed 180 KiB. Fresh production-build measurements range from **302.7 to 401.2 KiB gzip**. |

Consequently, the full repository CI commands cannot currently pass, despite passing tests and a successful build. The bundle measurement counts each unique first-load chunk once per route; it is a cold-load estimate rather than a measured mobile network transfer. The budget is the plan's Phase 11 requirement.

## Checks that passed

| Check | Result |
|---|---|
| Backend `npm test`, with both local integration-database flags | **219 passed**, zero failures or skips. |
| Frontend `npm test` | **79 passed**, zero failures or skips. |
| Frontend `npm run lint` | Passed. |
| Frontend production build | Passed using the isolated verification build directory. Static sitemap generation logged API network warnings and used its fallback. |
| Backend `npm run db:check` | **64 migration files and journal entries verified.** |
| Browser screen checks | **26 views**: 13 routes at 360 and 1280 px; no horizontal overflow, WCAG 2 A/AA or 2.1 A/AA axe violations, or uncaught page errors. |
| Browser workflow checks | **10 workflows** passed for their saved behavior, with the contact-success feedback defect recorded separately above. |

The browser workflows covered inbox links opening in a new tab and retaining unresolved tasks, actionable mark-all cancellation, critical notification preferences and optional caretaker preferences, guide search and anchors, posting/editing/deleting/reporting reviews, initial private support photos and booking/visit context, caretaker copy-link fallback and field reset, booking-reference dispute selection, privacy access requests and deletion blocking, applicant support, and email/mobile OTP changes with session rotation and sign-out of other devices.

## Remaining scope and production evidence

- **EARN-07 is deliberately outside the UI redesign:** a live payout rail, commission/tax policy, settlement ingestion, and refund recovery remain separate work. Earnings UI completion does not mean payouts execute.
- Live OTP, WhatsApp/SMS/email delivery, approved templates, provider-backed uploads, and hosted smoke checks were not exercised against production providers in this review.
- The [Phase 14 runbook](OWNER-EXPERIENCE-PHASE14.md) still records no complete new-owner → completed-visit → earnings journey script. The [Phase 11 runbook](OWNER-EXPERIENCE-PHASE11.md) also leaves physical Android/iPhone and real 4G checks open.
- DS-03 component merges and the full DS-05 form audit remain open in the [Phase 12 runbook](OWNER-EXPERIENCE-PHASE12.md).
- Local database fixtures substitute text for unavailable PostGIS geometry. These results do not validate production geospatial behavior.

Fix the three confirmed behavior defects and the failing CI gates before claiming the implemented scope is complete. Meet the performance and production integration gates before claiming readiness for the full owner experience.
