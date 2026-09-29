# Home redesign: visual and interaction rebuild

The previous home pass preserved functionality but did not deliver the visible transformation requested. The user rejected that result. This rebuild replaces the split hero and sixteen-card grid with an immersive photo opening, larger property carousel and interactive occasion planner. It retains the earlier pricing, search, Save and failure-state fixes.

## Research and design decisions

Official sources checked on 29 September 2026:

- [SaffronStays](https://www.saffronstays.com/) organizes discovery around occasions, groups and differentiated collections. Applied here as day picnic, pool, bonfire, shoot and offsite choices, using Rentra's existing intent routes and restrictions.
- [Plum Guide](https://www.plumguide.com/) foregrounds distinctive homes and destination discovery. Applied here as larger property photographs, visible attribution and a more editorial hierarchy. This is our design interpretation, not a claim that Rentra provides Plum Guide's service or curation.
- [Airbnb search filters](https://www.airbnb.com/help/article/3740) reinforce the importance of meaningful trip constraints. Rentra keeps its actual date, slot and guest parameters, with city and occasion choices leading to existing filtered discovery.

Research used current official web content. External browser screenshots were blocked by network access; no competitor visual capture or pixel comparison is claimed.

## What changed

- Full-width photograph and oversized forest/lime typography establish the opening. Manual previous/next controls switch three actual properties, including the image, attribution and link together. No autoplay.
- Native horizontal property rail replaces the long repeated grid. Larger photographs, a visible next-card preview, directional controls, position feedback and stronger hover/focus image movement support exploration. All sixteen real listings remain server-rendered and reachable.
- Occasion tabs change the editorial explanation and action. A native city selector builds the canonical intent destination. Arrow keys, Home and End follow the tab pattern. Owner-confirmation caveats remain visible.
- Warm near-white and pale olive home surfaces provide contrast within the existing forest identity. Existing logo, local font, prices, badges, reviews, assets and API behavior remain intact.
- Booking guidance becomes a short sequence. Shared footer city navigation remains compact.

Implementation: `app/(marketing)/page.js` and `components/rentra/home/`. The new CSS is scoped to home; shared search and listing card implementations retain their existing behavior.

## Verification

- [Fixture report](rentra-ui-redesign-phase-4-rework.json): 69 passing checks. Six widths (320–1920px), all listings, qualified prices, 44px search fields, first-viewport search at 390px, zero main-region axe violations, empty/failed/mixed/long-content states, Save/recovery, complete search parameters, photo fallback and reduced motion. Disposable browser storage and isolated in-memory API; no database or provider writes.
- [Live interaction report](rentra-ui-redesign-phase-4-rework-interactions.json): hero next/previous/wrap and link synchronization, carousel controls and boundaries, native arrow-key scrolling, occasion/city route, tab keyboard operation, responsive overflow and mobile axe checks. Two initial assertions were corrected after checking actual browser behavior: focus-visible requires keyboard modality; the existing global reduced-motion duration is 0.01ms rather than literal zero. Follow-up evidence is retained with the original assertions.
- Visual captures: `.impeccable/redesign/phase-4-rework/desktop.png`, `desktop-top.png`, `mobile.png`, `mobile-top.png`, `hero-focus.png`. Actual local frontend and public listing data were used.
- Independent finish review found a materially different composition and requested a brighter focus outline over photographs. Added and visually confirmed a 3px light outline with 4px offset. The action on the pale planner panel keeps the contrasting global forest outline.
- Scoped ESLint passed. All 36 existing tests passed. Production build passed with 77/77 static generation after two existing sitemap retries and contact/policy fallback warnings. Scoped Prettier and whitespace checks passed.

The earlier Phase 4 fixture report is superseded by this rerun. Historical before/live reports are retained separately. Fixture image-network logs are not production console claims. Authenticated bookings, payments and later redesign phases are outside this home verification.

## Review status

The rebuilt home is ready for visual review. Functional checks establish preservation; they do not substitute for the user's assessment of the requested premium experience. The entire website redesign is not complete.
