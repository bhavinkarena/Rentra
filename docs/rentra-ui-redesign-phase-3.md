# Phase 3.1 — Public footer destination browser

The footer now uses city tabs on larger screens and a labelled native selector on phones. Selecting a city updates one shared panel of category and visit links. The rejected accordion design expanded an entire grid row and left large empty areas; this replacement preserves the same height across every city selection.

The existing forest palette, typography, logo and separators remain. Support, partner access, search and legal links remain direct. All 46 original footer hrefs remain prerendered. The initial city is the first registry entry; no destination or availability claim is invented.

## Verification

`python scripts/verification/redesign-navigation.py` passes 106/106 checks against the running frontend and backend. The original flat-directory baseline is retained in [before evidence](rentra-ui-redesign-phase-3-before.json); the replacement is recorded in [final evidence](rentra-ui-redesign-phase-3.json).

| Width  | Original footer | Replacement | City-switch height change |
| ------ | --------------: | ----------: | ------------------------: |
| 390px  |          2618px |     695.5px |                       0px |
| 768px  |          1523px |       608px |                       0px |
| 1440px |           983px |     544.5px |                       0px |

All ten city selections expose their correct category/intent routes at each primary width. Desktop arrow keys, Home/End and tab order work; mobile native keyboard selection works. City controls are at least 44px high, selected links retain the two-pixel keyboard outline, and hidden panels leave the tab order. Footer axe WCAG 2 A/AA and 2.1 AA checks report zero violations at all three widths.

320/1024/1920px checks confirm no horizontal overflow or city-switch reflow. Long-label DOM stress with 1/30 cities passes; this is layout stress, not a fabricated registry. Public skip-to-main, actual city/search navigation, Saved active navigation and all 20 anonymous customer gates pass. No uncaught browser exceptions were observed. Authentication redirects do not certify protected content.

Local ignored screenshots:

- [Desktop](../.impeccable/redesign/phase-3/footer-1440.png)
- [Tablet](../.impeccable/redesign/phase-3/footer-768.png)
- [Phone](../.impeccable/redesign/phase-3/footer-390.png)
- [Selected desktop/focus](../.impeccable/redesign/phase-3/footer-selected-1440.png)
- [Selected phone/focus](../.impeccable/redesign/phase-3/footer-selected-390.png)

Default and selected captures were visually reviewed together. The independent finish reviewer returned `ship`, with no material fixes, and confirmed that tablet tab wrapping does not recreate the rejected empty space. No automated Impeccable score is claimed; its launcher was unavailable in this session.

Scoped ESLint and Prettier checks pass for the changed source and documentation; Git whitespace checks pass. Production build succeeds with 77/77 generation after two sitemap timeout retries. Existing missing public-contact and sitemap-policy network warnings used their existing fallbacks. These content/API conditions are not certified as successful delivery by the build.

## Remaining scope

Phase 3.1 is the footer gate. The navigation/shared layout review was subsequently completed in [Phase 3.2](rentra-ui-redesign-phase-3-2.md); Phase 4 home discovery is next. Private page states and the full redesign are incomplete. Existing missing public content and sitemap/API latency are outside this footer change. Backend files, dependencies and existing services were preserved.
