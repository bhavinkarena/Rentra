# Part 05 — Customer identity and interrupted-login recovery

Implemented 13 September 2026. This part covers customer phone login and saved booking selections. Customer profile/shell work is Part 06; checkout and payment integration remain later parts. The [revised Razorpay Test payment flow](rentra-payment-flow.md) remains unchanged.

## Development login requested by the user

With `npm run dev`, leave `CUSTOMER_OTP_DELIVERY` unset (or set it to `development`). Open `/login`, enter a valid Indian mobile number, click **Send code**, then enter **123456**. No credentials or SMS are required. The form identifies development mode explicitly. A requested, browser-bound challenge is still required: the fixed code does not bypass expiry, one-time consumption, attempts, resend limits or account status.

Only explicit `NODE_ENV=development` or `test` permits development delivery. Missing environment, staging and production default to disabled delivery; explicitly selecting development mode there fails closed. Development-issued customer session tokens are also rejected outside development/test. The older partner `DEV_OTP_BYPASS` setting does not control customer login.

The configured Rentra database now has migrations **0010–0012 applied**, following the user's explicit request on 13 September 2026. Development login can now use the new tables. Integration/browser fixtures remain isolated in disposable databases; no seed, backfill or SMS was run against the configured database.

## Implementation

- [Customer identity service](../lib/auth/customer-identity.js) normalizes Indian mobile numbers, separates customer challenges from partner OTPs, and uses HMAC hashes bound to the challenge and browser. Codes expire after five minutes. PostgreSQL transaction locks serialize phone/IP limits and verification; wrong attempts commit, and only one concurrent verification can consume a challenge and create a session.
- Request limits: one code per phone per 60 seconds, three per phone per hour, twenty per IP per hour. Verification limits: five attempts per challenge, fifteen per phone per hour, sixty per IP per hour. Failed delivery consumes the request allowance and invalidates the challenge. Resending supersedes earlier challenges. A delivery timeout never triggers a second provider call or a development fallback.
- [Customer actions](../lib/auth/customer-actions.js) validate public inputs, bind challenges to an HttpOnly cookie and never return codes, hashes or provider responses. Successful login creates/reuses only the `(phone, customer)` account and explicitly creates new customers as active. An existing partner using that phone retains its role and status. Successful customer login writes an audit event containing IDs, with no phone/code/IP payload.
- [Migration 0011](../drizzle/0011_customer_identity.sql) adds challenges, rate events and revocable customer sessions. Its custom status-change trigger revokes sessions when a user changes role or leaves active status; reactivation does not revive revoked sessions. Logout revokes the current customer session. The DAL verifies the signed role, database account status, session owner, expiry and revocation. Pre-Part-05 customer JWTs without a session ID must log in again. Partner onboarding retains its pending-account path; suspended and blocked partners cannot enter protected partner pages.
- `/login` requires an explicit sign-out action before switching from a partner/admin session. Customer actions enforce the same boundary. Admin and partner authentication mechanisms are not used to create customer accounts.
- Desktop and mobile listing login buttons save only validated listing/dates/slot/guests in a signed, HttpOnly, SameSite cookie expiring after fifteen minutes. The server resolves the listing's return path; the allowlist rejects external URLs, encoded separators, traversal and query redirects. Arbitrary `next` parameters are ignored. No prices, quote IDs or inventory holds survive as authority.
- On return, the listing restores the selection and requests a new quote through the Part 04 service using the authenticated customer. Availability and prices are checked again. Login succeeds even if that quote is unavailable; the listing shows the current error. All 1–10 validated dates survive the service boundary; the current calendar remains a single-date UI until Part 10. Recovery cookies support refresh during their lifetime and then naturally expire.

## Future Twilio delivery

The [delivery adapter](../lib/auth/customer-delivery.js) implements Twilio's [Messages API](https://www.twilio.com/docs/messaging/api/message-resource): an authenticated form-encoded POST to the fixed Twilio endpoint, a `+91` recipient, configured sender and random six-digit code. It checks HTTP/provider acceptance, has a ten-second timeout, disallows redirects and never logs SMS bodies or provider responses. Acceptance is not proof of handset delivery. Transport tests mock the provider; no actual SMS was sent.

Configure these server-only variables when ready:

```dotenv
CUSTOMER_OTP_DELIVERY=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+...
SESSION_SECRET=<private random value of at least 32 characters>
CUSTOMER_AUTH_IP_HEADER=<single-IP header overwritten by your trusted ingress>
```

Leave `CUSTOMER_AUTH_IP_HEADER` empty locally. Missing/invalid values share the `unknown` IP bucket. In production the chosen ingress must overwrite the configured header and prevent direct untrusted access; do not select a client-controlled header or blindly trust the first `X-Forwarded-For` value. Validate real provider credentials, sender/destination availability and the approved message configuration in the deployment environment before enabling Twilio. No fallback SMS service is used.

## Verification

- `npm run verify:customer-identity`: disposable PostgreSQL migrations, concurrency, replay, wrong codes, expiry, browser binding, delivery failure, phone/IP limits, separate roles, durable revocation, signed selection and customer-owned requoting.
- Optional Chromium gate uses the same disposable fixture and a local Next development server. Set `CUSTOMER_BROWSER_DRIVER` to an installed `playwright-core/index.mjs`; optionally set `CUSTOMER_BROWSER_EXECUTABLE` and `CUSTOMER_BROWSER_PORT`, then run the identity command. It verifies wrong/correct code UI, desktop/mobile guest recovery, an owned fresh quote, refresh, cookie properties, and explicit partner/admin switching. The browser and server are closed before deleting the fixture database.
- `npm run verify:customer-foundation`, `npm run lint`, `npm run build -- --webpack`, `npm run db:generate`, and `git diff --check` provide regression/build/schema checks. The supported Webpack build avoids this workspace's existing Turbopack restriction.

All 15 identity scenario groups passed with the Chromium gate, and the disposable database was removed. Foundation checks: 28 passed. Lint: no warnings/errors. Production Webpack build: 35 pages generated. Schema generation: no drift. Diff check: clean. The initial disabled-slot fixture was corrected before the passing run; identical fixture city/area labels produced existing breadcrumb key warnings. Detailed evidence and limits are recorded in the [session handoff](rentra-customer-sessions.md).

## Migration follow-up — 13 September 2026

`npm run db:migrate` successfully applied 0010, 0011 and the new [0012 financial trigger alignment](../drizzle/0012_financial_trigger_alignment.sql). Preflight found a historical checksum mismatch for already-applied migration 0009; the installed immutability and financial-scope functions differed from the tested repository definitions. The forward migration replaces those two function definitions while retaining existing data, trigger attachments and the historical journal checksum. It restores the repository's null-safe immutability comparison, financial serialization and allocation scope checks.

Read-only post-migration checks confirmed hashes for 0010–0012, all five new tables, enabled gateway/session triggers, and exact deployed function bodies. No migrations remain pending; `db:generate` reports no schema drift. This follow-up verified deployed definitions; it did not rerun financial transaction fixtures against application data.

## Rollout and maintenance

1. Back up and apply reviewed additive migrations with the existing migration command before new readers. Preserve custom migration 0008's exclusion constraint, 0009's financial triggers/view, 0010's gateway trigger, 0011's session-revocation trigger, and 0012's forward financial-function repair. Drizzle generation alone does not recreate these custom SQL objects.
2. Verify the deployment environment and delivery mode. Production remains unavailable until Twilio is configured; `123456` is a development feature.
3. Confirm trusted ingress IP handling and perform authorized real SMS delivery checks separately. Browser/integration tests never message real recipients.
4. Retain rate events for at least their one-hour enforcement window. Operations may periodically delete rate events older than 24 hours, expired challenges older than 24 hours, and expired sessions according to the chosen retention policy. Never remove still-live rate events to resolve throttling. A scheduled cleanup job is not included in this part.
5. Customer holds, payment attempts, profile collection and account navigation are not delivered by this part. Payment remains default-disabled and the listing still states that online booking is unavailable.
