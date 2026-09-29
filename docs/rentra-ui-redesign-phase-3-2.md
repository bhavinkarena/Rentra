# Phase 3.2 - Customer navigation and layout boundaries

The account avatar now has a forest ring on `/account` and its nested routes. Public and protected headers wrap when labels need more room. Navigation targets retain their 44px minimum, with 18px icons, a 40px avatar and the existing 28/32px logos; enlarging text no longer doubles those graphics or pushes actions off-screen.

The account control is a direct link, not a dropdown. Its accessible name and current-state semantics remain. Explore, Saved, Bookings, login and partner access retain their destinations and role-dependent visibility. Saved-provider identity, profile-photo fallback and authentication guards were preserved.

## Layout ownership

Public pages use the existing flexible main region; their page components own content spacing. The protected customer layout owns the 1280px maximum and 16/24px outer gutters, with 32/48px vertical spacing. Preserve the narrower error reading column. Page-specific support/review/book-again padding remains assigned to those page phases, where actual signed-in content and shared operational variants can be inspected. No blanket padding removal was made.

The existing skip links and global scroll/focus treatment work in the sampled shell. The viewport uses ordinary browser inset behavior; no cutout-covering mode or new safe-area behavior was introduced. Physical notch/landscape testing remains part of final device QA.

## Evidence

`python scripts/verification/redesign-shell.py` passes **76/76 checks** at 320/390/768/1024/1440px using an isolated Next development server and a read-only in-memory API. The helper uses its own cache/ports, rejects occupied ports, stops its own services, and accesses no database or provider. Existing frontend/backend services remain separate.

- Four customer destinations, at least 44px targets, nested account current state, Saved active state and visibly different active/inactive account styling.
- Public/protected shell overflow, 200% root text enlargement, and enlarged headers occupying less than 40% of the test viewport height.
- Skip-to-account focus, visible keyboard navigation focus and zero header axe WCAG A/AA violations at all five widths.
- Actual account-link navigation across public/protected layouts, preserving its active state.
- Guest and partner-role login gates; blocked customer redirect marker; session outage stays on a failure page rather than becoming a login redirect.
- Zero API writes, uncaught browser exceptions or console errors in the fixture run.

These verify the real rendered frontend and guards against controlled responses. They do not certify backend authentication, private record delivery, profile mutation, OTP, payments or physical-device behavior. The original footer and twenty live anonymous gates remain covered by [Phase 3.1](rentra-ui-redesign-phase-3.md); their guard code was unchanged here.

[Baseline JSON](rentra-ui-redesign-phase-3-2-before.json) captures five absent account indicators and four enlarged-header overflow failures. One baseline harness check incorrectly required an HTTP 307 for blocked users; the final check also accepts Next's streamed redirect marker. That was a harness correction, not an authentication code change.

[Final JSON](rentra-ui-redesign-phase-3-2.json) and local ignored captures:

- [Phone account shell](../.impeccable/redesign/phase-3-2/customer-account-390.png)
- [Desktop account shell](../.impeccable/redesign/phase-3-2/customer-account-1440.png)
- [Tablet at 200% text](../.impeccable/redesign/phase-3-2/public-text-200-768.png)
- [320px at 200% text](../.impeccable/redesign/phase-3-2/public-text-200-320.png)

An additional live signed-out run, `python scripts/verification/redesign-public-shell.py`, passes 22/22 checks at 320/390/768/1440px: destination visibility, 44px targets, default/enlarged overflow, header axe, login navigation and runtime exceptions. See [live evidence](rentra-ui-redesign-phase-3-2-live.json). This uses the existing frontend/backend with no account session or writes.

Direct visual inspection confirmed the default and enlarged layouts. The independent finish reviewer returned `ship`, with no material fixes. Scoped ESLint, Prettier and whitespace checks pass. Production build succeeds with 77/77 generation after two sitemap timeout retries and existing public-contact/policy network fallback warnings. Those warnings do not certify successful content delivery.

## Next

Phase 3 is complete for the recorded shared-shell scope. Phase 4 home discovery is next. The full redesign and private page state matrices remain incomplete.
