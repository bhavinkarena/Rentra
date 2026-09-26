# CP15 — Client task dashboard and persisted updates

Status: **COMPLETE — 27 September 2026.** A disposable-PostgreSQL service test and a 38-check browser/API gate passed. Migration `0030_client_updates` and CP14's `0029` were pending at the gate; both were applied to the configured database afterwards (read-only check, 27 September 2026, see §4).

## 1. Scope and revisions

- Linked IDs: CP15; acceptance CA01, CA20–21; gaps G03 (task-based overview), G04 (the dashboard half) and G16 (the persisted-updates half; client support is CP17).
- Baseline: frontend `4d3ad01`, backend `d86fcb5` (CP10–CP14 committed). CP15 changes are uncommitted in both repositories.
- Delivered:
  - **Task dashboard.** The decorative "Portfolio health" ring and next-action card on `/partner` are replaced by **Your tasks**, split into "Needs your action" and "For your information". Every task is derived on each request from current approval, readiness, visit and update states, and links to the list that holds exactly that work.
  - **Persisted updates inbox** at `/partner/updates`:
    - read/unread state per update, filters (all, unread, needs action) and type chips;
    - "Open" marks the update read and goes to the property, booking or account it is about;
    - mark read and mark all read;
    - an **Updates** navigation item whose unread badge only appears when the count is above zero.
  - **Supported notification preferences.** The client chooses which informational categories arrive unread: properties, bookings and cases. Required work always arrives unread and cannot be muted. Muted updates are still stored and listed.
  - **Honest channels.** The inbox and preferences say that Rentra does not send owner updates by SMS or email yet. The settings copy that promised "Booking alerts and important property updates arrive here" (by phone) is corrected.
- Not a marketing tool or chat system. There is no new delivery channel, and no historical backfill: only events after migration `0030` produce updates.

## 2. API, schema and behavior

### Migration `0030_client_updates`

- `client_update(id, client_id, event_key, category, kind, action, rentable_id, order_id, detail jsonb, created_at, read_at)`:
  - unique `(client_id, event_key)`;
  - `category` is one of `account`, `property`, `booking` or `case`;
  - `kind` is `action` (required work) or `info`.
- `client_update_preference(user_id, muted jsonb, version, updated_at)`.
- **Rows are written by database triggers, in the transaction that caused the event.** Every writer is covered, and a replayed event (same event key) inserts nothing.
  - **`audit_log` (admin actions):**
    - On `rentable`: review decisions, verification scheduled, moved, cancelled or recorded, publication, hide, restore and correction.
    - On `client_application`: approved, more information requested, rejected.
  - **`booking_lifecycle_event`:** `confirmed` (new booking) and `cancel_*` (visits cancelled), each marked as a simulation for non-real provenance or a test payment.
  - **`booking_case_update`:** Rentra messages with audience `client` or `everyone`. Owner-authored and internal notes are excluded.
- **Client-safe detail only:**
  - a reason is copied only where the admin form says it is shown to the client (review decision, hide, correction, application decision);
  - outcomes, the verification mode, a restored status, corrected field names, references and a 280-character case-message excerpt.
  - Never verification findings, scheduling notes, assignment or operator identity.
- **Required work** (`action`): changes requested or rejected, hidden, a failed verification, and an application needing more information or rejected. Everything else is `info`.
- **Muting:** an `info` update in a muted category is stored with `read_at` already set.

### Endpoints (`/api/v1`, client session)

| Method and path | Access | Input | Result / errors |
| --- | --- | --- | --- |
| `GET /partner/updates` | `client.updates.read` (active and onboarding clients) | `filter` = `all`, `unread` or `action` (unread required work), `category`, `page` | `{ filter, category, page, pages, total, unread, action, items[] }`, scoped by owner |
| `GET /partner/updates/unread` | read | — | `{ unread, action }` for the navigation badge |
| `POST /partner/updates/read` | `client.updates.write` | `id` or `all=1` | `{ updated, unread, action }`. Idempotent; another owner's id gives 404; a malformed id gives 422 |
| `GET /partner/updates/preferences` | read | — | `{ muted[], version, updatedAt, categories[] }` |
| `POST /partner/updates/preferences` | write | `expectedVersion`, `muted[]` (from `property`, `booking`, `case`) | 409 `PREFERENCES_CHANGED` when stale; 422 for any other category |
| `GET /partner/tasks` | `client.tasks.read` (active clients only) | — | `{ tasks[], unread, actionUnread }` |
| `GET /partner/listings` (extended) | — | `status` also accepts `resubmit` and `unbookable` | Same list; these back two of the tasks |

Each task is `{ key, kind, count, href }`. The count comes from the **same query its destination runs**:

| Task | Count source | Destination |
| --- | --- | --- |
| Bookings needing a handover, return or hours | `listBookingRecords` summary | `/partner/bookings?tab=action_needed` |
| Drafts or properties needing changes | `getClientListingsPage` | `/partner/listings?status=attention` |
| Edited and must be resubmitted | `getClientListingsPage` | `/partner/listings?status=resubmit` |
| Live but not bookable | `getClientListingsPage` | `/partner/listings?status=unbookable` |
| Unread required updates | inbox | `/partner/updates?filter=action` |
| Hidden by Rentra (info) | `getClientListingsPage` | `/partner/listings?status=hidden` |
| With Rentra for review (info) | `getClientListingsPage` | `/partner/listings?status=review` |
| Visits today (info) | `listBookingRecords` summary | `/partner/bookings?tab=today` |
| Unread updates (info) | inbox | `/partner/updates?filter=unread` |

### UI rules

- **Dashboard:**
  - Tasks and updates load independently. A failure shows "could not load" with **Try again**, never zero counts.
  - Only tasks with work appear. When there are none, it says "Nothing needs your attention right now".
  - Onboarding clients see their updates below the stepper.
- **Inbox:** Opening an update marks it read before navigating. If the read fails, the page says so and stays, so the read state never silently disagrees with what the client did. Only in-portal paths are followed.
- **Preferences form:** submitted from a transition so a refused save keeps the chosen boxes, and version-guarded against a second tab.
- **Property list:** new filter chips "Edited, resubmit" and "Live, not bookable".

### Fixes made during CP15

- The CP02 gate expected a records-only admin to see only **Bookings**. CP14 added **Booking cases**, which the same `admin.records.read` permission grants, so the expectation now lists both. This is a gate update, not a product change.

## 3. Verification

| Check | Result |
| --- | --- |
| Backend `npm test` with the disposable-DB URLs | 107/107, including `test/integration/client-updates.integration.test.js` and the new capability test |
| Backend `db:check`, drizzle drift check, ESLint, Prettier | Pass (31 migrations; no drift) |
| Frontend `npm test`, ESLint, Prettier, `next build --webpack` | 22/22 (adds `test/domain/client-updates.test.js`); 0 errors (4 existing OG-image warnings); pass; pass |
| CP15 gate `scripts/portal-gate/cp15_gate.py` (fixture `serve-property-review.mjs` with `FIXTURE_STAGE=published` on :4106, frontend on :3106) | **38/38**, twice — [results](rentra-client-admin-part15-gate.json) |
| Regression gates on this build | CP14 34/34 · CP13 31/31 · CP11/12 44/44 · CP10 37/37 · CP09 41/41 · CP08 56/56 · CP07 53/53 · CP06 39/39 · CP05 35/35 · CP04 38/38 · CP03 35/35 · CP02 34/34 |

The CP10–CP14 `.mjs` gates were replayed with each runbook's seed scripts. Their outage and fault-proxy gates were not re-run. The gates rewrite their committed result files; those files were compared (no content change) and restored.

Integration test scenarios:

- **What produces updates:** client actions and earlier history produce none. A changes-requested decision is required work with its reason and outcome, and another owner sees nothing.
- **Tasks:** the attention and required-update counts equal their lists.
- **Privacy:** approval, verification (with a private note and findings) and publication produce info updates with no findings, notes, operator email or admin id.
- **Bookability:** the live-not-bookable count equals the `unbookable` list.
- **Repeat delivery:** the same lifecycle event twice gives one booking update, marked as a simulation.
- **Preferences:**
  - Muting `account` gets 422; a stale save gets 409.
  - A muted booking cancellation arrives read, and the unread count is unchanged.
  - A hide in the muted `property` category still arrives unread as required work, with its reason.
- **Case messages:** owner and internal messages produce nothing; a Rentra client-audience message produces one, and internal text never leaks.
- **Read state:** another owner gets 404; marking read is idempotent and persisted; mark all read gives 0 unread, 0 action and an empty needs-action list.

Gate scenarios:

- **Updates from publication:** the publication journey produced persisted updates, with no findings or operator identity.
- **Permissions:**
  - A signed-out request gets 401.
  - Another owner sees none of these updates, and gets 404 marking one read.
  - A malformed id gets 422.
- **Counts:** the tasks equal their lists (live-not-bookable, attention, unread).
- **Dashboard at 1280 and 390px:** shows the not-bookable task and no "Portfolio health"; no overflow; axe clean. The Updates badge shows the unread count. The task opens its list, which shows the same count.
- **State change:** Rentra hides the property.
  - Required-work, hidden and unbookable counts follow the new state and still match their lists.
  - The inbox shows the hide with its reason; axe clean.
  - The needs-action filter lists only the hide. Opening it goes to the property overview and marks it read, persisted.
- **Repeat delivery:** a replayed Rentra case message (same request key) gives one update, and an internal note never reaches the owner.
- **Preferences through the UI:**
  - Muting Cases persists (version 1); a stale save gets 409; muting `account` gets 422.
  - A new muted Rentra message is stored but arrives read.
- **Mark all read:** persists across reload, and no empty badge remains.
- **Copy:** settings no longer promise owner SMS alerts.
- **Failed load:** with the API stopped, the inbox shows a retryable state, not an empty inbox.

Gate notes:

- The CP15 gate stops the fixture API at the end.
- As in CP09, the router updates the URL before rendering, so the gate waits for the destination's content.

## 4. Migration, configuration and deployment

| Environment | Status |
| --- | --- |
| Disposable local databases | `0030` applied by the tests and gate fixtures |
| Configured database (Neon) | **Applied** after the gate: `0029` and `0030` are recorded (read-only check during CP16, 27 September 2026). At the gate it had 29 of 31 recorded. |

Run `npm run db:migrate` in `rentra-backend` before this code runs against the configured database. Before `0030`, the updates and tasks endpoints fail, and so do the dashboard's task and update panels (they show their retry state).

Updates start from the moment `0030` is applied; earlier history is not replayed. No new configuration or secrets. Not deployed.

## 5. Limitations and next step

- **In-app only.** No SMS, email or push is sent to owners. Preferences control only whether informational updates arrive unread.
- CP13 incident closure and CP11 pricing events do not produce updates. Visit evidence is recorded by the owner themselves.
- Owner support cases are CP17; this inbox is not a messaging thread.
- Updates are kept indefinitely; there is no retention or archive control yet.
- Still open from CP12, and not addressed here: the webhook `redacted_payload` double-encoding makes webhook confirmation a no-op.
- **Next:** CP16 — caretaker invitations and property access.
