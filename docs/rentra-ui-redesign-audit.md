# RENTRA redesign — Phase 1 audit

Audit date: 2026-09-28. This is a continuation of the existing frontend refresh, not a new product implementation or completion certificate. [Master plan](../RENTra-UI-REDESIGN-PLAN.md) controls scope and phase progress.

## Evidence and limits

All **29 customer page source patterns** were inspected/inventoried: eight marketing, one guest login and twenty protected customer pages. An independent reviewer reconciled the 29 plan records, source files and machine-readable source inventory with no missing or extra entries.

The fresh read-only Python Playwright audit runs against the existing frontend on localhost:3000. It records public pages at 390 and 1440 px and anonymous access to all twenty protected patterns. See [raw results](rentra-ui-redesign-phase-1.json) and [reproducible script](../scripts/verification/redesign-audit.py). Current screenshots are local artifacts in `.impeccable/redesign/phase-1`; the user's current gitignore excludes that directory. The Markdown/JSON ledger remains outside that ignored directory.

The installed Playwright CLI was tried, but its user-profile cache writes were denied by workspace permissions. Redirecting its daemon cache alone did not resolve its separate browser-cache write. The working installed Python Playwright API supplied the actual browser runs without an installation or permissions change.

The completed run contains **26 public route/viewport captures and 20/20 passing anonymous authentication gates**. Public captures recorded zero horizontal overflow, zero axe WCAG A/AA violations and zero uncaught browser exceptions. Two handled Help API console errors remain recorded. Missing Help/policy/history content is explicitly flagged in the JSON, rather than counted as successful publication delivery. All capture PNG files decoded successfully. Documentation formatting and the Python audit script syntax passed their checks; no build/test rerun was needed for this read-only phase because product source was unchanged.

Prior disposable authenticated screenshots were visually inspected for booking detail and support. They support their specific layout findings, not a claim that current authenticated content has been exercised. Earlier evidence is retained in the [prior refresh report](rentra-ui-polish.md). Further signed-in state testing belongs to the relevant phase gates, using disposable local sessions/data.

## Prioritized findings

| Priority | Finding and evidence                                                                                                                                                                                                                                    | Action and phase                                                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1       | Mobile footer expands with registry size. The current 390 px home footer is **2618 px high with 46 links**; desktop is 983 px. Fresh location footer crop shows dozens of repeated city/intent phrases. This was hidden by the smaller earlier catalog. | Phase 3: group city exploration and disclose the full directory accessibly, preserving real destinations and useful discovery/SEO routes. Verify 1/10/many-city registries and keyboard/mobile behavior.                                                     |
| P1       | Help renders a handled error with search-specific guidance; terms/privacy/cancellation render 404 content on the running server. HTTP 200 from an App Router stream does not establish successful published content.                                    | Phase 11: contextual error presentation. Record missing publication/API routes as external delivery blockers; do not invent legal/help text or replace unavailable records with fake success.                                                                |
| P1       | Booking detail actions have little hierarchy. The prior mobile fixture puts “Open a dispute” before the property title, followed by six similarly framed actions. `BookingRecords.jsx` confirms the arrangement.                                        | Phase 9.1: lead with status, next visit/arrival and important booking actions; group secondary downloads and support/change actions while retaining permissions and functionality.                                                                           |
| P1       | A missing booking photo occupies a full hero despite providing no property information. The fixture screenshot and `BookingDisplay.jsx` show a 224 px mobile fallback.                                                                                  | Phase 9.1: compact missing-photo presentation; retain full supplied photography when available, financial details and accessible failure labels.                                                                                                             |
| P2       | Current account form recipe uses 14 px input text on phones while public inputs are 16 px. Other forms maintain separate padding/radius/error recipes.                                                                                                  | Phase 2 establishes the rule; Phase 8 and secondary form phases integrate narrowly. Preserve field names/actions/drafts/constraints and validate actual form states. Mobile browser zoom is a hypothesis needing device verification, not an observed fault. |
| P2       | Related customer tasks have inconsistent gutters. Support, book-again and review sections add page padding inside the customer layout; prior support screenshot has visibly wider gutters than booking detail.                                          | Phase 3 defines outer layout ownership; relevant page phases remove only accidental nesting, retaining deliberate reading widths and operational variants.                                                                                                   |
| P2       | Search/location filtering fills much of the initial mobile viewport before results. The fresh 390 px location crop places the result count near the bottom and first media below it.                                                                    | Phase 5: assess compact primary controls and progressive secondary refinement. Preserve selected values, sort, all date modes and URL-backed navigation; do not hide active criteria.                                                                        |
| P2       | Secondary task states are visually basic or metadata-heavy: bare notification empty copy, privacy checkpoints, raw dispute order-ID entry, review eligibility and dense support metadata.                                                               | Phases 10.1–10.5: clear state/next-action hierarchy. Test real fixture variants before redesigning; keep authoritative status and policy limitations.                                                                                                        |
| P2       | DESIGN.md describes a 16:10 narrow home photo, while current home and skeleton use 16:8.                                                                                                                                                                | Phase 2: reconcile documentation/samples with runtime; avoid altering the good first-viewport search to match a stale document.                                                                                                                              |

## What should remain

- Home search is within the fresh 390 × 844 viewport: its bottom is approximately **764 px**. Public home and login inputs compute to 16 px on phones and 14 px on desktop.
- Keep real property photography, forest identity, factual badges, flat discovery cards and separated Save navigation.
- Keep accepted booking totals distinct from separate deposits and verified payment collection.
- Preserve cancellation selection, computed preview, consent, preview hash and idempotency.
- Preserve support's persisted/asynchronous semantics, privacy scoping and attachment limits.
- Preserve review eligibility, moderation, duplicate prevention and explicit test-mode limitations.
- Installed Next 16.3 documentation supports and recommends the error-boundary `retry()` prop. No retry mismatch defect was established; do not change it based on older framework conventions.

## Customer coverage ledger

| Surface                                  | Current audit evidence                                                             | Remaining verification                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Home/search/saved/login/listing/location | Fresh desktop/mobile render, headings, overflow, axe, runtime and layout metrics   | Phase-specific actions, responsive stress, selected/error/empty variants and device testing          |
| Help                                     | Fresh handled failure at both widths                                               | Published FAQ/contact success, filtering, disclosure and contextual recovery                         |
| Policies                                 | All three kinds render missing-content states                                      | Real current/versioned publications, readable dates and permanent links                              |
| Help/contact history                     | Explicit unpublished-version negative cases at both widths; source reads inspected | Actual historical publication required before success can be verified                                |
| All 20 protected page patterns           | Anonymous gates exercised; source/components/dependencies inspected                | Authenticated successful content for each pattern using valid disposable fixture IDs                 |
| Booking/support prior fixture            | Direct visual inspection of recorded booking detail and support list               | Current state matrix, long content, mixed visits, attachments and role variants                      |
| Quote/payment                            | Prior quoted amount and persisted hold journey; prior expired-hold screenshot      | Active/processing/failed/confirmed/provider-unavailable retained captures and recovery interactions  |
| Cancellation/book-again                  | Source/domain preservation review                                                  | Disposable preview/receipt/stale/duplicate and fresh availability/price checks                       |
| Account/phone/privacy                    | Source/action/constraint review and prior account capture                          | Profile/photo/OTP/request/export/receipt/session state matrices                                      |
| Notifications/payment availability       | Source review and prior notifications capture                                      | Unread/read/empty/delivery variants; honest unavailable capability                                   |
| Reviews/report                           | Source and earlier eligible/moderation journey                                     | Current eligible/ineligible/duplicate/report/hidden-content states                                   |
| Support/disputes                         | Source/shared-role review                                                          | Valid scoped create/detail/response/version/evidence states and cross-role isolation                 |
| Ancillary downloads/error/loading        | Handler and boundary inventory in master plan                                      | Authorized/unauthorized files, MIME/downloads, matching skeletons and retry/focus in relevant phases |

## Independent assessment

A separate design reviewer performed a read-only customer assessment under the existing Impeccable workflow. It confirmed complete source/page-plan coverage and the booking action/photo, gutter, form and contextual recovery findings. It distinguished hypotheses (phone form position, mobile zoom, private-state density) from observed screenshots/source facts. The automated Impeccable engine remains unavailable; no detector score is claimed.

## Phase 1 acceptance

The phase delivers the complete source/task audit, actual public/gate observations, a ranked finding ledger and explicit missing state coverage. It does not implement customer-facing changes. Successful private and published-content verification is intentionally still required by subsequent gates; it is not inferred from the audit. No real OTP, payment, cancellation, support message, dispute or privacy request was sent in this read-only phase.

## Phase 4 resolution

Home repeated price qualifications and title/review competition are resolved in [Phase 4](rentra-ui-redesign-phase-4.md). Empty/failure distinction and 44px search controls were verified while retaining the initial mobile search geometry. This updates those scoped findings; the original audit observations and later private/search state gaps remain.

## Home quality correction

The user rejected the initial Phase 4 result because the visible experience was too similar to the old UI. Functional preservation alone was insufficient. The home composition has now been rebuilt around immersive photography, a manually controlled hero, a swipeable property rail and an occasion/city picker. The new [rebuild record](rentra-ui-redesign-phase-4-rework.md) supersedes the earlier home visual acceptance and records market research, new evidence and remaining scope.

## Full-scope reopening

All phases and surfaces are reopened per user direction. Historical checks remain functional evidence only; earlier visual acceptance is superseded. The home occasion panel now receives dedicated editorial imagery per occasion instead of one unrelated listing image.

## Navbar and footer rework

The user rejected the pale footer and requested a stronger navbar. The shared shell now uses a framed navbar and a forest closing section with grouped real links and compact city discovery. See [implementation and evidence](rentra-ui-shell-rework.md). The whole redesign remains open; these checks do not mark all shared components accepted.
