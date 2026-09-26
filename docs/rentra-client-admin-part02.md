# CP02 — Shared list, detail and form behavior

Status: **COMPLETE — 26 September 2026.** Browser gate passed 35/35 against a disposable local stack. No schema, API or backend change.

## 1. Scope and revisions

- Linked IDs: CP02; acceptance CA21–22; gaps G15 (partner reviews discoverability) and G28 (API outage shown as a missing property).
- Baseline: frontend `d8b77b3`, backend `318e008` (CP01 committed). CP02 changes are uncommitted frontend working-tree changes only.
- Delivered: shared page-state handling, breadcrumbs with return-to-list context, deep-linkable detail sections, a focused validation summary with preserved input, an unsaved-changes guard, an accessible native-dialog navigation drawer, and capability-driven navigation grouped by the plan.
- Applied to representative flows: client property list → property editor → booking calendar, and the listing walkthrough; admin support list → support detail, and admin application review. Other pages keep their current look (the part did not restyle every page).

## 2. Behavior and components

### Shared pieces

| Piece | File | Behavior |
| --- | --- | --- |
| Failure classification | `lib/domain/portal-state.js` → `failureKind` | 404/400/422 = not found; 403 = forbidden; network, 5xx, 409 and unknown = unavailable. An outage never becomes an empty list or a 404 |
| Page loader | `lib/api/page-state.js` → `settle(request)` | Returns `{ data }`, calls `notFound()` for a definite missing record, or returns `{ failure }`. Redirects and non-API errors propagate |
| State view | `components/portal/PortalState.jsx` | `unavailable` (announced with `role="alert"`, **Try again**), `forbidden`, `not_found`; optional back link |
| Retry | `components/portal/RetryButton.jsx` | `router.refresh()` in a transition. The URL is unchanged, so filters, page and tab survive |
| Route fallbacks | `app/(partner)/partner/{error,not-found}.js`, `app/(admin)/admin/{error,not-found}.js` | Unexpected errors below the shell show the unavailable state with retry; the shell stays |
| Breadcrumbs | `components/portal/Breadcrumbs.jsx` | Full trail on ≥640px; a single "← parent" link on phones. `aria-current="page"` on the last item. `AdminPageHeader` accepts `breadcrumbs` |
| Return context | `safeReturnPath(value, prefix)` | List rows add `?from=<filtered list URL>`; the detail breadcrumb returns there. Only relative paths under the same list prefix are accepted (no open redirect) |
| Validation summary | `components/portal/ValidationSummary.jsx` | Lists server field errors, receives focus, each entry focuses its field by `name` |
| Unsaved changes | `components/portal/UnsavedChangesGuard.jsx` | A form becomes dirty on input and clean on submit; a failed save re-marks it. Warns on reload/close and on in-app link clicks |
| Navigation drawer | `components/portal/NavDrawer.jsx` | Native modal `<dialog>`: background inert, Escape closes, focus returns to the menu button |

### Fixes found while applying them

- **Silent save failures:** listing sections showed only `errors._`, so network, conflict and permission failures displayed nothing. The shared `Section` now shows any non-validation `error` with "Your changes are still in the form — try saving again."
- **Lost input:** React 19 resets an uncontrolled `<form action>` after every action, including one that returned an error. `Section` now restores the submitted values after a failed save (text, select, checkbox, radio; file inputs excluded).
- **False not-found (G28):** property editor, booking calendar, both walkthrough entry pages and admin application review used `.catch(() => null)` + `notFound()`. They now use `settle`.
- Ambiguous row links ("Manage", "Open →") now include the property name or request reference for screen readers. Wide tables are keyboard-focusable scroll regions.
- Contrast fixes found by axe: sidebar group labels, sidebar help text, mobile card labels, disabled pager text and the photo "Cover" badge.

### Navigation

- **Client:** Workspace — Overview, Properties, Bookings, **Reviews** (new; the route already existed, G15); Account — Settings & payouts. Restricted items state the required step in visible text ("After your partner profile is approved"), not only in a hover title. Each item declares its capability.
- **Admin:** Work queues — Applications; Operations — Bookings, Support inbox, Reviews; Finance — **Gateway settings** (the stable `/admin/payments` bookmark, renamed from "Payments" because it is not payment investigation; CP19 owns that); Compliance & health — Privacy requests, Service health, Message delivery. Groups with no permitted item are hidden. Later groups (People, Properties, Audit, Settings) appear with their parts.

### Mobile and action-menu behavior

- Lists: under 768px the property list switches to cards with a full-width primary action; the table remains for tablet/desktop as a focusable horizontal region. Page body does not scroll horizontally at 390px.
- Action menus: no overflow "⋯" menus are introduced. Each row keeps one visible, named primary action; secondary actions stay on the detail page. Destructive commands stay as labeled buttons.
- Dialogs: use the native modal `<dialog>` pattern of `NavDrawer`.

## 3. Verification

| Check | Result |
| --- | --- |
| Frontend unit tests (`npm test`) | 17/17 pass, including `test/domain/portal-state.test.js` (failure mapping, return-path safety) |
| ESLint | 0 errors, 4 pre-existing `no-img-element` warnings (`endOfLine: auto`; see CP01 note on CRLF checkouts) |
| Prettier | Pass (`--end-of-line auto`) |
| `next build --webpack` | Pass |
| Browser gate `scripts/portal-gate/gate.py` | **35/35 pass** — [results](rentra-client-admin-part02-gate.json) |

Browser gate scenarios (headless Chrome, production build):

- Client list at 1280px and 390px: URL-backed filter, row link carries the filtered list, breadcrumb returns to it, mobile cards, no horizontal overflow, Reviews in navigation, keyboard-focusable table region.
- Not found: a malformed id, and another owner's listing, both render "Record not found" with no data. The foreign listing's HTTP status is **200**, not 404: `loading.js` starts streaming before `notFound()` runs. The page is `noindex`.
- Form: a server-only validation failure (trimmed title too short) shows a focused summary, keeps the typed value, and the summary entry focuses its field. Clicking a navigation link with unsaved input raises the warning and stays on the page.
- Drawer at 390px: opens from the keyboard with focus inside, 25 Tabs stay inside, Escape closes, focus returns to the menu button.
- Admin: the full admin sees grouped navigation including Gateway settings; an unknown support id shows not-found; an admin granted only `admin.records.read` sees only Bookings and gets the forbidden state on `/admin/support`.
- Outage (API process stopped): a save announces the failure and keeps the input; detail and list pages show the unavailable state with Try again (no 404, no "No matching properties"), and the list URL keeps its filters.
- axe-core WCAG 2 A/AA, serious/critical: none on `/partner/listings` (1280 and 390), the property editor (1280), `/partner` (390) and `/admin/support` (1280).

Evidence type: fixture/browser evidence only. No human screen-reader pass, no hosted environment.

### Reproducing the gate

1. Create a disposable local PostgreSQL database named `rentra_cp02` on `127.0.0.1:55432`. The scripts refuse any other URL.
2. From `rentra-backend`, with `DATABASE_URL` pointing to it: copy `scripts/portal-gate/fixture-migrate.mjs` into the backend folder and run it; then run `src/scripts/seed.js`; then run `mint.mjs` with an output path for `tokens.json`. Run both scripts with `node --import ./loader/register.mjs --env-file=.env` so `@/` imports resolve.
3. Start the API with `PORT=4100 CORS_ORIGINS=http://localhost:3100`. Build and start the frontend with `NEXT_PUBLIC_API_URL=http://localhost:4100/api/v1` on port 3100.
4. Run `GATE_TOKENS=<tokens.json> python scripts/portal-gate/gate.py` (needs Python Playwright and Chrome). **The last group stops the API process to simulate an outage.**
5. Rebuild the frontend with the normal environment afterwards.

Fixture limits: local PostgreSQL has no PostGIS, so `fixture-migrate.mjs` stores the two geometry columns as text and forces them to NULL. Maps and geo search were not under test. Seed photos are not available locally, so broken-image alt text is excluded from the contrast scan.

## 4. Migration, configuration and deployment

- No migration and no configuration change.
- CP01's migration `0022` was applied to the configured database on 26 September 2026 (see the CP01 handoff). Other target databases still need it before deployment.
- Not deployed.

## 5. Limitations and next step

- Browser Back inside the app is not intercepted by the unsaved-changes guard; the App Router has no cancellable navigation event. Reload, close and in-app links are covered.
- A streamed page reports HTTP 200 for a not-found detail, as noted above.
- Pages outside the representative flows still rely on the route-level `error.js` for failures, which cannot tell forbidden from unavailable (Next hides server error details in production). Move them to `settle` as later parts touch them.
- The shared `ValidationSummary`/input restore is wired into the listing sections. Other forms adopt it when their parts touch them.
- **Next:** CP03 — Admin client directory, detail and lifecycle.
