# Entertainment Phase 14 — release runbook

Prepared 1 October 2026. Local tooling and migration rehearsal are implemented. Hosted deployment, credential rotation, pilot onboarding and public launch require operator evidence before Phase 14 can be marked complete. Keep changes on `feat/entertainment` until the owner requests a commit.

## Release inspection

From `rentra-backend/`, use the intended target's `DATABASE_URL` through the normal secret configuration:

```sh
npm run release:entertainment -- expand
npm run release:entertainment -- pilot
npm run release:entertainment -- public
```

The command reads a repeatable-read, read-only transaction. It never migrates, seeds or changes a launch switch. It returns JSON and exits nonzero if a gate fails. Preserve that JSON with the release evidence; it contains no connection string or credentials.

All modes check the migration journal through **0055_measurement_vertical**, the entertainment migration checksums, farmhouse public status, the resource-aware exclusion constraint and all eight seeded activities. `expand` requires entertainment hidden; `pilot` requires partners; `public` accepts partners before launch or public after launch and requires **at least six live, bookable Surat venues**. A venue needs hourly semantics, valid weekly hours, inventory enabled, an active resource for its primary activity, and complete weekday/weekend prices for all active offered activities. This is a readiness check; run the customer booking smoke as well.

The report counts hourly bookings and states whether the old backend can safely return. Any hourly booking makes the old backend unsafe. An hourly listing, resource reservation, hourly booking or entertainment document prevents schema rollback. Use the guarded rollback SQL only when the report and the SQL guard both permit it.

## R0/R1 — database and backend

1. Record current frontend/backend revisions and the actual applied migration timestamp. Create a Neon restore branch and a separate rehearsal branch with production data. Rotate the previously exposed database credential and update API/worker secrets. Record rotation evidence without the secret.
2. Run the release from the exact backend revision to be deployed. **`npm run db:migrate` applies every pending journal entry; it cannot stop at 0051.** If production is still at 0039, this release applies **0040–0055**, including measurement. Do not describe that command as a 0040–0051-only run. If R0 must remain separate, use its historical release checkout, then rehearse the entertainment checkout.
3. On the rehearsal branch, run `npm run db:migrate`. Local QA uses disposable localhost databases; hosted branch validation belongs to this release step. Run `npm run smoke` and a farmhouse quote/hold/pay in the gateway's test mode. Confirm the registry exposes farmhouse only and overlap operations report no incidents. Preserve logs and migrated revision.
4. Seed the entertainment catalogue **after migration commit**. The seed guard refuses `NODE_ENV=production`; use an explicitly targeted operator process with `NODE_ENV=development` and `SEED_ALLOW_HOST` equal to the exact database hostname. Set the target URL through the secret environment, then run `npm run seed:entertainment`. Do not run general demo seeds. This catalogue seed is idempotent and preserves vertical status.
5. Run `npm run release:entertainment -- expand` on the rehearsal branch. Resolve every failed check. Review the farmhouse screenshots and smoke evidence.
6. For production: stop the Render worker, run the rehearsed migrations, deploy the backend, restart the worker, run smoke, seed the catalogue, and run the expand inspection. Record worker stop/start times. Monitor farmhouse errors and payment reconciliation during the window.

## R2 — frontend

Deploy the verified frontend revision to Vercel with the production API origin. Keep entertainment hidden. Verify `/`, farmhouse search, listing and checkout, signed-out registry behavior and public cache headers. The frontend supports an older registry without `verticals`; tabs stay absent and `/entertainment` is unavailable. Compare screenshots at 390 and 1440 with the approved farmhouse baseline. Record the deployment URL and revision.

## R3 — pilot

Through the audited admin catalogue preview/save action, set entertainment to `partners`. Run the pilot inspection. Onboard 6–10 Surat venues through wizard, review, video verification and publication. Confirm each venue's hours, prices, primary activity, capacity, photos and documents. Guest discovery and detail routes must remain unavailable. Existing bookings remain manageable after any later switch change.

## R4 — public

Run the public inspection while the switch is still `partners`. Require six fully priced bookable Surat venues, owner review of screenshots and the staging payment journey. Exercise `partners → public → partners → public` on staging through the admin action; verify registry invalidation, tabs, discovery and venue detail visibility in both directions, plus continued management of an existing hourly booking. Record audited actor/reason and timings.

Set production to `public` only after these gates pass. Verify registry, tabs, venue discovery, a real availability/quote/hold path and payment reconciliation. Track `AVAILABILITY_CONFLICT`, `NO_RESOURCE_AVAILABLE`, `PRICE_MISSING`, `TOO_MANY_HOLDS`, exclusion conflicts, `/times` p95, hold-to-capture conversion and refunds by vertical. Avoid any announcement until the owner explicitly instructs it.

## Rollback and R5

For a product issue, use the audited switch to `partners` or `hidden`; existing bookings remain manageable. Verify cache refresh and hidden public routes. If hourly bookings exist, fix the backend by rolling forward. Before hourly bookings, the additive schema permits the prior backend, subject to the release inspection.

Schema rollback is a manual transaction using `rentra-backend/docs/rollback/0052-0054_entertainment.down.sql`; its guard refuses any time-booked data. Migration 0055 measurement is additive and is outside that rollback. A failed migration transaction rolls back its pending SQL; a committed release needs the restore branch or a forward fix. Never edit applied migration files or their recorded checksums.

R5 is deferred for at least two weeks: remove `resource_key` and its CHECK term only after all readers/monitors have stopped using it and a separately reviewed contract migration is ready.

## Evidence still required

| Gate | Current evidence |
|---|---|
| Local real-migrator rehearsal | Disposable PostgreSQL integration test; see Phase 13 record |
| Hosted restore/rehearsal branch and production migration | Pending operator execution |
| Exposed credential rotation | Pending operator confirmation |
| Render API/worker deployment and smoke | Pending operator execution |
| Vercel deployment and farmhouse comparison | Pending operator execution |
| 6–10 verified pilot venues, six bookable Surat venues | Pending onboarding |
| Staging switch both ways and gateway test-mode payment | Pending staging execution |
| Owner screenshot review | Pending owner review |
| Public launch / post-launch monitoring / R5 | Pending release gates |

No hosted migration, deployment, secret rotation or launch is claimed by this local implementation.
