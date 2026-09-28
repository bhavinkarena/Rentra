# CP24 — Reference-aware catalogue administration

Status: **COMPLETE — 28 September 2026.** Acceptance: CA16, CA19, CA23; audit gap G23. Configured-database deployment remains pending.

## Delivered

- Admin navigation and `/admin/catalogues`, `/admin/catalogues/:type`, `/admin/catalogues/:type/:id`; `new` opens creation. Supported types: cities, areas, categories and amenities. Lists have search, active/inactive filters, pagination, ordering and listing usage counts. Each page has a colocated loading boundary, explicit forbidden/missing states and retryable outages.
- Separate `admin.catalogues.read` and `.write` capabilities, checked by middleware and the service against an active administrator. Restricted readers receive no editing controls. Customer/client sessions cannot access these APIs.
- Typed creation and edits: labels, active status and display order; city state; amenity translations, group and filterability; approved approximate area centre with latitude/longitude range validation. Area creation requires a valid city; active areas require an active parent. Category form/rental unit and amenity value type are selected at creation and displayed thereafter.
- Case-insensitive, trimmed duplicate labels are rejected within a catalogue (areas within their city); inactive records still reserve labels and slugs. Slugs follow their existing route/filter conventions; application route names are reserved for cities.
- Every save requires a reason and an impact preview. Confirmation recalculates its actor, version, fields, reason and affected references. Concurrent saves allow one winner; changed previews or versions require reload/review. Form values survive refusals.
- Detail and previews show referenced listings, live counts, child areas, incoming redirects and affected discovery paths. Replacement previews include target usage and overlapping listings, and identify incompatible amenity types. They do not silently copy values or move references.
- Unused records can be deactivated/reactivated. Referenced records, redirect targets and cities with child areas cannot be deactivated through this console. Permanent amenity-backed discovery intents are protected even when unused. There is no delete endpoint. Slugs, area city membership, category rental semantics and amenity value types are immutable through edits; changing them requires an explicit, reviewed migration.
- Writes and audit events commit together. Database reference guards prevent a form opened earlier from assigning a newly archived category, city, area or amenity. Existing listing and booking references are preserved.
- Discovery registry, route counts, area options, sitemap area data and owner catalogue readers honor active status and ordering. Successful UI saves expire `discovery-registry` immediately and invalidate the shared Next layout, including listing/discovery pages. Previews and refusals do not invalidate caches.

## API and migration

API root: `/api/v1/admin/catalogues/:type`.

- `GET /`: optional `q`, `status=all|active|inactive`, `page`; 25 rows per page.
- `GET /:id`: details, usage and active replacement choices; `id=new` supplies creation choices.
- `POST /:id`: strict JSON `{ command, version, fields?, replacementId?, reason, preview, previewHash? }`. Commands are `save` and `replace`. Preview returns `canApply`, any migration requirement, impact and a confirmation fingerprint. Only an applicable, unchanged save can be confirmed.

Migration [0035_catalogue_operations.sql](../../rentra-backend/drizzle/0035_catalogue_operations.sql) adds versions to all four catalogues, ordering to cities/areas/categories, area active status, and database guards for new listing/amenity references. Existing rows remain active with order zero and version one. Drizzle schema, snapshot and journal are included.

**0035 was applied only to disposable local test databases. The configured database was neither inspected nor migrated.** Apply the outstanding migrations through 0035 before deploying this backend and frontend together. The existing tracker also records 0033 and 0034 as unapplied; this session did not revisit their deployment state. Use the normal migration command only after target deployment authorization.

## Verification actually completed

- Backend full suite: **131/131 passed, zero skipped**, with explicit local disposable-database URLs. CP24 covers scope, restricted read/write, search, duplicate labels/slugs, immutable structural fields, one-winner concurrency using independent operator previews, stale reference impact, archive and incoming-redirect guards, city membership, coordinate bounds/approval, replacement type effects, audit writes, and preserved booking snapshots/public route resolution. Public search and route-count SQL execute in the gate.
- Frontend unit tests: **36/36 passed**.
- Browser/API gate: **37/37 passed** — all four lists and creation flows, filtered empty state, nonmutating preview, confirmed edit, protected referenced archive, unused archive, replacement planning, permission denial and public discovery rendering after edit. List, preview, area editor and amenity editor passed 1280px/390px overflow and serious/critical WCAG A/AA axe checks.
- API-down gate: **12/12 passed** — list, creation and detail for every catalogue show retryable failure.
- Both repositories: lint and formatting checks passed. Frontend Webpack production build passed. Migration journal/file check: **36 entries**. Whitespace checks passed.
- Evidence: [browser gate](rentra-client-admin-part24-gate.json), [outage gate](rentra-client-admin-part24-outage-gate.json).

## Reproduction

Backend, with an already running disposable local PostgreSQL server:

```sh
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres CP01_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres npm test
npm run lint
npm run format:check
npm run db:check
```

Start the API fixture from `rentra-backend`:

```sh
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres CP06_GATE_FIXTURE=/tmp/cp24-fixture.json FIXTURE_STAGE=published node --import ./loader/register.mjs --env-file=.env test/helpers/serve-property-review.mjs
```

From `Rentra`, start the frontend, then run the gate in another terminal:

```sh
RENTRA_BROWSER_FIXTURE=1 RENTRA_BROWSER_FIXTURE_ID=cp24 NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1 npx next dev --webpack -p 3106
GATE_TOKENS=/tmp/cp24-fixture.json node scripts/portal-gate/cp24_gate.mjs
```

Send `stop` to the fixture's stdin to drop its database, leaving the frontend running, then run `GATE_TOKENS=/tmp/cp24-fixture.json node scripts/portal-gate/cp24_outage_gate.mjs`. Use a fresh fixture for each workflow run. Playwright and Chrome paths can be overridden with `PLAYWRIGHT_MODULE` and `CHROME`. The temporary fixture contains credentials; never commit it.

## Boundaries and handoff

Replacement is a migration-planning preview, not an automatic merge. A migration must explicitly map references, reconcile overlapping amenities/values, review listing content and discovery redirects, and retain accepted booking history. No arbitrary attribute schema, requirement editor, slug rename, hierarchy move or destructive deletion is exposed.

The local test helper falls back to text geometry without PostGIS. Coordinate range and approval validation were tested; a real PostGIS centre write and hosted map rendering were not exercised. Production already requires PostGIS for these geometry columns. No hosted deployment, load test or human screen-reader pass was performed. Catalogue confirmation briefly locks catalogue/reference tables to keep the checked impact stable against concurrent owner writes.

A formatting-only correction to the existing CORS configuration was necessary for the repository lint gate; its allowed origins were not changed.

**Next: CP25 — Public help, content and policy publication.** Roadmap: 24/32 complete. Previous parts were not reopened.
