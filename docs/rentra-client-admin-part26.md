# CP26 — Admin operator and security management

Status: **COMPLETE — 28 September 2026.** CA02 and CA19 verified with disposable PostgreSQL, browser/API and fault-injection evidence. Migration `0037_operator_security` is **not applied to the configured database**. CP25 remains in progress independently.

## Scope and decisions

- `/admin/security` is the searchable, status-filtered, paginated operator directory. `/admin/security/[id]` shows access, factor/enrollment state, active sessions and security history. These are the implemented destinations for the proposed `/admin/team` routes.
- `admin.security.read` controls directory/detail; `admin.security.write` controls creation, capability changes, activation/deactivation, enrollment/recovery and session revocation. CP01 middleware and live service checks both enforce capabilities.
- Full Super Admin access remains `admin_user.permissions IS NULL`. Explicit arrays contain only known capabilities. Delegated managers may assign only capabilities they hold and may manage only operators whose capabilities are a subset of their own. They cannot manage full Super Admins or use recovery to gain a higher-capability identity.
- Commands require an explicit impact confirmation, an audit reason of 8–1000 characters, a reviewed security version, and a live sign-in issued within 15 minutes. `/admin/login?reauthenticate=1` lets an already signed-in operator refresh authentication.
- Operators cannot deactivate or change their own access, or recover their own enrolled factor. A shared transaction lock serializes security writers. Removing a full Super Admin's usable access or factor requires another active full Super Admin with an enrolled factor, no pending enrollment and no current login lock. An unenrolled or locked account does not satisfy that guard.
- CP01's trigger revokes sessions on permissions, activation or credential changes. The session screen supports sign-out everywhere; the API also supports revoking one owned session. Reinstatement does not revive revoked sessions.

## Enrollment and recovery

Creation and supervised recovery issue a random bearer link, displayed to the authorized manager once. Give it privately to the intended recipient after verifying their identity and authority. No email or message is sent automatically. The link expires after 30 minutes; only its SHA-256 digest is stored. Reissuing, revoking, deactivating or changing access invalidates a pending link.

`/admin/enroll#TOKEN` keeps the bearer token out of request URLs and removes the fragment when opened. The recipient imports a newly generated private authenticator URI, chooses a password of at least 12 characters and confirms a six-digit TOTP. Confirmation consumes the token in the same locked transaction as credential installation. Preview alone does not activate the factor. Enrollment and recovery cannot read or return the old password or old TOTP seed.

Recovery immediately replaces the old password with an unknown random hash, clears the old factor and ends all sessions. Sign-in remains blocked while enrollment is pending. Completion installs the recipient's new password and factor, clears login lockout and records an audit receipt. Invalid TOTP sign-in attempts now participate in the existing five-attempt account lockout. Production continues to require an enrolled factor. There are no backup-code, SMS-factor or public password-reset flows; a lost factor requires another authorized operator. The seed CLI remains a controlled bootstrap/last-resort operations tool.

## API and migration

| Endpoint | Behavior |
| --- | --- |
| `GET /api/v1/admin/security?q=&status=all&page=1` | Directory, authoritative filtered total and 20-row pagination |
| `POST /api/v1/admin/security` | `create`, with name/email/permissions/reason/confirmation |
| `GET /api/v1/admin/security/:id` | Safe operator projection, latest 100 active sessions and 30 security audit entries |
| `POST /api/v1/admin/security/:id` | `access`, `enroll`, `recover`, `cancel_enrollment`, `revoke` |
| `POST /api/v1/admin/auth/enrollment` | Rate-limited bearer `preview` or `complete`; never cached |

Existing-operator commands require numeric `version`, `reason` and `confirmed: true`. `access` also requires `active` and `permissions` (`null` for full access, array for explicit grants). `revoke` optionally takes an owned `sessionId`. Invalid input returns 422; stale versions and self/last-admin guards return 409; missing grants or recent authentication return 403. Anonymous/cross-audience protected requests return 401. Token expiry, replay or revocation returns 401 `ENROLLMENT_ENDED`.

Migration 0037 adds `security_version`, `enrollment_hash`, `enrollment_secret` and `enrollment_expires_at` to `admin_user`. The schema snapshot and journal agree. Enrollment secrets use the existing database-held TOTP model; database access remains sensitive. Audit payloads contain access decisions, reasons and counts, without passwords, bearer links or factor secrets.

## Verification

| Check | Result |
| --- | --- |
| CP26 integration test, every migration applied to a disposable PostgreSQL 17 database | Passed; access updates, stale/concurrent writes, last usable Super Admin, delegation limits, recent authentication, lost/revoked/expired factors, token replay, audit minimization and per-session revocation |
| Focused CP01/CP26 access regression | 13/13 passed; CP26 additionally rerun after adding explicit last-admin and higher-capability recovery checks |
| Browser/API gate | **32/32 passed**, `completed: true`, [evidence](rentra-client-admin-part26-gate.json) |
| Outage/reauthentication gate | **7/7 passed**, [evidence](rentra-client-admin-part26-outage-gate.json); directory/detail retry, failed command retains input and writes nothing, signed-in reauthentication form and successful enrollment-preview retry |
| Browser layout/accessibility | Directory/detail at 1280px and 390px: no horizontal overflow, no serious/critical axe WCAG A/AA violations |
| Frontend tests | 36/36 passed |
| Frontend production Webpack build | Passed; public API fallback messages recorded during static generation |
| Backend migration-file check | Passed: 38 files and journal entries; no configured-database access |
| Lint/format | Backend lint and format pass with Windows `endOfLine: auto`. Changed frontend files pass lint/format; whole frontend has four pre-existing image warnings and a pre-existing `package.json` format difference |
| Broader backend suite with disposable databases | **136 passed, 1 failed**: CP25's confirmed-booking fixture has no inventory reservations and checkout refuses it with `INVENTORY_REMEDIATION_REQUIRED`. CP26 and all other tests passed. This does not complete CP25 |

The browser gate exercised operator creation, recipient enrollment and sign-in, recovery, rejection of old credentials, successful replacement-factor sign-in, active-session revocation, capability denial, stale commands, activation/deactivation, read-only UI and response minimization. Browser testing found and fixed Drizzle/Postgres JSON serialization and loss of the one-time recovery result during page revalidation. The saved [detail screenshot](rentra-client-admin-part26-detail.png) contains fixture data only. No hosted check, deployment or screen-reader pass was performed.

## Reproduction and deployment

Use a **disposable localhost PostgreSQL server only**. In PowerShell, from `rentra-backend`:

```powershell
$env:PORTAL_TEST_DATABASE_URL='postgres://postgres@127.0.0.1:55432/postgres'
$env:CP01_TEST_DATABASE_URL=$env:PORTAL_TEST_DATABASE_URL
node --import ./loader/register.mjs --env-file=.env --test test/integration/operators.integration.test.js test/integration/portal-access.integration.test.js test/services/portal-access.test.js
$env:CP26_GATE_FIXTURE=Join-Path $env:TEMP 'rentra-cp26-fixture.json'
node --import ./loader/register.mjs --env-file=.env test/helpers/serve-operators.mjs
```

Start the frontend separately with `RENTRA_BROWSER_FIXTURE=1`, `RENTRA_BROWSER_FIXTURE_ID=cp26`, `NEXT_PUBLIC_API_URL=http://localhost:4106/api/v1`, using `node node_modules/next/dist/bin/next dev --webpack -p 3106`. From `Rentra`, set the same `CP26_GATE_FIXTURE` and run `python scripts/portal-gate/cp26_gate.py`. Python Playwright with an installed Chromium browser is required. Type `stop` into the fixture terminal to drop its database.

For the outage gate, start a fresh fixture with `--import ../Rentra/scripts/portal-gate/port-remap.mjs` before the loader import (API becomes 4206), run `node scripts/portal-gate/fault-proxy.mjs` from `Rentra` on 4106, then `python scripts/portal-gate/cp26_outage_gate.py`.

Migration 0037 was applied **only to disposable databases**, together with earlier migrations. No configured database was inspected or migrated. Apply all pending migrations before deploying; deploy frontend and backend together. Ensure at least two verified full Super Admins have usable enrolled factors before recovery operations. Pending links expire and must be reissued; canceling a link leaves the invalidated old credentials unusable. Recovery completion is the remedy.

Next recorded incomplete part remains **CP25**: correct its inventory fixture, then run its integration, browser and outage gates. CP27 is the next planned part after that; CP26's security dependency is satisfied.
