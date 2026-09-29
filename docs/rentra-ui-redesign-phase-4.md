# Phase 4 - Home discovery

Historical polish pass: the user rejected its visual result. The [substantial home rebuild](rentra-ui-redesign-phase-4-rework.md) supersedes this design and its fixture gate. The following records the earlier scope only.

Home retains its hero, supplied API photography, first-viewport search and factual trust guidance. The lower grid is quieter: identical API price qualifications appear once above it, property names use the full card width, and location/review information wraps on the next row with ratings kept together.

The qualification is shared only when every listing has the same nonempty note. Different conditions remain on individual cards, and search cards retain notes by default. Home property links describe the shared note for assistive technology. Prices, units, deposits, from-price qualifications, verification badges and review counts still come from their existing data. Unknown prices no longer receive a misleading `from` prefix.

Successful empty listings now say “No places to show yet”; API failures say “Places are temporarily unavailable.” Both retain useful search recovery. Existing absent/failed-photo placeholders remain honest. Search controls grow from 36px to 44px, offset by smaller cell padding, keeping the form's overall height unchanged.

## Verification

[Before observations](rentra-ui-redesign-phase-4-before.json), [fixture evidence](rentra-ui-redesign-phase-4.json), and [live evidence](rentra-ui-redesign-phase-4-live.json).

`python scripts/verification/redesign-home.py` passes **69/69 checks** using an isolated Next development server and read-only in-memory API seeded from current public listing/registry reads. It uses separate ports/cache and stops its own services. Controlled long-title/rating samples are labelled layout samples and exist only in that fixture.

- 320/390/768/1024/1440/1920px: no overflow, all sixteen listings, one shared qualification, full-width titles, 44px search fields and zero main-region axe WCAG A/AA violations.
- 390/1440px: distinct empty/failure states, mixed price conditions, long titles/ratings, unknown price and missing-photo states.
- Search preserves trimmed location, date, slot and guest count in the URL; search cards retain individual notes.
- Save is separate from property navigation, persists in disposable guest browser storage and recovers on Saved. The fixture's `saved/guest` POST is a metadata read, not a database write.
- Failed hero photography recovers with an honest placeholder; reduced motion and visible search keyboard focus work. No unexpected API writes or uncaught browser exceptions.

Ten additional read-only/live checks confirm all sixteen listings, loaded photographs, the single price qualification, first-viewport mobile search, independent guest Save and Saved recovery. The live 390px search bottom remains approximately 764px within the 844px viewport. Real customer identity, booking or financial actions were not used.

The fixture console contains failed image resource messages and a hydration warning identifying Playwright's temporary inline `caret-color: transparent` screenshot style. The helper now captures with `caret='initial'` to avoid that DOM mutation. A [fresh live console probe](rentra-ui-redesign-phase-4-console.json) reports zero console errors and zero runtime exceptions; these logs are not treated as uncaught application exceptions or silently discarded.

Local ignored captures:

- [Desktop grid](../.impeccable/redesign/phase-4/grid-live-1440.png)
- [Phone grid](../.impeccable/redesign/phase-4/grid-live-390.png)
- [Phone first viewport](../.impeccable/redesign/phase-4/home-live-390-viewport.png)
- [Desktop home](../.impeccable/redesign/phase-4/home-live-1440.png)

Direct visual inspection and independent finish review agree: `ship`, no material fixes. Scoped ESLint passes and all 36 existing tests pass. Production build succeeds with 77/77 generation after two sitemap timeout retries and existing missing public-contact/policy network warnings. Scoped formatting and whitespace checks pass. These fallback warnings do not certify successful public-content delivery.

## Remaining scope

Search/location/saved refinement is Phase 5. Current backend publication/content and sitemap latency remain external conditions. Protected customer state matrices and the full redesign remain incomplete.
