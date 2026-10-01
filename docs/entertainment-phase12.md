# Entertainment Phase 12 — local performance handoff

Implemented 1 October 2026. Phase complete locally; see the implementation record in [the plan](ENTERTAINMENT-PLAN.md). No migration is required. All work is uncommitted.

## Reproduce

Use a disposable local PostgreSQL server. The helper rejects non-local database URLs and creates/drops its own database. Never substitute the hosted application URL.

From `rentra-backend/`:

```sh
DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres npm test
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres node --import ./loader/register.mjs scripts/performance/entertainment.mjs
```

The performance gate mounts the real discovery router on an ephemeral localhost port. It warms the time endpoint, runs 50 simultaneous HTTP reads and five actual test holds, then runs 20 quote creations alongside another hold. It asserts p95 <150 ms, successful responses, no-store, identical quote hashes and the GiST query plan. Its payment credentials are inert local fixtures; no payment-provider request is sent. It also records 50 sequential farmhouse quote+hold samples. It always closes the listener and drops its disposable database.

From `Rentra/`:

```sh
npm test
RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4119/api/v1 npm run build
RENTRA_BUILD_FIXTURE=1 node scripts/performance/bundles.mjs
```

An unavailable local API exercises the existing static-page fallback. This verifies compilation/static route classification, not live catalogue content. The old repository-wide bundle baseline predates entertainment; do not overwrite it or interpret unrelated aggregate changes as picker size.

## Evidence

- `../rentra-backend/docs/entertainment-performance.json`: current HTTP timings, farmhouse samples and complete EXPLAIN ANALYZE JSON.
- `../rentra-backend/docs/entertainment-performance-baseline.json`: identical benchmark script run against an isolated source copy of pre-change backend commit `dc35a4e`.
- [Picker bundle comparison](entertainment-phase12-bundles.json): same build environment with direct imports before and lazy imports after. Final source and production build both use the lazy wrapper.
- `../rentra-backend/test/integration/entertainment-performance.integration.test.js`: grid equality, cross-venue isolation, blocked-writer read, hidden-vertical rejection, and 60 seeded randomized overnight farmhouse window comparisons.

The final local HTTP p95 passed at 74.66 ms. The listing route decreased by 673 gzip bytes. Backend regressions: 166 passed, three pre-existing optional suites skipped. Frontend: 55 passed. No hosted data or launch switch was changed.

## Farmhouse baseline comparison

The historical baseline contains bundles, not checkout timings. The same current benchmark harness was run against an isolated copy of backend commit `dc35a4e`, then the current source, in alternating order for three pairs. Each run has 50 sequential farmhouse quote+hold operations with distinct customers and dates. The comparison covers 150 observations per version, including growing active inventory.

`../rentra-backend/docs/entertainment-farmhouse-comparison.json` preserves the method and both raw distributions. Median: **3.05 ms before / 3.03 ms after**. Nearest-rank p95: **6.29 / 6.33 ms**. Median did not regress; the 0.04 ms p95 difference is below useful precision for this local smoke benchmark. Do not interpret the samples as a production latency SLO or claim every percentile improved.

To repeat the comparison, copy the benchmark harness into an isolated source checkout of the baseline commit, install/use the same dependencies, and run the local-only command above in alternating baseline/current order three times, preserving each output before the next run. Compare pooled medians and p95 as well as individual runs. The original bundle baseline remains unchanged.

Phase 13 is next. No launch or migration gate is implied by this local performance completion.
