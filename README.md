# Rentra

Book a verified farmhouse, directly from the owner. No brokerage.

- **Plan:** [`docs/rentra-implementation-plan.html`](docs/rentra-implementation-plan.html) — 5 gated phases, 146 items
- **Design system:** [`docs/rentra-design-system.html`](docs/rentra-design-system.html) — palette, type, components

```bash
cp .env.example .env.local   # then fill DATABASE_URL
npm run seed:images          # dev photography into public/seed (gitignored)
npm run db:migrate && npm run db:seed
npm run dev                  # http://localhost:3000
npm run build && npm run lint
npm run worker               # the background job process
```

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · JavaScript · Tailwind v4 ·
shadcn/ui (radix) · Redux Toolkit + RTK Query · Zod + Joi · lucide-react +
react-icons · react-hot-toast

## Structure

```
app/
  (marketing)/     indexed — home, city, category, area, listing
  (app)/           Customer — booking, chat, trips        · noindex
  (partner)/       Client — listings, calendar, earnings  · noindex
  (admin)/         Super Admin                            · noindex
  api/webhooks/    EXTERNAL callers only
components/
  ui/              shadcn (generated — regenerate, don't hand-edit)
  rentra/          product components
lib/
  domain/          pure business rules — shared by app AND worker
  store/           Redux: client UI state only
  validation/      zod/ (client boundary) · joi/ (server env)
  db/
worker/            BullMQ jobs — deployed separately, versioned here
```

## The eight rules

1. **No `/api/*` for our own frontend.** Reads = Server Components querying the
   DB directly. Writes = Server Actions. Route handlers are for external
   callers only: Razorpay, WhatsApp, cron. A controller → JSON → `useEffect`
   round trip for a listing page is shipped JS, a spinner, and a page Google
   cannot read — which defeats the reason we chose Next.js.

2. **Redux is client UI state only.** Filter panels, wizard steps, form drafts,
   map/list toggle. RTK Query is scoped to authenticated noindex surfaces
   (partner, admin). Listings and availability never go in the store.
   *If the URL is indexable, RTK Query has no business in it.*

3. **Zod at every boundary, Joi for server env.** Zod = forms, Server Actions,
   route handler bodies, webhook payloads. Joi = `lib/validation/joi/env.js`,
   run once at boot. Never validate the same shape in both — two schemas for
   one thing drift, and the one that drifts is the one guarding the money.

4. **Every business rule lives in `lib/domain/`.** The refund calculator must
   be *one* function, imported by the checkout page, the webhook handler and
   the worker. This is why the repo is not split in two.

5. **Never add a colour.** Compose from the tokens in `app/globals.css`. Green
   means act-or-confirmed; amber is stars and peak pricing only; WhatsApp
   green is the single permitted exception. Check contrast before adding
   anything, and write down its job in the design system file.

6. **Store factory, never a singleton.** `makeStore()` per request/client. A
   module-level store leaks one user's state into another's response.

7. **Dark mode is scoped, never on `<html>`.** Public surfaces ship light-only
   on purpose — the content is photography. `className="dark"` on the
   partner/admin shells only.

8. **Read the bundled docs before writing Next.js code.** This is Next.js 16;
   `params` and `searchParams` are Promises, `middleware` is now `proxy`, and
   `revalidateTag` takes a cacheLife argument. See `AGENTS.md`.

## Database

Neon Postgres 18 + PostGIS 3.6, Drizzle ORM. 16 tables.

```bash
npm run db:generate   # after editing lib/db/schema/index.js
npm run db:migrate    # enables extensions, then applies ./drizzle
npm run db:seed       # 12 Surat-belt farmhouses, 90 days availability
npm run db:studio
```

Photography is fetched, not committed: `npm run seed:images` pulls 28
Unsplash photos into `public/seed` (gitignored, ~39MB of large clean sources).
They are stored deliberately oversized so `next/image` **downscales** — a
hero lands at 96KB AVIF on desktop, 27KB on mobile. Re-encoding an
already-compressed source at higher quality makes files *bigger*, which is
the trap the first pass fell into.

Seed data is grounded in real research of the Surat farmhouse market
(Sept 2026): real localities, real 12hr/24hr price bands, real amenity
vocabulary, deposits at ~40-50% of the 24hr weekend rate. The listings
themselves are invented — nothing is copied from a competitor.

**Seeded client:** `client@gmail.com` / phone `9000000001` (role `client`),
owns all 12 listings. The same phone also exists as a `customer` row sharing
one `person_id`, which is the single-role model working: uniqueness is on
`(phone, role)`, and KYC is done once.

Two constraints are enforced by Postgres, not application code:
`availability(rentable_id, day, slot)` composite PK is the double-booking
lock, and `UNIQUE(phone, role)` is the single-role rule.

Listing URLs are `/listing/[slug]-[publicCode]` and resolve by the **code**,
so retitling never 404s. `prepare: false` on the db client is mandatory —
Neon's `-pooler` is PgBouncer in transaction mode.

## Not wired up yet

Auth · KYC · Razorpay Route split payments · WhatsApp Business API ·
BullMQ queues in `worker/` · listing detail and city/area pages.

**Before designing the money flow**, call Razorpay and Cashfree and ask: *what
is the maximum period you will hold a split payment before mandatory
settlement, for a rental marketplace?* A Diwali booking made in August means
holding funds 70+ days. That answer shapes the schema.

> **Never run `drizzle-kit push` against this database.** It diffs the schema
> and applies changes directly, bypassing `./drizzle` migrations — which means
> no reviewable SQL, no backfills, and a real chance of dropping a constraint
> or a column with data behind it. Always `db:generate` then `db:migrate`, and
> read the generated SQL before applying it.
