# CP08 — Listing revisions and administrative restrictions

Status: **COMPLETE — 26 September 2026.** A disposable-PostgreSQL service test, a pure-rule unit test and a 56-check browser/API gate passed. Migration `0027_property_restrictions` is **not yet applied** to the configured database, and neither are `0024`–`0026` (see §4).

## 1. Scope and revisions

- Linked IDs: CP08; acceptance CA03, CA05, CA23; gaps G10 and G01 (final part of the property workflow).
- Baseline: frontend `f191a26`, backend `dcb8e0e` (CP07 committed). CP08 changes are uncommitted in both repositories.
- Delivered:
  - **Admin visibility restriction** (hide and restore). It is separate from owner pause and has reasons, an impact preview and version guards. An owner cannot undo it.
  - **Race safety** for owner edits and owner pause/resume. Both now decide on the row as it currently is, under its lock or with a conditional update.
  - **Documented admin corrections** of public text. They are guarded by `content_version` and audited with before and after values.
  - **Revision comparison:** a field-level diff of the selected submitted revision against the published revision, or else the previous pass.
  - **Activity history:** every recorded lifecycle event for the property.
  - **No cascading deletion of business history:** review, verification and customer-review rows now block deletion of the property.
- **Revision model (recorded decision):** the current re-review behaviour is kept. A trust edit takes the property out of search until it is reviewed, verified and published again. There are no separate public and working revisions. Confirmed bookings keep their accepted `listing_snapshot`.

## 2. API, schema and behavior

### Migration `0027_property_restrictions`

- `rentable` adds `restricted_at`, `restricted_by` (FK `admin_user`, set null), `restriction_reason` and `lifecycle_version`.
- `version_listing_content()` is replaced:
  - The restriction columns and `lifecycle_version` are not content.
  - **Every status or prior-status change, and every restriction change, bumps `lifecycle_version`.** Every writer is covered: owner, admin, publication and verification.
  - A content change while hidden from `pending_verification` moves `prior_status` to `pending_review`. This is the same rule that applies to a visible property.
- The `listing_review.rentable_id`, `verification_visit.rentable_id` and `review.rentable_id` foreign keys change from `cascade` to `restrict`. Bookings, quotes, holds and submissions already restricted deletion. No delete command exists for properties.

### Policy (recorded decision)

**Status meanings**

| Status | Controlled by | Meaning |
| --- | --- | --- |
| `paused` | Owner | Owner pause (live ↔ paused) |
| `hidden` | Rentra only | Admin restriction. The status it replaced is kept in `prior_status`. |

**Hide**

- Allowed from live, paused, pending review, pending verification, draft or rejected.
- Takes effect at once:
  - discovery, the public page, quotes and new confirmations stop (they all require `live`);
  - a payment captured for an in-progress hold is refunded by the existing settlement rule.
- Confirmed visits stay confirmed. The customer, the owner and admin keep the booking record, arrival details and accepted snapshot.

**While hidden, the owner**

- cannot pause, resume, submit or publish;
- can still edit. A trust edit (photos, address, capacity, amenities, title, rules) moves `prior_status` to `pending_review`, so restoring never publishes unreviewed trust content.

**Restore**

- Returns the property to `prior_status`. Its normal rules then apply: publication checks, and the account check in public reads.
- Legacy hidden rows without a prior status return to `paused` if they were ever published, otherwise to `draft`.

**Owner trust edit on a paused property**

- It now goes to `pending_review` too. Before, it stayed paused and could be resumed with unreviewed content.

**Corrections**

- Limited to title, description, highlight and extra house-rules text.
- Allowed only while live, paused or hidden. A property in review is corrected through the review decision.
- The status is unchanged, because the admin is the reviewer. The published revision (`published_submission_id`) is unchanged.
- A title change also updates the slug and revalidates the old URL.
- The owner sees "Rentra corrected … on …: reason".

### Endpoints (`/api/v1`, all `admin.properties.write`)

| Method and path | Input | Result / errors |
| --- | --- | --- |
| `GET /admin/properties/:id` (extended, read) | — | Adds `lifecycle` (see below) and `activity[]` (audit entries for the property, newest first: actor, action, before, after, reason, time). |
| `GET /admin/properties` (extended) | `status` also accepts `live`, `paused` and `hidden` | — |
| `POST /admin/properties/:id/hide` | `expectedVersion` (the `lifecycle.version`), `reason` (10–2000, shown to the client) | `{ id, status: 'hidden', priorStatus }`. 409 `LISTING_CHANGED`, `ALREADY_HIDDEN`; 422 |
| `POST /admin/properties/:id/restore` | `expectedVersion`, `reason` | `{ id, status }`. 409 `LISTING_CHANGED`, `NOT_HIDDEN`; 422 |
| `POST /admin/properties/:id/correction` | `expectedContentVersion`, `reason`, and optionally `title`, `description`, `highlight`, `rulesNotes` | `{ id, changed[], contentVersion }`. 409 `CONTENT_CHANGED`, `CORRECTION_NOT_ALLOWED`; 422 (including "Nothing changed.") |
| `GET /partner/listings/:id` (extended, client) | — | Adds `listing.restriction` (reason and time) and `listing.adminCorrection` (fields, reason, time). The acting operator is never exposed. |
| `POST /partner/listings/:id/pause` (changed) | — | A conditional update on the status the owner saw. While hidden it returns 422 "Rentra has restricted this property. Only Rentra can restore it…". |
| `GET /partner/listings` (fixed) | `status` now accepts the owner filter chips (`review`, `attention`, `hidden`, …) | Previously these were refused by validation |

`lifecycle` contains:

- `version`, `contentVersion`, `status`, `priorStatus`, `publiclyVisible`;
- `restriction` (time, operator email, reason);
- `upcomingVisits`, `activeHolds`, and `visits[]` (up to 10);
- `hide`, `restore` and `correction`, each with `allowed`, `blockedReason` and its consequences or current values. `restore` also carries the restore `target`.

### Rules

- **Locking:** each command locks the property row, checks its version, and writes one audit entry: `listing_hidden` (with upcoming visits and active holds), `listing_restored` or `listing_corrected`. Owner edits (`applyEdit`) now run in a transaction that locks the row and applies the pure `ownerEditEffect` rule. Owner pause and resume use `ownerPauseTarget` and a conditional `WHERE status = <seen>` update.
- **Races:**

  | Race | Result |
  | --- | --- |
  | Owner pause, then an admin hide prepared before it | Hide gets 409 |
  | Hide, then an owner resume | Resume refused |
  | Two restores | One succeeds, one gets 409 |
  | Publication and hide | Exactly one commits. Hide first blocks publishing; publish first makes the hide stale. |
  | Material edit and hide | Serialized on the row lock. The edit's status change makes an older hide stale. |

- **Admin UI:**
  - A new **Visibility & corrections** tab shows current visibility, status before, upcoming visits, holds, the restriction notice, the hide form (impact preview plus confirmation), the restore form (states the return target) and the correction form.
  - The **Submitted property** tab shows "Changes since pass N (published)" as a table.
  - The **History & activity** tab adds the activity timeline.
  - The queue has Live, Paused and Hidden filters, and the badge reads "hidden by Rentra".
  - The shared `PropertyCommandForm` now backs both verification and lifecycle forms.
- The CP07 gate now looks for the renamed **History & activity** tab.
- **Client UI:**
  - "Hidden by Rentra" shows the reason, states what still works, and offers no resume control. It replaces the old copy that promised an email reply.
  - The paused state warns that trust edits need review.
  - The live state shows admin corrections.
  - The re-approval notice says to resubmit, and no longer promises two working days.
  - The status badge and filter read "Hidden by Rentra".

## 3. Verification

| Check | Result |
| --- | --- |
| Backend `npm test` with the disposable-DB URLs | 90/90, including `test/integration/property-restrictions.integration.test.js`, `test/services/listing-lifecycle.test.js` and the new capability test |
| Backend `db:check`, drizzle drift check, ESLint, Prettier | Pass (28 migrations; no drift) |
| Frontend `npm test`, ESLint, Prettier, `next build --webpack` | 19/19 (adds `test/domain/revision-diff.test.js`); 0 errors (4 existing OG-image warnings); pass; pass |
| CP08 gate `scripts/portal-gate/cp08_gate.py` (fixture `serve-property-review.mjs` with `FIXTURE_STAGE=published` on :4106, frontend on :3106) | **56/56**, twice — [results](rentra-client-admin-part08-gate.json) |
| Regression gates on this build | CP07 53/53 · CP06 39/39 · CP05 35/35 · CP04 38/38 · CP03 35/35 · CP02 34/34 |

Integration test scenarios:

- **Hide and the owner pause:**
  - Live with one confirmed visit: preview.
  - A short reason gets 422.
  - An owner pause makes an earlier hide stale.
  - Hide over pause; a second hide gets `ALREADY_HIDDEN`.
- **While hidden:**
  - Owner resume refused.
  - The public read is gone.
  - Submit refused.
  - Admin and owner booking records keep the accepted title and arrival address.
  - The client context shows the reason.
- **Restore:**
  - Concurrent restores: one winner.
  - Restore returns to paused, and the owner resumes.
  - A trust edit while hidden makes restore go to `pending_review` and require resubmission.
- **Publication:**
  - Hide blocks publishing a verified revision, and restore returns it to verification.
  - Publish and hide racing: exactly one commits.
  - A price change while hidden from verification invalidates the approval.
- **Corrections:**
  - Stale version gets 409; a no-op gets 422.
  - A title and rules correction keeps the property live and keeps `published_submission_id`, updates the slug, and records before and after values.
  - The client context lists the corrected fields.
  - A correction is refused while in review.
- **History:**
  - The activity includes hide, restore, correction and publish.
  - The booking snapshot is unchanged.
  - Deleting the property fails on the foreign keys (bookings, then review history).

Gate scenarios:

- **Access:** on hide, restore and correction, a client cookie gets 401 and a records-only operator gets 403. A malformed id gets 400. The live filter lists the property.
- **Visibility tab at 1280 and 390px:** previews the confirmed visit, no overflow, axe clean.
- **Owner pause and admin hide:**
  - The owner pauses through the UI; a hide prepared before the pause gets 409.
  - UI hide with reason and confirmation records the restriction over the pause, and the admin sees the reason.
- **While hidden:**
  - The public page is not found.
  - The owner sees "Hidden by Rentra" and the reason, with no resume button.
  - The owner pause API returns 422 with the restriction message, and the property stays hidden.
  - The customer's booking API and page stay available, with the accepted snapshot title and the arrival address.
- **Restore and trust edit:**
  - UI restore returns to paused, and the owner resumes through the UI.
  - Hide again, then an owner capacity edit while hidden: the property stays hidden and the restore target becomes review, stated in the preview.
  - UI restore goes to `pending_review`.
  - A correction is refused in review, and the tab explains why.
- **Comparison:** the owner resubmits; the submission tab shows "Changes since pass 1 (published)" with Capacity 12 → 14 and no unchanged fields; axe clean.
- **Correction:**
  - Re-approval, re-verification and publish.
  - UI correction of the title keeps the property live on the same published revision.
  - A stale correction gets 409.
  - The public page shows the corrected title, and the owner sees "Rentra corrected".
- **History:** the activity shows hidden, restored, corrected, paused and resumed events; axe clean. The booking snapshot is unchanged.

Gate notes:

- The CP03 gate revokes the CP02 client's session (suspension test). Run CP02 first, or mint a fresh client session before re-running it.
- The CP02 gate stops the API on purpose.

## 4. Migration, configuration and deployment

| Environment | Status |
| --- | --- |
| Disposable local databases | `0027` applied by the tests and gate fixtures |
| Configured database (Neon) | **Not applied**, and neither are `0024`–`0026` |

**The configured database needs `npm run db:migrate` in `rentra-backend` before this code runs against it.**

No new configuration or secrets. Not deployed.

## 5. Limitations and next step

- There is no separate archived state. Hide is the retirement control, and the property row, its URLs and its history are kept. An explicit archive with a redirect policy needs a product decision.
- Corrections cover public text only. Trust facts go back to the owner through review.
- There are no separate public and working revisions: a trust edit still takes a live property out of search until it is re-published.
- The hide reason is shown to the client. There is no separate internal note field yet.
- There is no email or SMS to the owner about a restriction or correction; they see it in the workspace.
- **Next:** apply `0024`–`0027` to the configured database, then CP09: the client property operations hub.
