# Hotel landing: shared UI and themed discovery

The reference is the existing farmhouse landing page. Hotels reuse its actual
`HeroPhotos`, `homeHero` sizing, overlapping `TrustStrip`, `OccasionPicker` and
`CityRow` components. The separate hotel stylesheet has been removed. Hotel
photography, room search, trust copy and stay stories remain specific to hotels.
The city links and owner call to action also follow the farmhouse layout.

## Discovery rows

City-specific rails have been replaced by collections using the existing hotel
search API, across all live destinations. Each row has a matching View all link:

- Recommended stays: the API's recommended ordering.
- Top-rated stays: rating order, at least 8/10 and a nonzero guest review count.
- Poolside escape: the swimming-pool amenity.
- Stays under ₹2,000: maximum from rate ₹2,000, ordered by price.
- Couple-friendly stays: the hotel's couples policy.
- Breakfast stays: rates including breakfast.

Up to eight cards appear per row. Optional rows require at least two matching
properties; the main recommended row can show a single property. Empty or failed
collections are omitted without substituting unrelated properties. No popularity,
review or booking statistics are fabricated. No draft catalogue hotel is published.

With current live data, four sliders render: Recommended, Budget, Couples and
Breakfast, each with eight cards. Poolside and Top-rated will appear when enough
matching reviewed/live inventory exists. A property may legitimately match more
than one collection. From rates are separate from authoritative dated totals.

## Verification

- Focused ESLint, Prettier and `git diff --check` passed.
- Ten discovery and vertical UI regression tests passed.
- An isolated production build passed. Existing sitemap policy API network
  fallbacks were reported during generation; they did not fail the build.
- Chrome checks passed at 1440, 768 and 390px: identical farmhouse/hotel hero,
  headline, trust-card, tab and panel classes; four nonempty collection sliders;
  collection links without city restrictions; four distinct stay photos/copy;
  keyboard navigation; city selection persistence; and no page overflow or
  browser runtime errors. Slider arrows were exercised on desktop and tablet.
- The farmhouse occasion control was also exercised to verify its existing
  intent link after sharing the component. Reduced motion was enabled.
- Impeccable's changed-file detector returned an empty findings list.

Local evidence: `.taste-skill/hotel-sync.json`, `check-hotel-sync.mjs`,
`sync-fold-{width}.png` and `sync-{width}.png`. Screenshots were visually reviewed.
The earlier standalone hotel art direction has been superseded by the user's
explicit requirement to match the farmhouse UI. No new direction was drawn.

## Photography and remaining limits

The hero and stay picker retain the selected real photos from the existing hotel
catalogue, with property/source credits. Source URLs and rights status remain in
`components/rentra/hotels/inspiration.json`. Reuse rights are still unconfirmed.
Existing discovery-card photos remain API-owned, including legacy demo photos;
this frontend change does not alter listing data. Full booking/checkout and a
whole-site visual audit were not rerun.
