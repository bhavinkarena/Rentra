# CP01 — Access, capabilities and revocable sessions

Status: **COMPLETE — 26 September 2026.** Gate verified against a disposable local PostgreSQL cluster. Migration `0022_portal_access` was applied to the configured database on 26 September 2026 (see §4).

## 1. Scope and revisions

- Linked IDs: CP01; acceptance CA01–02, CA19; gap G07 (foundation part — operator management remains CP26).
- Baseline: frontend HEAD `86f3e5a`, backend HEAD `ad320ae`. CP01 changes are uncommitted working-tree changes on both repositories at the time of this handoff.
- Delivered: explicit capability sets for Super Admin, client and a contract-only caretaker set; Express enforcement on every `/partner` and `/admin` route, including file/download routes; server-checked, revocable portal sessions for clients and admins; the suspended-client policy; frontend navigation and sign-in states driven by the capabilities the API returns.
- Not delivered (by design): operator/capability management screens (CP26), caretaker authentication and property assignment (CP16), client suspension/reinstatement UI with impact preview (CP03).

## 2. Behavior, schema and API

### Capabilities

`rentra-backend/src/services/auth/capabilities.js` is the single source.

| Actor | Capabilities |
| --- | --- |
| Super Admin (`admin_user.permissions` is `NULL`) | All `admin.<domain>.read` and `admin.<domain>.write` for applications, clients, documents, payments, records, reviews, support, notifications, privacy and operations |
| Admin with a `permissions` JSON array | Only the listed known capabilities; unknown strings are ignored |
| Inactive admin | None |
| Client `pending_application` | `client.application.*`, `client.documents.*`, `client.settings.write`, `client.catalogue.read`, `client.listings.read` |
| Client `active` | Pending set plus `client.listings.write`, `client.calendar.*`, `client.records.*`, `client.reviews.*` |
| Client `suspended` / `blocked`, customer, unknown | None |
| Caretaker (contract only) | `staff.assigned-visits.read`, `staff.assigned-visits.evidence` — no payments, pricing, KYC or staff administration |

Route mapping: the first path segment is the domain and `GET`/`HEAD` map to `read`; every other method maps to `write`. Two exceptions: admin `/users/:id/documents…` maps to `documents`; client `/listings/:id/calendar…` maps to `calendar`. An unmapped route fails closed (403). Record ownership remains a separate service-layer check; capabilities do not replace it.

### Enforcement

- `requirePortalCapability(kind)` (`src/middlewares/auth.middleware.js`) is mounted with `router.use` on `partner.route.js` and `admin.route.js`, before all controllers. No valid actor returns 401 (`CLIENT_REQUIRED` / `ADMIN_REQUIRED`, "Your session has expired or was revoked"); a missing capability returns 403 `CAPABILITY_REQUIRED`.
- Existing `requireRole`, `requireActiveClient` and `requireAdmin` guards stay in place as a second layer.

### Revocable sessions (migration `0022_portal_access`)

- New table `portal_session(id, user_id | admin_id, created_at, expires_at, revoked_at)` with a check constraint that exactly one principal is set; new nullable column `admin_user.permissions jsonb`.
- Client and admin tokens now carry `sessionId`. Every protected request validates it in one query that also re-checks the principal's current role, account status or `is_active`.
- A database trigger revokes all open sessions and writes an `access_sessions_revoked` audit row when a user's role, account status or email changes, or when an admin's `is_active`, permissions, password hash, TOTP secret or email changes. Revocation therefore does not depend on every code path remembering to call it.
- Issuance locks the principal row (`FOR UPDATE`), the same lock the trigger's update takes. A sign-in racing a suspension yields either no session or an already-revoked one.
- Sign-in re-verifies the email (client) or email, password hash and TOTP secret (admin) under that lock, so a credential change between check and issue cannot mint a session.
- Logout revokes the server session and writes a `session_revoked` audit row; repeating it is a no-op.
- Tokens are audience-bound (`rentra:client`, `rentra:customer`; the admin cookie keeps its existing audience). A client or customer token presented as the admin cookie, and an admin token presented as the client cookie, are rejected.

### Suspended-client policy

Suspended and blocked clients get **no** portal access and cannot sign in (403 `ACCOUNT_RESTRICTED`: "This account is restricted. Contact Rentra for help with existing bookings."). New business is already blocked in source: quotes, inventory holds and owner settings require the owner to be `active`. Fulfillment of existing bookings is admin-controlled through the existing admin records routes (`admin.records.*`). A narrower restricted-fulfillment client mode is not built; CP03 owns the upcoming-obligation preview before suspension.

### Session migration and logout behavior

- Existing **customer** tokens without an audience remain valid, so customers are not signed out.
- Existing **client** and **admin** tokens have no `sessionId` and are rejected once. Those users see "Sign in again to continue" and sign in normally.
- `GET /auth/me` returns `sessionState: 'ended'` when a cookie was present but the session is no longer valid, and `'signed_out'` when no cookie was sent.

### Frontend

- `lib/api/session.js`: protected pages call `/auth/me` directly, so an API outage raises an error instead of being treated as a revoked session. Revoked or expired sessions redirect to `/partner/login?session=ended` or `/admin/login?session=ended`. `getCurrentAdmin` treats only 401 as signed out.
- Both login pages show an accessible `role="status"` notice for `session=ended`. The partner notice for restricted accounts now explains help with existing bookings.
- `AdminShell` shows only navigation items whose `admin.<domain>.read` capability is granted. `PartnerShell` enables Properties/Bookings from `client.listings.write` / `client.records.read` instead of a status comparison.

## 3. Verification

| Check | Result |
| --- | --- |
| Backend unit `test/services/portal-access.test.js` | Pass: fail-closed actors, pending vs active client routes, admin grants, document reads vs writes, caretaker exclusions, bad claims rejected before SQL |
| Backend integration `test/integration/portal-access.integration.test.js` with `CP01_TEST_DATABASE_URL` pointing to a disposable local PostgreSQL 17 cluster (created in a temporary directory, trust auth, port 55432) | Pass (1/1). Applies the real `0022` SQL and runs the actual DAL and Express middleware |
| Backend `npm test` | 76 tests: 75 pass, 1 skipped (the integration test when `CP01_TEST_DATABASE_URL` is unset), 0 fail |
| Backend `npm run db:check` | Pass: 23 migration files and journal entries agree |
| Backend ESLint and Prettier | Pass with `endOfLine: auto` (0 errors). The plain `npm run lint` / `format:check` report only CR characters because this Windows checkout uses `core.autocrlf=true`; the Git index is LF |
| Frontend ESLint and Prettier | Pass with `endOfLine: auto` (0 errors, 4 pre-existing `no-img-element` warnings in image routes). One unmodified file with mixed line endings in the working copy was normalized |
| Frontend `npm test` | 15/15 pass |
| Frontend `next build --webpack` | Pass |

Scenarios covered by the integration test:

- Cross-audience: a client token as the admin cookie returns 401 on a document download; an admin token as the client cookie returns 401; a customer token on a partner route returns 403.
- Direct API denial: an admin with `permissions=[]` gets 403 on `GET /documents/:id/file`.
- Permission change: granting permissions revokes the old session (401 on the next request); a new sign-in is allowed.
- Revocation: logout revokes only that session; a second logout is a no-op with one audit row; another session for the same user remains valid.
- Suspension: open sessions die on the next request; issuing a new session fails; reinstatement does not revive old sessions.
- Admin `is_active`, permissions, password and TOTP changes each revoke the open session.
- Expired session, legacy client token without `sessionId`, a session presented with another user's ID or as an admin session: all rejected.
- Issuance racing suspension never yields a valid session.
- Customer behavior: an existing customer session still resolves through the DAL.

Evidence type: fixture and disposable-database evidence only. No authenticated browser run and no hosted environment check were performed.

## 4. Migration, configuration and deployment

| Environment | Status |
| --- | --- |
| Disposable local cluster | `0022` applied inside the integration test and dropped afterwards |
| Configured application database (Neon, from `rentra-backend/.env`) | **Applied — 26 September 2026** with `npm run db:migrate`. Verified afterwards: 23 recorded migrations, `portal_session` table, `admin_user.permissions` column and both revocation triggers present. Before that, client sign-in failed on this database: the OTP passed but `createSession` hit the missing table |
| Deployments | Not deployed |

**Deployment order:** run `npm run db:migrate` in `rentra-backend` **before** starting the new backend code. Without the migration, client and admin sign-in fail because `portal_session` does not exist. After deployment every client and admin signs in once; customers are unaffected. No new configuration or secrets.

## 5. Limitations and next step

- There are no UI or API commands to edit `admin_user.permissions`; a `NULL` value keeps today's full Super Admin access. CP26 owns operator management.
- A restricted-fulfillment mode for suspended clients is not built; the policy is admin-controlled fulfillment.
- Admin pages hidden from navigation still render if opened by URL. Their API calls return 403; CP02 owns explicit forbidden states.
- The `/auth/me` protected-page path no longer converts an API outage into a sign-in redirect. This applies to customer pages too: an outage now shows the error page instead of `/login`.
- **Follow-up fix — 26 September 2026:** `runAction` (`rentra-backend/src/utils/runAction.js`) rethrew unexpected errors from an async handler that Express 4 never catches, so the request hung. With the missing table this appeared as an endless spinner after the OTP. `runAction` now goes through `asyncHandler`, so every action route returns an error response instead. Regression test: `test/utils/runAction.test.js`. After the migration, a dev-code sign-in against the running API returned 200 and `/auth/me` returned the client; logout revoked that test session.
- **Next:** apply migration `0022` to any other target database before deploying; CP02 is complete.
