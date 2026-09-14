<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Customer implementation completion

Whenever a numbered customer implementation part is completed, update `docs/rentra-customer-plan.html`, `docs/rentra-customer-sessions.md` and the corresponding part runbook in the same change. The HTML update must include the detailed “Part NN · complete” card under Delivery phases, with verified gate evidence and a runbook link, as well as the metadata, sidebar count/progress, build status, milestone row and phase footer. Do not update only the progress count.

Before reporting completion, check that every completed part has exactly one detailed HTML card and that no stale next-part labels remain. Record migration status and only checks that actually passed. Keep the browser's manual build checklist independent of recorded delivery status.
