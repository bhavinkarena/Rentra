# CP31 — Accessibility, performance and operator handoff

Status: **COMPLETE — 28 September 2026.** Independent production accessibility/performance/handoff gate **367/367** passed across **32 routes and 64 route/viewport measurements**, with no axe findings in the configured rule sets. Frontend **36/36**, backend **143/143**, production Webpack build, lint/format and the 41-file migration/journal check passed. Progress: **31/32**, next **CP32**. CP30 customer continuation passed and hosted CA24 was waived by the user; hosted readiness remains unverified, and this part does not certify or enable Live finance.

## Changes

- Added first-in-order **Skip to main content** links to the shared admin/owner shell and a focusable, named main target that clears the sticky header.
- The native mobile navigation dialog releases its modal state when the viewport becomes desktop-sized. Escape/trigger focus behavior stays native. Drawer scrolling is contained and transitions name their properties; reduced-motion settings are respected.
- Added visible labels and error associations to approval, correction and rejection reasons. Correction/rejection server validation now focuses the shared summary, links to invalid fields and keeps the entered value.
- The admin booking table's scroll wrapper establishes the containing block for its absolutely positioned hidden header label. This fixes the measured resize-dependent mobile overflow. The wrapper is a named keyboard-focusable region.
- Added named keyboard-focusable scroll regions to the operations payment/measurement tables; fixed low-contrast booking filter counts by removing inherited count opacity.
- Added authenticated, permission-aware `/admin/help` and `/partner/help` guides with sidebar navigation. They cover review/publication, visit evidence, case resolution, refund uncertainty, privacy scope/retention, audit exports and operational recovery. Read-only guidance does not grant write permissions; existing API guards remain authoritative.
- Added a bounded `delay` mode to the local gate fault proxy so production loading states can be measured without changing application behavior.

## Scope and evidence

The production gate exercises 32 distinct admin/owner routes at 1280×950 and 360×950 pixels, including populated lists, record detail, account/property review, simulated Test payment/refund detail, finance, support, privacy, audit, operator security, content, incidents, calendar and both guides. It measures successful meaningful render, document overflow, serious/critical WCAG 2 A/AA and 2.1 AA axe findings, accessibility-tree landmarks/headings and local readiness. It also exercises keyboard skip links, drawer entry/background exclusion/Escape/focus restoration/desktop resize, expanded decision labels/contrast, focused server errors/input retention, financial-table keyboard scrolling, limited-operator guide filtering and a deliberately slow loading status.

The lab seed contains **1,002 clients, 1,005 orders, 1,007 visits and 5,008 audit events** at seed completion. Browser/API reads append further audit events. The 5,000 `cp31_fixture_event` rows remain a stable filtered pagination dataset. Historical fixture visits are not labelled as real completed visits and create no provider payments or Live allocations.

[Production accessibility and performance evidence](rentra-client-admin-part31-gate.json) records route/viewport results, violation selectors, timings, API sample distributions, payload sizes and bounded page metadata. [Operator runbook](rentra-operator-runbook.md) gives the shift, approval, booking, refund, privacy, export and recovery procedures. [Source fingerprints and check summary](rentra-client-admin-part31-regression.json) pin the local tested source; these are not hosted deployment revisions.

## Performance protocol

Production Next.js 16.3.4/Webpack, local Express through a transparent proxy and disposable PostgreSQL 14 on the same Mac; no CPU/network throttling or remote provider latency. The browser runs headless installed Chrome with reduced motion. Each route/viewport navigation is measured through `networkidle`; the operational form interaction separately waits for the rendered DOM rather than treating background prefetch as readiness.

Seven authorized API endpoints cover client pages 1/40, booking pages 1/50, filtered audit page 100, client detail and owner booking detail. Each has one excluded warm-up followed by 12 sequential full-response samples. p95 is the nearest-rank 95th percentile of those 12 samples. This is a local regression budget, not a production SLA or saturation benchmark. Budgets: API p95 below 1,000ms; route/viewport ready below 4,000ms. Lists must be populated, bounded to 20 client/booking or 25 audit rows, and report authoritative page metadata. No speculative database index or virtualization change is introduced when these bounded reads pass.

Observed API p95: **3.15–12.72ms**. Slowest route/viewport readiness: **1,183ms**. All normal route and API lab budgets passed; the deliberate two-second loading delay is a separate functional check, not a normal latency sample.

| Authorized read | p95 | Response bytes | Rows / matching total |
| --- | --- | --- | --- |
| Clients page 1 | 3.89ms | 6,987 | 20 / 1,002 |
| Clients page 40 | 3.53ms | 6,982 | 20 / 1,002 |
| Admin past bookings page 1 | 7.54ms | 8,112 | 20 / 1,000 |
| Owner past bookings page 50 | 12.72ms | 8,112 | 20 / 1,000 |
| Filtered audit page 100 | 5.73ms | 12,507 | 25 / 5,000 |
| Client detail | 3.15ms | 3,746 | One scoped detail |
| Owner booking detail | 3.63ms | 1,904 | One scoped detail |

## Accessibility boundaries

Resolved guideline findings:

- `components/portal/PortalShell.jsx:277` — missing keyboard bypass; added the first skip link and main focus target.
- `components/portal/NavDrawer.jsx:25` — desktop resize left a hidden modal open; release modal state at the desktop breakpoint and contain drawer scrolling.
- `components/admin/DecisionPanel.jsx:31` — action-form refusal cleared the draft; retain reasons/selected correction fields and prevent the native reset of that correction form.
- `components/admin/DecisionPanel.jsx:155` — unnamed correction reason and unlinked errors; visible labels, field associations and focused error summary now pass.
- `components/admin/AdminBookingHistory.jsx:173` — hidden header label escaped its scroll container; relative positioning and a named focusable region fix overflow and keyboard access.
- `app/(admin)/admin/operations/page.js:179` — payment table region could not receive keyboard focus; named focusable scroll region now scrolls with arrow keys.
- `components/customer/BookingHistory.jsx:77` — small booking counts failed contrast on the active filter; removed count opacity.

Review guidance: [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), fetched 28 September 2026; framework behavior checked against the installed Next.js accessibility, loading and error-boundary guides. Runtime results below remain the verification evidence.

Chromium's accessibility tree verifies exposed landmarks/headings, and axe covers the configured rule sets including labels and contrast. Keyboard interactions verify actual focus, error-summary navigation, table scrolling and the native modal's exclusion of background controls. Native browser chrome may receive focus at a tab boundary; it is not a background application control. The application honors reduced motion; global transitions reduce to at most 0.01ms.

**No human VoiceOver/NVDA speech-output or exhaustive WCAG conformance pass is claimed.** No hosted/mobile-device hardware or field Core Web Vitals measurement ran. Only the recorded routes, states, desktop/mobile sizes and data volume are measured; CP30 has now measured the named customer continuation; hosted provider acceptance remains waived / unverified CA24. The gate records these boundaries rather than substituting fixture success for release acceptance.

## Reproduce

Use only disposable localhost PostgreSQL. Start `serve-property-review.mjs` with `FIXTURE_STAGE=published`, `CP06_GATE_FIXTURE=/private/tmp/rentra-cp31-fixture.json`, `PORTAL_TEST_DATABASE_URL=postgres://bhavinkarena@127.0.0.1:55433/postgres`, `CORS_ALLOWED_ORIGINS=http://localhost:3106` and the port-remap preload. Configure `FAKE_RAZORPAY_STATE` and fixture-only `RAZORPAY_TEST_*` values; use the same values for `seed-payment-investigation-gate.mjs`. The test-only fetcher must be enabled so no provider is called.

Run, in order, `seed-pricing-operations-gate.mjs`, `seed-payment-investigation-gate.mjs`, then `seed-operator-quality-gate.mjs` from the backend with its alias loader. Start `scripts/portal-gate/fault-proxy.mjs` from the frontend. Build/start Next with `RENTRA_BROWSER_FIXTURE=1`, `RENTRA_BROWSER_FIXTURE_ID=cp31`, `NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1`, `NEXT_PUBLIC_SITE_URL=http://localhost:3106`, Webpack and port 3106. Then:

```sh
GATE_TOKENS=/private/tmp/rentra-cp31-fixture.json node scripts/portal-gate/cp31_gate.mjs
```

The volume seed requires a fresh fixture. The gate submits only a deliberately invalid decision; it never approves an application, dispatches a refund or fulfills privacy. Provider records are simulated seed evidence only. Send `stop` to the fixture API to drop its owned database, stop Next/proxy/PostgreSQL, and remove the fixture token/provider files. Do not commit either temporary file.

## Schema, deployment and release

No new migration, API business command or backend production service change. The backend addition is the disposable volume helper. All 41 migrations are applied only to owned test databases; the configured database is neither inspected nor migrated. Existing recorded pending migration/deployment work is unchanged.

CP31 can deliver its independent UI/performance/handoff checks while CP30 waits for external input. **R2 implementation is closed with the explicit CP30 hosted-test waiver; actual hosted Test readiness remains unverified.** CP32 Live activation additionally needs its own business/provider/configuration, destination and reconciliation evidence.
