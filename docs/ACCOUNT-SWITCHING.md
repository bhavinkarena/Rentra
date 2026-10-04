# Customer and owner account switching

Implemented 4 October 2026.

The owner header shows “Book a property” only when an active customer account already exists with the same verified mobile number. The API checks this without creating an account, and both owner navigation versions hide the button otherwise.

Normal mobile/OTP login remains the customer entry point. “List your space” is now a POST action that activates the owner's session and redirects to `/partner`. “Book a property” in the header of both owner navigation versions switches to the customer account and redirects to `/`, or to a saved listing selection. The owner login page also offers this booking action. An owner starting a booking directly from a listing switches automatically with the chosen dates and guests preserved.

Switching does not ask for another OTP or show a login screen while the authenticated session is valid and both roles share the same verified mobile. If the second role does not exist, the server creates it using the verified mobile: a customer is active; a new owner remains `pending_application` and must complete normal owner verification before publishing. Existing roles keep their account IDs, bookings, listings and approval state.

An email-only owner must verify their mobile once in owner onboarding details before switching. An existing account with an unverified mobile is not automatically adopted. Accounts using different mobile numbers are not automatically linked; a saved cookie from another person on a shared browser must never grant access to that person's workspace.

The server retains signed, HttpOnly customer and owner cookies alongside the active role cookie. Every reuse checks the live database session and account status, and matches the verified phone on both principals. Issuing a session through a verified mobile inherits the source database session expiry. Logout clears and revokes both roles. Switching does not extend database session lifetime or grant owner approval. Administrator sign-out keeps its separate behavior.

Navigation mutations use the existing identity signals to invalidate data across tabs. Owner switching honors the existing unsaved-form guard. Public marketing pages retain static rendering because authentication happens in a Server Action, rather than during their render.

## Verification

- Eight new PostgreSQL integration tests passed against a disposable local database: account creation and round trip, original account reuse and restrictions, unverified phones, revoked/expired/development sessions, saved session reuse and logout, shared-browser identities, concurrent switches, and booking selection preservation.
- The existing lightweight identity test passed: ten tests total, zero failures or skips, including the subsequent visibility check for missing, different, unverified, and suspended customer accounts.
- ESLint passed for the changed frontend files, backend controller and router, and new integration test.
- `next build --webpack` passed. Public API fetches used existing fallback content because the sandbox could not reach the API during prerendering.
- Header follow-up: the signed-out “Log in” label expands on hover and keyboard focus, matching Saved. Customer navigation refreshes on account-switch signals. A browser check confirmed both label interactions and no horizontal overflow at 390px. The full authenticated browser journey has not been performed.
- No database migration is required.

Run the integration tests with a disposable localhost PostgreSQL server:

```sh
PORTAL_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres \
  node --import ./loader/register.mjs --env-file=.env --test \
  test/integration/role-switch.integration.test.js test/services/identity-read.test.js
```
