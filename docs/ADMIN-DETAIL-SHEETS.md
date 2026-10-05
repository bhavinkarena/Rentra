# Admin record detail sheets — behavior contract

Phase 3 establishes this contract. No admin list currently enables a View sheet. Bookings and people can adopt it in Phases 6–7 after the checks below; application/property decisions and finance investigations remain full-page workflows.

## URL and record context

- The list URL owns the selected record using `record=<id>`, alongside its supported search/filter/page parameters. Opening a record keeps that exact list context. Record sections use the existing `tab` key. Do not send presentation-only keys to list APIs.
- Every sheet has a separately reachable full-page detail URL and a labelled Full page link. Both presentations use the same authorized record content and commands, including visits, evidence, history, downloads and permission states.
- Validate the selected ID and return URL before rendering. A return URL must be a relative URL for the specific allowed list route, with no origin, backslash, encoded path traversal or protocol-relative path. An arbitrary `/admin/**` prefix is not sufficient. Unknown records are missing states; forbidden and unavailable are separate states.
- Close removes only the selected record and its record-section key. It restores the exact remaining list query, scroll position and invoking row focus. If that row disappeared after a mutation, focus the list heading. Directly opened/copied URLs have a safe list-heading fallback.
- Refresh and copied links reopen the same record. Back/Forward follows browser history consistently. Do not overwrite or consume another portal's history/session state.

## Protected focus and exit paths

- Use a labelled native modal `dialog`, or an existing accessible dialog primitive. Focus enters the heading or first meaningful control, stays inside the modal, and returns to the row on close. Background content is inert; scrolling is contained in the sheet.
- Close, Escape and backdrop clicks have one exit path. Pending commands cannot be interrupted by repeated close/submission clicks; show why an action is unavailable. Escape on a nested dialog closes that dialog first.
- Use the existing `UnsavedChangesGuard` mounted by `PortalShell`. Programmatic exit must call `requestPortalLeave()` and obey a cancelled result before replacing the URL. Links, Full page, browser Back/Forward and page unload must preserve draft protection too. A cancelled exit retains the record, URL, values and focus. Do not copy the owner modal's direct `router.replace` close handler.
- Failed commands retain values and show field/global errors. Success clears the draft only after a recorded outcome (`rentra:form-saved` where required). Financial commands retain preview expiry, version and idempotency rules; visual changes cannot retry them automatically.

## Presentation and shipping checks

Use existing white panels, ink dividers, forest navigation, `rounded-lg` surfaces and portal typography. On phones use a full-width sheet, readable evidence and 44 px controls; on desktop use a contained side sheet. Tables scroll inside their regions. Honour reduced motion. Skeletons match the record layout and have one loading announcement; a failed record read cannot become an empty or zero state.

Before enabling View for a module, verify full-page/sheet content parity, permission and private-file boundaries, filtered return context, copied URL/refresh, Back/Forward, Escape/backdrop/close, keyboard focus trap/restore, pending and stale-state behavior, draft cancellation on every exit path, and mobile/zoom containment. Test URL and exit behavior, not implementation-shaped CSS assertions. A sheet that omits required evidence or changes a command's semantics does not pass.
