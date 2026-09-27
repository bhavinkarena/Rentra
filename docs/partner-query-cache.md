# Partner query cache rollout — 27 September 2026

This change implements the first shippable RTK Query stage of the workspace's
`RTK_QUERY_AND_REALTIME_IMPLEMENTATION_PLAN.md`. It does **not** implement or enable
Socket.IO, publication/outbox workers, live unread badges, or other portal caches.
Phase D is partially verified; production authentication/deployment checks remain
before proceeding to the socket stage required by the plan.

## Enable and roll back

1. Deploy the matching backend change. `/auth/me` now returns `user.cacheScope`, a
   non-credential hash of the verified session generation, actor, live account
   status and sorted capabilities. Legacy sessions without a generation keep the
   existing server-rendered screens.
2. Configure backend `CORS_ALLOWED_ORIGINS` with the exact frontend origins,
   comma separated. Development defaults allow localhost and 127.0.0.1 on port
   3000; production has no implicit browser origin. Requests with no Origin,
   including server-to-server calls and signed webhooks, remain supported.
3. Set `PARTNER_RTK_ENABLED=true` in the **frontend** environment and restart the
   Next server. The flag defaults off. Backend secrets and cookies stay server-side.
4. Set it to `false` and restart to restore the original server read path. Each
   request executes either the server reader or the client reader, never both.

No database migration, new dependency, real account mutation, or environment
secret change is required by this stage. The actual deployed cookie/domain/HTTPS
configuration still needs testing; it was not modified here.

## Implemented behavior

- The root layout is unchanged. An active client gets a store scoped to the
  persistent partner layout. No customer/admin service is imported by it.
- Listings and summary start together; bookings use the existing records API.
  Current-argument data prevents one filter's results appearing under another.
  Listings retain unused entries for 300 seconds, booking lists for 120 seconds;
  mount refresh ages are 30 and 15 seconds, respectively.
- Loading and failures stay inside the content panel. Refresh retains rows with
  an updating or stale/retry notice. Authorization failures hide private rows.
- Search submits URL state, clear resets it, and Back/Forward restore filters.
  Filters are normalized before the hook and input state resets when committed
  URL arguments change. Unsubmitted input survives identity verification.
- Read-only, allowlisted `/api/partner-cache/*` routes forward HttpOnly cookies
  from Next to the backend, validate the page's identity scope, and use no-store
  responses. This avoids assuming the cookie is also available on the API host.
- Initial mount, focus, visibility return and reconnect verify live identity
  before exposing private cache data. A visible-tab 60-second check reconciles
  data and detects missed revocations. Outages hide data and offer retry without
  treating an unavailable identity service as a logout.
- Logout/login/switch actions send non-secret `changing` and `changed` signals
  through BroadcastChannel and a storage fallback. Changing immediately hides
  UI, aborts pending work and disposes the store; completion reloads other tabs.
  A page guard observing a different account also refuses the reused layout's
  cache. Late responses cannot populate a replacement store.
- Server Actions set an HttpOnly, non-secret revision marker after successful
  responses with relevant revalidation paths. Next's layout rerender delivers
  it to a client invalidation bridge, including redirecting actions. Tag mapping
  covers lists, counts and calendars. Other tabs reconcile revision changes on
  focus or the periodic check; they may miss intermediate markers, so that check
  invalidates all partner domains.
- RTK writes invalidate only on success. HTTP/domain validation envelopes stay
  intact. Redirect-only reads become errors; only explicit internal destinations
  can be replayed. Even a non-JSON 401/403 hides data. Reads have bounded timeouts
  and at most one transient retry; writes are not replayed automatically.
- CORS now rejects unapproved origins before handlers execute. Cookie-bearing
  cross-site writes without Origin are rejected using Fetch Metadata. New browser
  writes were not introduced; existing Next Server Actions remain authoritative.

## Verification recorded

- Frontend production build passed, including the browser-safe booking extraction.
- Frontend unit suite: 34 passed, including cache reuse, isolated arguments,
  non-JSON authorization errors, mutation invalidation, query normalization,
  path/tag mapping and late-response disposal.
- Backend suite: 106 passed, 23 database-dependent tests skipped, no failures.
  Updated integration tests verify that untrusted CORS requests are rejected.
- Changed frontend/backend files passed scoped ESLint. The new backend helper was
  explicitly checked despite the repository's service-layer lint exclusion.
- `npm run perf:bundles` passed against the repository's pre-audit baseline.
  This is a baseline comparison, not a production latency measurement.
- Production browser fixture: listings → bookings → listings used one listings
  API request. Warm return was 54 ms in one local headless-Chrome run. Search,
  clear, Back, focus input preservation, failed refresh with retained data,
  cross-tab account replacement and revoked-session handling passed without
  browser runtime errors.

The browser fixture uses an in-memory API and synthetic accounts. It exercises
React, RTK, Next server guards and the actual same-origin proxy, but does not
prove database authorization, production cookie configuration, or real-user
performance. No production database was seeded or mutated.

To repeat the browser check (requires Playwright and Chrome):

```sh
RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4119/api/v1 npm run build
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/verification/partner-cache.mjs
```

It uses ports 4119 and 3119 and a separate `.next/verification-build` directory.
`CHROME` can override the executable location. The fixture cleans up its servers
and browser in a finally block. Do not use these synthetic accounts against a
real backend.

## Remaining gates

Before enabling production caching: verify real Server Action saves and redirects
against a disposable authenticated backend, same-user re-login, capability changes,
slow old requests, browser reconnect, retention expiry, and actual cookie routing.
Measure representative-device navigation and API counts. Time-based retention and
submit-only queries bound normal usage, but an explicit count-based LRU limit has
not been added for pathological filter churn.

Then implement the plan's socket phase: capability-scoped authenticated delivery,
post-commit events from HTTP/webhook/jobs, event schema and batching, live update
badge, independent socket flag, reconnect reconciliation, deployment adapters and
multi-node/revocation tests. That phase remains intentionally unstarted because
the plan makes these authenticated caching gates a prerequisite.
