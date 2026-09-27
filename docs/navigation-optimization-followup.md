# Navigation optimization follow-up

27 September 2026. Code implemented; production verification pending.

## Changes

- Discovery registry requests now use five-minute Next cache revalidation and the
  `discovery-registry` tag. Only public city/area/category/amenity display metadata
  is cached. Search, publication, availability, quotes and payments remain live.
  Backend search still validates filters against current taxonomy. Taxonomy edits
  can take a revalidation cycle to appear; outages can extend stale display data.
  Time-based revalidation is the initial policy, with no taxonomy mutation UI in
  this scope. No listing or private-record persistent cache was introduced.
- Search starts registry and search reads concurrently. Location landing routes
  still resolve their route against registry before searching.
- Shared Link and GET Form wrappers render top progress from native Next pending
  state, preserving link/form props and navigation cancellation. No global click
  interception or guessed completion timers. Existing portal hints remain;
  search, property filters and wizard advancement use their pending states.
  Motion respects reduced-motion preferences.
- Route loaders now render card, table or form skeletons within page content.
  Partner initial query loads use skeletons; refreshes retain existing rows.
- Search prefetches its exact destination on submit-button hover/focus, not on
  every keystroke. No booking mutation is prefetched.
- The 1,530-line partner editor was split into independent client modules for
  basics, location, capacity, amenities, rules, pricing, terms, photos, ownership
  and submission. Shared primitives preserve policy previews, form restoration,
  version fields, review flags and wizard callbacks. `ListingSections.jsx` is
  now a server-compatible re-export module. Bundle savings are not yet measured.
- Backend `/auth/identity` uses the same live `attachUser` session/actor checks as
  `/auth/me` but omits application/document/completion queries and private profile
  fields. Partner cache proxies and focus checks use it. Full `/auth/me` remains
  unchanged for onboarding/layout consumers. Deploy the backend endpoint first.

## Verification

- Scoped frontend ESLint passed for changed/new JS, JSX and MJS files.
- Extracted wizard modules also passed explicit `no-undef` checks.
- Frontend suite: **36 passed**.
- Backend lightweight identity-controller test: **1 passed**, without database
  queries. Cache-scope/CORS unit tests: **2 passed**.
- Backend scoped ESLint and diff whitespace checks passed.
- Production build was **not verified**. Automatic approval review rejected the
  escalated build because the account usage limit was reached. No alternative
  execution bypassed that rejection. Browser and bundle checks remain pending.
  Earlier documents' successful builds/browser checks predate this follow-up.

## Remaining release gates

Run production build, bundle report, anonymous navigation smoke and updated
partner fixture. Verify skeleton layout, progress completion/errors/Back,
modifier-clicks, unsaved-change cancellation and all wizard steps. Compare public
bundles: the feedback wrapper adds a small client boundary to server-rendered
links, so its actual cost must be measured.

Keep `PARTNER_RTK_ENABLED` off until the authenticated-backend checks in
`partner-query-cache.md` pass. The local flag was not enabled. Fixtures alone do
not prove deployed cookie routing, mutation redirects or session revocation.

Operational work remains: real API/database latency measurements, region/pool/SQL
changes based on evidence, mobile p75 metrics and privacy-reviewed telemetry.
Checkout timer/polling isolation and saved-place validation payload reduction
still need profiling and regression tests. Socket.IO remains a separate phase.
No deployment, region migration, production database mutation, new dependency or
secret changes were made.
