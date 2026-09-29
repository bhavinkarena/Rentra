# Phase 2 — foundation consistency

Completed 2026-09-28. Scope: existing design tokens, shared Button/Input focus, and design-reference agreement. Page-specific forms and navigation remain assigned to their later gates in the [master plan](../RENTra-UI-REDESIGN-PLAN.md).

## Changes

- Removed `outline-none` from shared Button and Input. It overrode the global two-pixel `:focus-visible` outline in Tailwind's utility layer. Existing component rings, input constraints, disabled/invalid behavior, button variants and form actions are retained. The embedded login field keeps its keyboard outline even though it deliberately removes its ring.
- Corrected DESIGN.md's stale 16:10 home-media description to the existing 16:8 ratio below 768px, 4:3 from 768px and 420px large-screen cap. The home skeleton already matches this geometry, so no composition change was needed.
- Clarified shared input type (16px below 768px, 14px from 768px), two-pixel focus outline/three-pixel offset, and deferred custom customer-form integration. Updated the local structured design narrative to agree.
- Corrected the global CSS comment to reference DESIGN.md instead of the historical HTML specimen and removed the blanket assertion that every palette value is a verified text color.

## Verification

[redesign-foundation.py](../scripts/verification/redesign-foundation.py) performs read-only checks against the running application on localhost:3000. The [before evidence](rentra-ui-redesign-phase-2-before.json) records zero-pixel input/button outlines at all three widths. The [final evidence](rentra-ui-redesign-phase-2.json) records **54/54 passing checks**:

- All 36 documented palette entries agree with CSS; all nine public typography roles and five shadow values agree with their references; public/portal font definitions use the same existing local font asset.
- Live radii compute to 6/10/14/20px and page width to 1280px at 390, 768 and 1440px. Home image ratios match the documented responsive thresholds. Mobile search remains within the 844px viewport.
- Login Input and Button now compute two-pixel solid focus outlines at every tested width. Existing page overrides make these controls 48px tall, above the 44px foundation target. Input type computes to 16/14px as expected.
- Forced-colors mode preserves both outlines; reduced motion constrains the button transition to 0.01ms. Login has no axe WCAG A/AA violations or horizontal overflow at the tested widths. No uncaught browser exceptions were recorded.
- Eight tested normal-text/background pairs meet 4.5:1. The lowest tested ratio is warning on warning background at 4.579:1. These checks do not certify arbitrary palette combinations or all customer form states.

Nine local screenshots cover home, input focus and button focus at 390/768/1440px. All decode successfully. Mobile input/button captures were directly inspected; the independent finish reviewer also inspected the supplied mobile focus captures. Artifacts are under `.impeccable/redesign/phase-2`, which remains excluded by the user's gitignore.

Source checks: ESLint on the two changed shared components passed; targeted Prettier and whitespace checks passed. All **36 existing tests passed**. Production `npm run build` completed successfully and generated 77 static pages. It retried sitemap generation twice after 60-second timeouts and reported existing contact-route/policy-network failures with fallback handling. Those warnings remain recorded rather than described as clean data/API verification.

## Independent finish review

The existing manual Impeccable workflow supplied a separate, bounded reviewer. Its verdict was **disposition: ship**, with no material fix within Phase 2 scope. It confirmed restored outline fidelity, responsive documentation agreement and preserved control semantics. The unavailable automated engine was not rerun and no detector score is claimed.

## Remaining issues and next phase

Custom account/support/review/dispute form integration needs authenticated state evidence in the relevant later phases. Shared small/icon variants retain their existing density; this phase does not certify every operational hit target. Missing public content, sitemap/API latency and earlier repository-wide lint issues remain outside this foundation repair.

Next is Phase 3: public/customer navigation and layout, starting with the measured oversized registry-driven footer. Read the master plan and relevant source first; retain real city/intent destinations and verify disclosure, keyboard behavior and responsive registry sizes.
