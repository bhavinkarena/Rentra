# Frontend performance implementation

Date: 27 September 2026

Status: First implementation pass complete. This is not a claim that every item in the [original audit](../../FRONTEND_PERFORMANCE_AUDIT.md) is fixed. The highest-impact shared-provider, full-reload, bundle, and waterfall changes are implemented. Deeper component splitting, deployment measurement, and cache invalidation remain follow-up work.

## Measured result

Production builds completed successfully with Next.js 16.3.4. Estimated cold-route JavaScript, gzip per emitted chunk:

| Route | Before (KiB) | After (KiB) | Reduction |
| --- | ---: | ---: | ---: |
| `/` | 269.6 | 236.1 | 12.4% |
| `/search` | 270.8 | 238.7 | 11.9% |
| `/listing/[handle]` | 323.6 | 291.6 | 9.9% |
| `/help` | 261.8 | 231.6 | 11.6% |
| `/partner` | 267.0 | 147.9 | 44.6% |
| `/admin` | 266.3 | 148.1 | 44.4% |
| `/partner/listings/[id]/setup/[step]` | 288.9 | 169.9 | 41.2% |
| `/checkout/[orderId]` | 285.8 | 254.0 | 11.1% |
| `/_not-found` | 250.6 | 131.4 | 47.6% |

Method: the pre-change production artifact was captured in [performance-baseline.json](performance-baseline.json). Both measurements sum each route's emitted first-load JavaScript chunks and gzip them using Node's default compression. A KiB is 1024 bytes. These are **bundle estimates, not measured click latency, Core Web Vitals, or actual HTTP transfer sizes**. Warm navigation reuses shared chunks.

Run `npm run build`, then `npm run perf:bundles -- --check` from the frontend. The check flags routes exceeding the original baseline by more than 2%, and new routes needing review. This initial guard prevents backsliding past the original audit, not every regression against today's smaller bundles.

## Implemented changes

### 1. Scope providers to customer-facing layouts — C1, C2

- Removed the provider boundary from `app/layout.js`.
- Mounted the slim provider only in `app/(marketing)/layout.js` and `app/(customer)/layout.js`.
- Partner, admin, staff, login and not-found routes no longer mount the customer saved-place effect.
- Removed Redux/RTK Query and the global toaster from `components/providers.jsx`.
- Replaced share toasts with local, accessible live-status feedback in `ShareButton.jsx`.
- Redux libraries/services remain installed for existing service tests and unused legacy components; removing package dependencies is a separate cleanup, not needed to keep them out of these route bundles.

Crossing between marketing and authenticated customer layout groups remounts customer state and performs a fresh identity check. Navigation within either shared layout reuses it.

### 2. Stop pathname-driven saved-place reloads — C1, H5

`components/customer/SavedPlacesProvider.jsx` now:

- Keeps the refresh callback independent of pathname and no longer clears entries on every route transition.
- Memoizes its context value and mutation callbacks.
- Coalesces focus/visibility refresh scheduling.
- Does not announce its initial scope to every other tab, avoiding unnecessary initial cross-tab refreshes.
- Skips the guest-metadata Server Action when there are no eligible guest saves.
- Retains live refreshes on focus, visibility, storage, account/profile events and explicit retry.
- Retains generation guards, optimistic rollback, merge-owner checks, account scope validation and hidden-tab clearing.

This does **not** persist customer account data into localStorage or introduce a time-based identity cache.

### 3. Remove active search Redux subscriptions — C2, M3

- `SearchBar.jsx` owns its form drafts locally and uses a navigation transition with an immediate “Searching…” button state.
- The submitted URL remains the destination's search source of truth.
- `SaveButton.jsx` uses the card's supplied selection or the listing's booking context instead of subscribing every heart to the search store.
- Removed the unused Redux booking-selection hook from `listing/booking-state.js`; date utilities remain.
- Added the lightweight `listing/booking-context.js`, so card hearts do not import the quote provider's actions and effects.

Search drafts no longer persist globally when the search form is unmounted. Committed criteria travel through URLs/card selection, rather than a second global state copy.

### 4. Replace native search/filter reloads — H1

Converted 14 GET forms to `next/form`:

- Discovery filters and help search.
- Admin shell search, clients, customers, application queue, booking history, booking cases, support, payment investigation, refund operations and property review.
- Customer/partner booking and support record filters.

The existing field names, action URLs, progressive enhancement and native form submission semantics remain. Mutation/Server Action forms were not mechanically converted.

`DiscoveryResults.jsx` already keys its filters by query, which is important now that filter navigation preserves the document. Browser checks cover clearing filters and Back restoration.

### 5. Request-local authentication reuse — C4

`lib/api/session.js` now has one React-cached raw `authApi.me()` loader shared by the user, completion and protected-route readers.

This is **request/render scoped**, not cross-user persistent caching. Protected guards still throw API outages; optional user readers retain their existing tolerant behavior. Existing role, blocked-account and redirect checks remain intact.

Next fetch memoization may already deduplicate identical GET calls in some renders; this change makes the shared dependency explicit without claiming a fixed number of saved network requests.

### 6. Remove independent-request waterfalls — H2

- Partner dashboard starts application (only when needed), summary, tasks and updates together after authorization/completion.
- Approved partners no longer fetch the unrendered onboarding application.
- Customer login checks the separate customer/partner and admin identities concurrently.
- Wizard pages start the authorized listing request and the current step's reference catalogue concurrently; reference failures render a proper failure state.

No tenant-scoped listing data is rendered before authorization. No unneeded catalogues are fetched for other steps.

### 7. Stream nonessential layout data — H3

- Marketing footer registry work moved inside a separate async component and Suspense boundary.
- Partner unread-update counts and admin application counts stream inside Suspense after session/capability checks.
- Badge failures/zero counts stay hidden; pending navigation feedback no longer disappears merely because a badge is present.
- The shell and primary page no longer await footer/badge reads in their layout functions.

Shared layouts are ordinarily reused by App Router navigation already; this chiefly improves cold entry, cross-layout transitions and refreshes. It is not a claim that layouts previously remounted on every link click.

### 8. Remove one redundant backend lookup — C4, M6

In `../rentra-backend/src/controllers/auth.controller.js`, `/auth/me` reuses the application ID it just loaded when reading application documents. Previously `listApplicationDocuments(user.id)` queried that ID again.

Session validation, revocation checks, completion calculation and response shape are unchanged. No migrations or database writes were run for this implementation.

### 9. Add repeatable verification — L5 (partial)

- `scripts/performance/bundles.mjs`: route bundle comparison and baseline guard.
- `test/performance/bundles.test.js`: deduplication and comparison tests.
- `scripts/performance/navigation-smoke.py`: read-only, anonymous production-browser checks.

This does not add a production RUM collector or transmit user telemetry.

## Verification evidence

| Check | Result |
| --- | --- |
| Frontend `npm test` | Passed: 25 tests, including 2 new bundle-report tests |
| Frontend `npm run build` | Passed after the final application changes |
| ESLint on all changed JS/JSX/MJS and new JS modules | Passed |
| Backend controller ESLint | Passed |
| Frontend/backend `git diff --check` | Passed |
| Production Chrome navigation smoke | Passed: 6 checks |
| Whole-project `npm run lint` | Failed: 27,956 existing/workspace-wide problems, predominantly CRLF/Prettier errors in untouched files and temporary tooling |

The six browser checks verify help GET submission without a new document, no saved-state action on pathname navigation, discovery GET submission without a new document, clear/Back filter restoration, no customer saved action on partner entry, and no browser runtime/hydration errors during these journeys.

The initial sandboxed browser run encountered blocked API requests; it was repeated successfully with the local production server allowed to access its configured API. This remains an anonymous navigation smoke test, not an authenticated end-to-end booking/payment test or a production load test.

Run the browser checks against the **production** server, not `next dev`:

```powershell
# Terminal 1, from Rentra/
npm run build
npm run start -- --port 3119

# Terminal 2, from Rentra/
python scripts/performance/navigation-smoke.py
npm test
npm run perf:bundles -- --check
```

Python Playwright and Chrome must be installed. `PERF_WEB_URL` and `CHROME` can override defaults. The script creates a fresh anonymous context and does not seed databases, log in or mutate account records.

## Deliberate safety decisions / audit corrections

1. **Do not blindly remove listing `connection()` or force ISR.** Current publication visibility and canonical-handle behavior depend on live reads. Paused/rejected properties must not remain visible from a stale persistent cache. Design backend-to-frontend invalidation before changing this.
2. **Do not globally cache authentication, booking quotes, holds, availability, payments or protected records.** Request-local reuse is appropriate; cross-request reuse requires explicit contracts.
3. **Do not assume all `no-store` is a defect.** Much of this is operational/financial state. Stable reference-data caching can be assessed separately.
4. **Do not indiscriminately replace logout/payment/document navigation.** Hard navigation and private download routes can be intentional.
5. **Do not treat all client components or all root providers as inherently wrong.** The shipped dependency graph and effect work are the problem; server-rendered children remain server components.
6. **Do not claim the map still eagerly downloads Leaflet.** It already uses an intersection-triggered deferred import.
7. **Do not attribute all the original shared chunk to Redux.** It also contained customer saved-state/validation dependencies; production measurements report total route effects.
8. The existing loader's transparent, non-intercepting presentation should be inspected before calling it a blocking full-screen overlay.

## Remaining work, in priority order

1. **Authenticated regression gate before release.** Test guest save/undo, merge on login, customer logout/account switch in two tabs, suspension/revocation, partner completion states, streamed zero/error badges, wizard errors and payment flows against disposable fixtures. The current smoke test does not cover these.
2. **Measure actual latency.** Capture cold/warm clicks with mobile CPU/network throttling, React Profiler, backend timings and p75 INP/LCP/CLS. Bundle savings alone do not establish an “instant” navigation SLA.
3. **Split large client modules.** Separate wizard sections from `ListingSections.jsx`; lazy-load genuinely optional dialogs/charts. Isolate checkout timer/polling renders. Preserve draft recovery, policy previews and unsaved-change guards during extraction.
4. **Reduce public-route validation payload.** Public pages still carry substantial saved-place/schema code. Profile and separate lightweight client parsing from server-authoritative validation without weakening validation or merge safety.
5. **Define persistent-cache invalidation.** Start with stable taxonomy/reference data, then assess listing/help/policy strategies individually. Test immediate publication removal, policy versions and slug redirects.
6. **Reduce read-like Server Actions and duplicate browser identity reads where safe.** Use abortable GET reads or pass server identity only when consistent with the same session freshness/privacy guarantees; do not merely skip authorization.
7. **Tune deployment/backend bottlenecks from evidence.** Same-region API/database placement, safe request deadlines, pool saturation, expensive search/count SQL and endpoint timing remain outside the measured browser work here.
8. **Production telemetry and tighter budgets.** Add privacy-reviewed RUM ingestion and per-route budgets based on the new build. Normalize repository line endings separately so whole-project CI becomes actionable.

No deployment, dependency upgrade, migration, production cache change or bulk formatting cleanup was performed.
