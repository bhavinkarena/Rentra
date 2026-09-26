# CP04 — Admin customer directory and account controls

Status: **COMPLETE — 26 September 2026.** Service integration test and a 38-check browser/API gate passed on disposable databases. There is no migration in this part.

## 1. Scope and revisions

- Linked IDs: CP04; acceptance CA02, CA19, CA21, CA23; gap G06.
- Baseline: frontend `df4a16e`, backend `77ec8f2` (CP03 committed). CP04 changes are uncommitted. The frontend rename `ClientLifecyclePanel.jsx` → `AccountLifecyclePanel.jsx` is staged by `git mv`; everything else is unstaged.
- Delivered:
  - A customer directory with search, filter and masked phones.
  - Customer detail with linked bookings, support requests, reviews written, privacy requests, sessions and history.
  - Permitted identity corrections; access restriction and reinstatement; sign-out everywhere. Each command takes a reason, a version check and an audit entry.
- Not delivered (by design):
  - Authentication recovery (lost phone) and staff-initiated phone changes. The phone is the credential and changes only through the customer's verified flow.
  - Impersonation.
  - Privacy export/deletion fulfillment (CP27; the detail page links to the existing privacy workflow).
  - Payment/refund summaries (CP19–20).

## 2. API and behavior

### Capability

New admin domain `customers` (`admin.customers.read`, `admin.customers.write`). A Super Admin with `permissions = NULL` gets it automatically. Grants for `clients` do not carry over.

### Endpoints (under `/api/v1`, admin cookie required)

| Method and path | Capability | Input | Success | Errors |
| --- | --- | --- | --- | --- |
| `GET /admin/customers` | read | `q` (≤100; literal match on name, email or phone digits), `status` (`all`, `active`, `suspended`, `blocked`), `page` | `{ q, status, page, pages, pageSize: 20, total, counts, items[] }`. Items carry `phoneMasked`, never the full phone | 400, 401, 403 |
| `GET /admin/customers/:id` | read | — | `{ customer, sessions: { open, total, latest }, bookings, support, reviews (≤20 each, with totals), privacy, history (≤50), lifecycle }` | 400, 404 `CUSTOMER_NOT_FOUND` (also for a client's id) |
| `POST /admin/customers/:id/profile` | write | form: `name`, `email` (optional), `preferredLocale` (`en`/`hi`/`gu`), `reason`, `expectedVersion`, `expectedProfileVersion` | `{ customerId, fields[], lifecycleVersion, profileVersion }` | 422 field errors (invalid values; email already used by another customer; `_` "Nothing changed"), 409 `ACCOUNT_CONFLICT` / `PROFILE_CONFLICT`, 404 |
| `POST /admin/customers/:id/sessions/revoke` | write | `reason`, `expectedVersion` | `{ customerId, revoked, lifecycleVersion }`. `revoked: 0` is a no-op without an audit entry | 422, 409, 404 |
| `POST /admin/customers/:id/restrict` | write | `reason`, `expectedVersion` | `{ customerId, accountStatus: 'suspended', lifecycleVersion, impact }` | 422, 409 `ACCOUNT_CONFLICT` / `LIFECYCLE_NOT_ALLOWED`, 404 |
| `POST /admin/customers/:id/reinstate` | write | same | `accountStatus: 'active'` | same |

### Rules

- **Concurrency:**
  - `user.lifecycle_version` (from CP03) guards every admin command. Corrections and session revocation bump it too, so a second admin's stale view gets 409.
  - Corrections also check `customer_profile.version`. When a correction lands, it bumps that version too, so the customer's own open profile form conflicts instead of overwriting.
  - A duplicate submit returns 409.
- **Corrections:**
  - Only name, email and language can be changed. A changed email clears `email_verified_at`, as in the customer's own flow.
  - The audit entry `customer_profile_corrected` records the changed **field names** and the reason, never the values (the same principle as the customer's own profile audit).
  - A correction does not sign the customer out.
- **Restriction:** `active → suspended`.
  - The existing `0011` trigger revokes every customer session in the same transaction.
  - Phone sign-in is refused, and quotes, holds and payments are refused (`lockCustomerAccount` requires an active account). Active holds expire on their own.
  - Upcoming visits stay booked; changes go through support cases (CP14).
  - **Reinstatement** is `suspended → active` only. Sessions stay revoked, so the customer signs in again. Blocked accounts are refused (409).
- **Sign out everywhere:** revokes all open `customer_session` rows without changing the account status.
- **Minimization:**
  - Lists show only a masked phone. Detail shows the credential phone, email, language and marketing-consent state.
  - Detail never returns OTP challenges, session ids, payment-method tokens, the photo key or audit values for corrections.
  - Reviews are listed read-only; ratings are never edited from a customer record.

### Frontend

- `/admin/customers`: status chips with authoritative counts, search, URL-backed filters, a focusable table region, named "Open" links carrying `?from=`, and an explicit empty state.
- `/admin/customers/[id]`: breadcrumbs, a copyable customer ID, section links, and a correction form. The form has controlled inputs, so a rejected save keeps what was typed, plus a validation summary and a conflict reload.
  - A sessions panel with **Sign out everywhere** (disabled when nothing is open).
  - The shared **AccountLifecyclePanel** labelled "Restrict access" / "Reinstate access", with a no-impersonation note.
- `AccountLifecyclePanel` (renamed from `ClientLifecyclePanel`) now serves clients and customers through `command`, `verbs` and `statuses` props.
- `lib/actions/admin.js`: a shared `accountCommand` helper returns failure codes for both client and customer commands. The shared `runApiAction` is unchanged.
- Admin navigation: **People → Customers** (`admin.customers.read`).

## 3. Verification

| Check | Result |
| --- | --- |
| Backend `npm test` with both disposable-DB URLs set | **81/81 pass**, including the CP01, CP03 and new CP04 integration tests |
| Backend `db:check`, ESLint, Prettier | Pass (24 migrations; `endOfLine: auto`) |
| Frontend `npm test`, ESLint, Prettier, `next build --webpack` | 17/17; 0 errors; pass; pass |
| CP04 gate `scripts/portal-gate/cp04_gate.py` | **38/38** — [results](rentra-client-admin-part04-gate.json) |
| Regression gates | CP03 35/35; CP02 34/34 |

Integration test (`test/integration/customer-controls.integration.test.js`) scenarios:
- Directory counts, search by phone digits, and a masked phone with the full phone absent from list output; `_` treated literally.
- Detail with a linked order, an upcoming visit, a privacy request and two open sessions, with no session id, code hash, photo key or token in the output. 404 for unknown, malformed and client ids.
- Corrections:
  - Invalid values → 422 per field; duplicate email → 422 field message; no change → 422.
  - A customer-profile version conflict → 409.
  - A successful correction keeps the phone, clears email verification, records field names only, keeps sessions valid, and a repeat with the old version → 409.
- Sign out everywhere revokes both sessions and leaves other customers alone; a repeat is a no-op.
- A stale restriction → 409. Of two concurrent restrictions, exactly one wins. Restriction revokes a new session, reinstatement does not revive it, and a blocked account can't be reinstated.
- History contains all four admin actions.

Browser/API gate scenarios (headless Chrome, production build, seeded customers):
- Directory at 1280px and 390px: search by phone digits, masked phone only (full number absent from the HTML), no page overflow, axe clean. The detail breadcrumb keeps the search.
- Detail shows the credential phone and one open session, no editable phone field, and a privacy workflow link; axe clean.
- UI correction: a duplicate email shows the field message and keeps the typed email and reason. A valid correction reports the changed fields, and history shows "Fields: name, email" without the values. The customer stays signed in.
- UI sign-out everywhere ends the customer's session: their next `/account` request redirects to `/login`.
- A second admin view opened earlier gets the conflict message and reloads. UI restriction and reinstatement then commit.
- Direct API:
  - Anonymous → 401; customer cookie → 401.
  - `admin.customers.read` operator: read 200, correct 403. Clients-reader operator: list 403.
  - Invalid email → 422; stale version → 409; unknown id → 404; a client's id → 404.
  - The detail response omits secret fields.

Evidence type: fixture and disposable-database evidence only. No hosted environment and no human screen-reader pass.

## 4. Migration, configuration and deployment

- No migration in CP04. It relies on CP03's `0023` (`user.lifecycle_version`) and the `0011` customer-session trigger.
- Configured database: a read-only check on 26 September 2026 found 24 recorded migrations and `user.lifecycle_version` present, so CP04 needs no database step there.
- No new configuration or secrets. Not deployed.
- Gate reproduction is as in the CP02 handoff, with `cp04_gate.py`. `mint.mjs` now also creates a customers-reader operator, a signed-in seeded customer (`9898980001`), and an email on a second seeded customer for the duplicate check.

## 5. Limitations and next step

- There is no authentication recovery for a customer who lost their phone; that needs a separate verified recovery design.
- The bookings list shows booking orders; legacy visits without an order are not listed.
- Payment/refund summaries (CP19–20), dispute cases (CP23) and privacy fulfillment (CP27) are later parts.
- The history cap is the latest 50 events, excluding routine customer logins.
- **Next:** CP05 — Gate 1 application review.
