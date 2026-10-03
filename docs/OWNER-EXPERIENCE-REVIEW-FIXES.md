# Owner review fixes — 3 October 2026

This follow-up addresses the three confirmed behavior defects and the lint/formatting gates from [the original review](OWNER-EXPERIENCE-REVIEW.md). The owner workspace UI refresh is recorded separately in [OWNER-WORKSPACE-UI.md](OWNER-WORKSPACE-UI.md).

## Changes

- **Caretaker invitations:** a definite WhatsApp `CHANNEL_REJECTED` error now takes the same SMS fallback path as an explicit undelivered outcome. Timeouts and other ambiguous outcomes never send an additional SMS. An already claimed invitation is not sent again.
- **Email polling:** delivered, opened, clicked and complained events settle as delivered. A complaint also records `EMAIL_COMPLAINED`. Canceled emails settle as failed with `EMAIL_CANCELED`; bounced, failed and suppressed events also settle as failed. Queued, scheduled, sent and delayed events keep polling. Unexpected provider states are rejected instead of silently treated as accepted. These rules follow [Resend's email event documentation](https://resend.com/docs/dashboard/emails/manage-emails#understand-email-events). Complaints are recorded as delivery evidence, not permission to send again.
- **Contact saves:** the confirmation callback announces success before layout revalidation remounts the form. Updated contact values continue to reset the old challenge. The current session rotates; previous sessions are revoked.
- **Quality gates:** formatted the previously failing backend files and frontend `DESIGN.md` using the existing Prettier rules. The Gujarat seed script now reports its inserted listing/availability totals, uses the allowed console methods, and declares its unchanged caretaker lookup with `const`. No seed script was executed.

## Verification

| Check | Result |
| --- | --- |
| Frontend lint and formatting | Passed |
| Frontend tests | 79 passed, no failures or skips |
| Isolated production build | Passed; sitemap requests used the existing API-network fallback |
| Backend lint and formatting | Passed |
| Backend tests with both disposable local database flags | 223 passed, no failures or skips |
| Focused owner communications suite | 10 passed, including the three added notification regression tests |
| Contact browser workflows | 4 passed: email and mobile changes at 360 and 1280 px |
| Settled-screen accessibility and page width | No WCAG 2 A/AA or 2.1 A/AA violations or page overflow in the four checked states |
| Migration journal check | 64 files and entries verified; no migration added |

The notification tests cover explicit and thrown WhatsApp failures, ambiguous outcomes, rate limits, claimed-send protection, all documented email event mappings, complaint/cancellation markers, and exclusion of settled records from further polling. External providers were replaced with local fake responses.

The reusable [contact feedback browser gate](../scripts/portal-gate/owner-contact-feedback.mjs) runs against the disposable owner communications API helper with external delivery disabled. It exercises email and mobile changes at 360 and 1280 px, including invalid codes, visible success announcements, contact persistence after reload, current-session rotation, previous-session rejection, accessibility and page width. It respects the normal one-minute OTP cooldown between changes on the same channel and waits for the sidebar fade after session rotation before auditing settled colors. See the [four passing results](evidence/owner-review-fixes/contact-browser-results.json), [mobile email save](evidence/owner-review-fixes/360-email-saved.png) and [desktop mobile-number save](evidence/owner-review-fixes/1280-sms-saved.png).

## Still open

The first-load JavaScript budget remains **failed**. [Measurements from the isolated build](evidence/owner-review-fixes/bundle-summary.json) in this pass found **54 owner routes**, approximately **303.7–405.1 KiB gzip**, against the plan's **180 KiB** limit. These fixes do not claim to meet that budget. Live provider/hosted checks, physical device and real 4G evidence, the complete owner journey gate, DS-03 component merges and the remaining DS-05 form audit are still tracked in the original review and phase runbooks. Concurrent dashboard analytics edits are outside this follow-up's recorded checks.

Both app processes must load the changes. No database migration is required.
