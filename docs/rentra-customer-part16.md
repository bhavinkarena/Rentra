# Part 16 — Reviews with honest publication

Status: COMPLETE — 20 September 2026. Part 17 is next.

## Customer and operator behavior

- `/bookings/[orderId]/reviews` offers only owned, unreviewed visits with real provenance, completed status and all three actual handover/return/completion evidence records. A Test payment neither proves nor disqualifies an actual visit. Missing evidence, incomplete, cancelled, disputed, seed and simulation visits do not qualify. A no-show has no actual completion evidence and cannot qualify by elapsed dates.
- Overall rating is required, from 1–5. Cleanliness, listing accuracy and value for money are optional 1–5 subscores. Review text is 20–3000 characters. Submission persists before success, starts pending and preserves one immutable review per visit/author. Identical retries replay; changed duplicates are rejected.
- Customer booking pages show submitted reviews, publication status and the moderation reason. No review is automatically published because it is positive, nor rejected because it is negative. Two-way blind release and publication deadlines remain deferred.
- `/admin/reviews` offers oldest-first, paginated customer reviews with explicit publication decisions, reasons, stale-version checks and audit records. Apply policy consistently regardless of score. Open reports include the review and its moderation control; staff records a resolution before closing the report. Reporting never automatically hides a review.
- `/partner/reviews` shows only published reviews for the active owner's listings. Owners can reply or report; they cannot change ratings or publication. Replies appear separately from the customer's words. Guest-targeted owner feedback remains private and excluded from aggregates.
- Public listing reviews offer authenticated reporting. A report is deduplicated per review/reporter, with 10–1000 characters explaining the concern. Staff can investigate review or reply content.

## Public data and caching

`public_customer_review` is the shared evidence-backed publication view. Public text/subscores filter through it. Database triggers recalculate listing rating/count on review changes and visit state changes. The listing cache guard prevents manual or seed totals from inventing ratings. Review mutations invalidate the root layout, refreshing listing, search and discovery pages after publication or reply changes.

Visit transitions continue to use the shared listing mutex. Review submission, moderation, replies and reports also acquire that mutex before row/account locks, keeping concurrent duplicates and aggregate changes serialized. Provider/payment calls are not part of the review flow.

## Migration and seed compatibility

Migration `0018_customer_reviews.sql` extends reviews with moderation/reply/version data, adds persisted reports, rating checks, evidence/publication guards, public view and aggregate triggers. Historical text is preserved but previous publication timestamps are cleared for fresh eligibility/moderation. The score check is NOT VALID for historical rows; it enforces new writes without deleting malformed old content. Invalid old reviews cannot be republished unchanged.

Preflight: 0018 is the only pending migration. The configured database contains 29 previously published reviews; these were retained privately pending review. Seed scripts now keep zero public ratings, omit simulated review inserts and explicitly mark owner seed visits as simulations. No seed script is run by this part.

Migration status: **0018 applied**. Post-check confirmed all migrations applied, all 29 historical review rows retained, no historical reviews published and no unsupported public rating totals. No seed script, provider call or deployment was run.

## Verification

All 7 review groups including 390px Chromium, 6 public-listing regression groups and 28 foundation groups passed. Lint, schema drift verification and the 50-page Webpack build passed. Disposable databases were removed. Migration 0018 is applied; all 29 historical review texts were preserved privately and unsupported public rating totals reset. No seed, external provider call or deployment was run.

| Check | Result |
| --- | --- |
| `verify:customer-reviews` with `CUSTOMER_BROWSER_DRIVER` | 7 groups, including 390px Chromium customer submission/status reload, low-score moderation, owner reply, report and public hide/reload |
| `verify:customer-listing` | 6 groups including public DTO/privacy and gallery focus regression |
| `verify:customer-foundation` | 28 groups |
| `npm run lint` | Clean |
| `npm run db:generate` | No schema drift |
| `RENTRA_BUILD_FIXTURE=1 npm run build -- --webpack` | Passed; 50 pages generated |
| Migration post-check | No pending migration, 29 historical review rows retained privately, zero unsupported public ratings |
| Documentation/diff | Exactly one detailed card for parts 01–16, Part 17 next, browser manual checklist unchanged |

The first gate caught a publication timestamp serialization error; publication now uses the PostgreSQL clock. The final gate passed with that repair. Review scores are not used to decide moderation outcomes.

No external provider calls or messages are needed. Browser checks do not replace the Part 18 accessibility/performance audit.

## Next

Part 17: help, versioned policies and persisted operational support requests.
