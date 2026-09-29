# Navbar and footer rebuild

The user requested a stronger footer and navbar following the home redesign. Both public and protected customer layouts now use the same `CustomerHeader`: a sticky warm-white surround, framed white navigation surface, delivered wordmark on phones, pill-shaped active/login controls and a separate host link on wider screens. Existing role detection, account avatar, routes and skip links remain intact. Wrapping is allowed at every width for enlarged text.

The footer now uses a deep forest surface, a prominent closing invitation and grouped discovery, help and hosting links. Its city selector works consistently on desktop and mobile; six routes per city cover the category and all five occasions. All original destinations remain in the server-rendered HTML. Legal links and the intermediary statement remain visible. Contrast, focus and hover styles are scoped to these components.

## Verification

- [Live guest checks](rentra-ui-shell-rework-checks.json): 22 passed across 320, 390, 768 and 1440px. No horizontal overflow, 44px navigation targets, correct city routes, zero header/footer axe violations, contrasting keyboard focus and no runtime exceptions.
- [Authenticated fixture](rentra-ui-redesign-shell-rework-auth.json): 76 passed across 320–1440px. Customer destinations, account and saved active states, keyboard/skip links, 200% text, cross-layout navigation and guest/client/blocked/outage guards. Read-only in-memory API; no database, provider or API writes.
- Original footer destination comparison: zero missing links; 68 unique destinations in the new footer, including added occasion links.
- Desktop/mobile captures visually inspected under `.impeccable/redesign/shell-rework/`; authenticated phone capture under `shell-rework-auth/`.
- Independent finish review found the new footer materially improved the hierarchy. Its global wrapping safeguard was implemented; [Focused authenticated tablet checks](rentra-ui-shell-rework-wrap.json) passed all 34 checks after the safeguard; [guest 200% text checks](rentra-ui-shell-rework-guest-wrap.json) passed at 768 and 1024px.
- Scoped ESLint and Prettier passed. This focused shell change did not rerun the full production build or booking test suite.

Files: `components/customer/CustomerHeader.jsx`, `CustomerShell.module.css`, `FooterDiscovery.jsx`, both customer-facing layouts, and design/plan records. Portal sidebars and backend behavior were not changed. The wider redesign remains reopened.
