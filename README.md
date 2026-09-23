# Rentra frontend

Next.js App Router frontend for Rentra. The Express API in `../rentra-backend`
owns the database, migrations, authentication rules, uploads and workers.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_URL` to the backend URL (default `http://localhost:4000/api/v1`).
Run the backend separately and include the frontend origin in its CORS configuration.

## Structure

```text
app/                  Next.js layouts, pages, loading/error boundaries and download handlers
  (marketing)/        public server-rendered discovery and listing pages
  (customer)/         customer account, bookings, checkout and support
  (partner)/          owner onboarding and portal
  (wizard)/           listing setup
  (admin)/            administration
components/           product components; ui/ contains shadcn components
lib/
  api/                shared API config, server-capable fetch client and endpoint facade
  actions/            Server Actions preserving cookies, redirects and revalidation
  services/           AOG-style RTK Query base API and feature endpoint injection
  store/              per-render store factory, provider, hooks and UI slices
  domain/             pure domain helpers
  validation/zod/     form schemas
```

## Data and state

Redux Toolkit, React Redux and RTK Query use the same libraries as AOG.
`lib/services/baseApi.service.js` owns the sole API reducer/middleware. Feature
services call `injectEndpoints` and export hooks. Import hooks directly from the
customer, partner or admin service inside a Client Component. Query results retain
the backend envelope: `data.data` is the payload; `data.redirect` and
`data.revalidate` remain available. Errors retain `code`, `message` and `errors`.
Mutation input is the backend's existing JSON or FormData body. Do not invent
fields or skip the existing preview/confirmation flow for financial actions.

The provider creates an isolated store for each render/client and cleans up RTK
Query listeners. Public data stays in Server Components. Existing pages and forms
continue through `lib/api/endpoints.js` and Server Actions, preserving SSR, session
cookie relay, navigation and cache revalidation. The new service hooks are ready
for client-driven features; existing screens were not converted to client fetching.
On any future client-only account switch/logout, dispatch
`baseApi.util.resetApiState()` before displaying another account's data.

Tailwind v4, shadcn/Radix, Zod, toast and icon libraries remain configured as before.
Next routing replaces AOG's React Router; no Vite configuration is needed.

## Quality commands

```bash
npm run lint          # Next.js/React rules plus Prettier formatting
npm run lint:fix      # automatic ESLint fixes and document formatting
npm run format
npm run format:check
npm test              # RTK Query transport, errors and store isolation
npm run build
npm run ci
```

VS Code recommendations and format-on-save settings are in `.vscode/`.
Historical delivery reports and generated assets are excluded from formatting.

See [architecture alignment](docs/architecture-alignment.md),
[customer plan](docs/rentra-customer-plan.html),
[design system](docs/rentra-design-system.html) and
[delivery sessions](docs/rentra-customer-sessions.md).
