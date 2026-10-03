# Owner experience — Phase 12: accessibility and design system

Implemented locally on 2 October 2026. Not deployed. Shared foundations are delivered; the component merges in DS-03, the full DS-05 form sweep and the extended axe/focus browser gate remain open.

## Delivered

- **DS-01 tokens.** `:root` surface tokens now reference the `--color-ink-*` scale. `--color-forest-deep` and `--primary-active` are removed; every use now points at `brand-900`. Portal `text-body` is 15 px (meta stays 14 px). New `text-stat` (28 px/1) and `eyebrow` utility. Owner files use `rounded-md`/`rounded-lg` only; resting `shadow-xs` was removed from owner cards, sticky bars use `shadow-md`. The wizard route group now renders inside `portalFont` + `.portal-ui` (BUG-47).
- **DS-02 status.** New `lib/domain/status.js` (labels, hints and tones for property, booking and review states) and `components/ui/status-badge.jsx` (dot plus text). `ListingStatusBadge` and the shared `StateBadge` now render through it. In review and verification scheduled are info, paused is neutral, hidden is danger. Unknown states are humanised instead of shown raw. The calendar's booked state and mini-month dot use the success tone. The customer reviews page no longer prints the raw `moderation_state`.
- **DS-03 (partial).** Deleted unused `ui/badge.jsx` and the unused `BookingDisplay` `badge` constant.
- **DS-04 icons.** Navigation icons are 20 px. Owner warning icons use `CircleAlert` (wizard progress, review, submit bar, completion stepper, calendar). The navigation map already matched the spec.
- **DS-06 accessibility.** After each client navigation, `PortalShell` moves focus to the page h1 (or `#portal-main`) unless the page already placed focus inside main. The locked navigation row is now a focusable `button` with `aria-disabled` and its reason in `aria-describedby`; the reason uses 14 px text. `DetailHeader` h1 uses `text-h1`. Calendar cells now announce each slot's state and open price ("Day picnic open ₹15,000"); arrow-key movement already existed.
- **DS-07 unsaved guard.** `UnsavedChangesGuard` is mounted once in `PortalShell` and `WizardShell`; the per-page mounts were removed. Forms are tracked from first input until submit. Section and policy forms stay dirty until `rentra:form-saved`; a policy *preview* no longer marks the form saved. GET/search forms are ignored. Forms removed from the page stop counting. The browser Back button is intercepted only while something is dirty, through one same-URL history entry, which fixes the old wizard behaviour of pushing a guard entry on every mount.
- **DS-08 money and time.** `bookingMoney` now delegates to `displayMoney`, so booking screens show "₹1,200" instead of "₹1,200.00". Owner calendar and Today copy say "IST" instead of "India time" / "(India)".
- **DS-10 glossary.** Owner copy fixes: "Calendar" (was Portfolio calendar), "Bookings" (was Booking records), "Fix property", "What would you like to add?", "Getting ready for bookings", "check-in" (was handover), plain review wording in the submit bar (was "revision"), "Earning lines" in the owner statement (was allocations). Owner booking detail no longer says "Your reservation" or "Contact the host".
- **DS-11.** `DESIGN.md` has a new "Owner portal" section with the tokens, status rules, components, icons, accessibility, money/date rules and glossary.

## Verification

- Frontend tests: **79 passed**, 0 failed. New `test/domain/status.test.js` checks that every mapped state has a label and a known tone, that tones follow the spec, and that unknown states are humanised.
- ESLint (with `--fix`) on `components`, `lib` and `app`: no errors. Production build passed. API-registry network warnings during build are pre-existing (no backend running).
- No backend change, migration or live database change.

## Open acceptance criteria

- **DS-03 merges** not done: `PartnerPageHeader`/`AdminPageHeader`/`OnboardingShell` into `PageHeader`; the four `Field` copies into `ui/field`; the six empty states into `EmptyState`; the six pagers into `Pager` (BUG-34); hand-rolled primary buttons into `Button`; admin `StatusBadge`, `DetailLayout` `BADGE`, TeamPanel and KYC/Ownership/Payout pills into the shared `StatusBadge`; finance `money()` and pulse `loading.js` deletions.
- **DS-05 forms** sweep (44 px everywhere, "(optional)", `aria-required`, `ValidationSummary` on every form, disabled reasons) not audited form by form.
- **DS-06 gate:** added in Phase 14 as `scripts/portal-gate/owner-phase12.mjs`. It passes on 14 routes and found two defects, both fixed: the guard skipped Server Action forms, and focus waited on the skeleton. See [Phase 14](OWNER-EXPERIENCE-PHASE14.md). The remaining owner routes and the 12 px essential copy (KPI hints, payout explanations) have not been swept.
- **DS-08 dates:** list/detail/relative date formats not unified across every owner screen.
- **DS-12** languages stays backlog.
