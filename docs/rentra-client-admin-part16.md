# CP16 — Caretaker and team access

Status: **COMPLETE — 27 September 2026.** A disposable-PostgreSQL service test, a capability unit test and a 51-check browser/API gate passed. Migration `0031_caretaker_access` is **not applied** to the configured database (see §4).

## 1. Scope and revisions

- Linked IDs: CP16; acceptance CA01–02, CA13, CA19; gap G17.
- Baseline: frontend `7fcacea`, backend `4fca169` (CP15 committed). CP16 changes are uncommitted in both repositories.
- The existing `client_staff` table and the CP01 caretaker capability contract (`staff.assigned-visits.read`, `staff.assigned-visits.evidence`) are now a working feature:
  - **Owner:** `/partner/team`. Invite by name and mobile, choose properties and whether the caretaker may record evidence, issue a new invitation or sign-in link, reassign properties, revoke with a reason, and see the membership history. A **Team** item is added to the owner navigation.
  - **Caretaker:** a separate, phone-first workspace under `/staff`:
    - accept the invitation (`/staff/join/[token]`);
    - sign in by phone (`/staff/login`);
    - see visits on assigned properties (today, needs action, upcoming, past);
    - open one booking's visits (address, owner contact, house rules the guest accepted, evidence and incidents);
    - record handover, return and completion if the owner allowed it, reusing the CP13 evidence form.
- **Never available to a caretaker:** earnings and money (rent, fees, deposits, payments, refunds), pricing and calendar settings, KYC and owner documents, the rest of the team, the customer's identity, other properties, and incident reporting (incidents go through the owner).
- **Not platform administration:** owner team permission is `client.team.*`; nothing maps to admin capabilities.

## 2. API, schema and behavior

### Migration `0031_caretaker_access`

- `client_staff` adds `accepted_at`, `revoked_at`, `revoked_reason`, `version` and `updated_at`. `permissions` is now `{ evidence: boolean }`.
- `staff_property(staff_id, rentable_id)`: the assigned properties.
- `staff_invitation(id, staff_id, token_hash unique, expires_at, used_at, revoked_at, created_at)`. Only the SHA-256 of a 32-byte random token is stored, and links expire after 72 hours.
- `portal_session.staff_id`. The principal check becomes "exactly one of user, admin, staff".
- `audit_actor` adds `staff`. The `visit_evidence` and `visit_attachment` actor checks allow `staff`.
- **`rentra_visit_evidence_scope()` is replaced with a caretaker branch.** The database refuses caretaker evidence unless the caretaker is active, accepted and granted evidence, is assigned to that property, and works for its active owner.

### Identity and sessions

- A caretaker is one `client_staff` row: one owner, one phone. A caretaker working for two owners has two rows.
- **Joining** needs the owner's one-time link **and** a 6-digit code sent to the invited phone (existing OTP rules, identifier `staff:<phone>`). A forwarded link alone grants nothing. The link is consumed in a locked transaction: a second use, including a concurrent one, gets 409.
- **Session:**
  - a separate `rentra_staff` cookie with a JWT audience of `rentra:staff`, 14-day TTL, backed by a `portal_session` row;
  - valid only while the caretaker is active, accepted and unrevoked, and the owner is an active client;
  - a caretaker cookie is invisible to owner, customer and admin guards, and the other way round.
- **Phone sign-in:** it answers the same whether or not the number has access (no discovery). A number with access at more than one owner is told to use that owner's sign-in link.
- **Revocation** is immediate: the caretaker row is revoked, every session is revoked, and every unused link is killed. Owner suspension also ends caretaker sessions.
- **Reassignment and grant changes** apply on the next request, because assignment is joined into every caretaker query and into the database evidence check.

### Endpoints (`/api/v1`)

| Method and path | Access | Input | Result / errors |
| --- | --- | --- | --- |
| `GET /partner/team` | `client.team.read` (active owners) | — | `{ members[], properties[], history[] }`. Each member has state `invited`, `active`, `invite_expired` or `revoked`, plus properties, the evidence grant, accepted/revoked times, last sign-in and version. History covers invited, link issued, joined, access changed and revoked. |
| `POST /partner/team/invite` | `client.team.write` | `name`, `phone`, `propertyIds[]`, `evidence` | `{ staffId, token, expiresAt }`. 422 for any property that is not the owner's (the whole request is refused); 409 `STAFF_EXISTS`. Re-inviting a revoked number starts fresh. |
| `POST /partner/team/:id/link` | write | — | A new link; earlier unused links are revoked. 409 `STAFF_REVOKED` |
| `POST /partner/team/:id/access` | write | `expectedVersion`, `propertyIds[]`, `evidence` | 409 `STAFF_CHANGED` / `STAFF_REVOKED`; 422 |
| `POST /partner/team/:id/revoke` | write | `expectedVersion`, `reason` | `{ sessionsRevoked }`. 409 when stale or already revoked; 404 for another owner's caretaker |
| `POST /staff/invite` · `/staff/join/code` · `/staff/join` | public, `authLimiter` | `token` (+ `code`) | The invitation state (`valid`, `used`, `revoked`, `expired`, `unavailable`, `invalid`) with owner name, property titles and the last two digits of the phone. Accepting sets the caretaker cookie. |
| `POST /staff/login/code` · `/staff/login` · `/staff/logout` | public, `authLimiter` | `phone` (+ `code`) | 401 with no active access; 409 `MULTIPLE_OWNERS` |
| `GET /staff/me` | `staff.assigned-visits.read` | — | Name, owner name and phone, properties, the evidence grant, capabilities |
| `GET /staff/visits` | read | `tab` = `today`, `action_needed`, `upcoming` or `past` | `{ tab, counts, items[] }`, assigned properties only, no money |
| `GET /staff/visits/:orderId` | read | — | Visits with evidence and incidents, arrival (address, owner name and phone), accepted house rules and `canRecord`. 404 for a guessed or unassigned id |
| `GET /staff/visits/:orderId/attachments/:id` | read | — | Photo bytes, assignment-checked and audited as a `staff` read |
| `POST /staff/visits/transition` | `staff.assigned-visits.evidence` | The CP13 transition fields and photos | 403 without the grant. Assignment is re-checked before any upload and under the listing lock. |

### UI behavior

- The invitation link is shown to the owner **once**, with "Send this link to the caretaker yourself — Rentra does not send it". No SMS or WhatsApp is sent.
- Owner forms submit from a transition, so a refused save keeps the typed values and chosen boxes.
- Revoking needs a reason and a confirmation.
- Evidence recorded by a caretaker shows as "Caretaker · name" to the owner, to other caretakers and to admins. Other names stay admin-only, as before.
- A revoked or expired caretaker session sends the caretaker to `/staff/login?session=ended`. An API outage shows the shared unavailable state.

### Fixes made during CP16

- `issuePortalSession` names `staff_id` only for caretaker sessions. The owner and admin insert is unchanged, so CP01's minimal-schema session test keeps passing.

## 3. Verification

| Check | Result |
| --- | --- |
| Backend `npm test` with the disposable-DB URLs | 109/109, including `test/integration/caretaker-access.integration.test.js` and the caretaker capability test |
| Backend `db:check`, drizzle drift check, ESLint, Prettier | Pass (32 migrations; no drift) |
| Frontend `npm test`, ESLint, Prettier, `next build --webpack` | 22/22; 0 errors (4 existing OG-image warnings); pass; pass |
| CP16 gate `scripts/portal-gate/cp16_gate.py` (fixture `serve-property-review.mjs` with `FIXTURE_STAGE=published` and `DEV_OTP_BYPASS=true`, then `seed-pricing-operations-gate.mjs`; API :4106, frontend :3106) | **51/51**, three runs, the last on the final code — [results](rentra-client-admin-part16-gate.json) |
| Regression gates on this build | CP15 38/38 · CP14 34/34 · CP13 31/31 · CP11/12 44/44 · CP10 37/37 · CP09 41/41 · CP08 56/56 · CP07 53/53 · CP06 39/39 · CP05 35/35 · CP04 38/38 · CP03 35/35 · CP02 34/34 |

The CP10–CP14 `.mjs` gates were replayed with their seed scripts and a scratchpad `playwright-core`. Their rewritten result files were restored.

Integration test scenarios:

- **Inviting:** a foreign property, a bad phone or no property gets 422; a duplicate gets `STAFF_EXISTS`. Before acceptance, no session can be issued.
- **Links:** a reissued link revokes the first. Two concurrent consumptions of one link give exactly one winner; reuse gets `INVITE_USED`.
- **Sessions:** a staff session is valid only for its own id and is never a client session. View-only caretakers get only the read capability.
- **Reads:** list and detail cover the assigned property only, with no money keys and no guest identity. A guessed order gets null.
- **Evidence:** refused without the grant (`OPERATOR_REQUIRED`); a stale grant change gets `STAFF_CHANGED`. With the grant, the handover is recorded as actor `staff`, and the owner record names the caretaker.
- **Reassignment:** the old booking disappears and the transition is refused.
- **Owner suspension:** the caretaker session is invalid until the owner is reinstated.
- **Revocation:** sessions and links are revoked, no new session can be issued, and a new link gets `STAFF_REVOKED`.
- **Isolation:** another owner sees no team and gets 404.
- **Re-inviting:** a revoked caretaker comes back fresh (view only). An expired link gets `INVITE_EXPIRED`.
- **History:** every action appears in the membership history.

Gate scenarios:

- **Team page and invitation:**
  - Team page at 1280 and 390px: no overflow, axe clean.
  - A guessed property id is refused.
  - The UI invitation shows the link once, and the caretaker is invited view only.
  - A duplicate gets 409; another owner sees nothing and gets 404 on revoke; an admin cookie gets 401 on the owner team API.
- **Joining:**
  - The join page at 390px lists the property and is axe clean.
  - A wrong code grants nothing; the correct code lands on the caretaker visits page (axe clean), and the member becomes active.
  - Reusing the link gets "This link cannot be used".
- **Scope:**
  - The in-progress visit appears in "needs action", and its detail has the address and owner contact but no money or guest contact.
  - A guessed booking gets 404.
  - The caretaker cookie gets 401 on owner listings, the money-bearing owner record, the calendar, documents, team, updates and admin.
  - View only: the transition API gets 403, the page has no evidence form, and no price is shown.
- **Evidence grant:**
  - The owner grants evidence through the UI; a stale access change gets 409.
  - The caretaker records the handover through the UI; the owner record and booking page show "Caretaker · Ramesh Caretaker".
- **Reassignment:** after the owner reassigns to another property, the old booking gets 404 and the needs-action count is 0.
- **Revocation through the UI:**
  - The caretaker API gets 401, and the page redirects to sign-in with "session ended".
  - The revoked number cannot sign in again (same "code sent" answer, then no access).
- **Replaced links and history:** a replaced link says "replaced or cancelled", and the history shows invited, joined, access changed, revoked and new link issued.

## 4. Migration, configuration and deployment

| Environment | Status |
| --- | --- |
| Disposable local databases | `0031` applied by the tests and gate fixtures |
| Configured database (Neon) | **Not applied** (read-only check, 27 September 2026: 31 of 32 recorded; `0029` and `0030` are now applied, `0031_caretaker_access` is pending) |

Run `npm run db:migrate` in `rentra-backend` before this code runs against the configured database. The migration adds an enum value (`audit_actor.staff`); PostgreSQL applies it inside the migration transaction.

**Delivery limitation:** caretaker codes use the existing OTP layer, which has no SMS provider in production. Outside development the code cannot be delivered, the same limit that applies to owner sign-in today.

No new configuration or secrets. Not deployed.

## 5. Limitations and next step

- There is no SMS provider (above), and the invitation link is shared by the owner by hand.
- Caretakers cannot report incidents or see guest identity; incidents go through the owner.
- A caretaker working for several owners must sign in with each owner's link; there is no owner picker.
- There are no per-caretaker activity reports beyond the evidence attribution and the membership history.
- Still open from CP12: the webhook `redacted_payload` double-encoding.
- **Next:** CP17 — client support and assigned admin cases.
