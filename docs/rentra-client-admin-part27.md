# CP27 — Privacy fulfillment

Status: **IN PROGRESS — policy baseline prepared, 28 September 2026.** CP27's API, job, browser and recovery gates have not passed. It is not counted as complete.

## Recorded business policy

The project owner requested web research and a proper provisional Rentra policy before proceeding with fulfillment. [Rentra data retention and privacy fulfillment policy v1](rentra-data-retention-policy.md) records the result: India-first applicability, official sources, project retention periods, field treatment, holds, export controls, processor/backup responsibilities and accurate outcome wording.

The selected implementation direction is verified customer account closure with explicit partial-anonymization and retained-record outcomes. Full erasure must never be inferred from removal of the live profile. Each approved job needs a recorded policy version and case scope. The document supplies an internal development baseline; it does not establish legal sign-off or publish a customer promise.

## Remaining delivery

- Extend the acknowledgment queue to detail, identity/authority review, inventory and guarded approval.
- Implement scoped encrypted exports, live authorized/audited downloads, 24-hour availability and artifact cleanup.
- Implement staged closure, session revocation, profile-photo removal, preference cleanup, restart/retry and outcome receipts.
- Explicitly report historical PII, financial evidence, shared KYC, provider records, token detachment and backup disposal that remain or require separate work.
- Verify foreign-account exclusion, download expiry/revocation, partial failures/restart, stale approvals, financial integrity and customer regressions, then update the tracker with actual gate evidence.
- Validate legal-entity/GST scope and contacts; implement due-record/hold handling and the future DPDP historical-retention constraint before the applicable deployment. Public wording belongs to CP25's publication workflow.

## Evidence and deployment status

Official legal and regulator sources were researched on 28 September 2026 and linked in the policy. Documentation generation/link/status checks are recorded in this change; no runtime fulfillment gate is claimed.

| Check | Result |
| --- | --- |
| `python scripts/build-client-admin-plan.py` | Passed: 14 sections, 32 session cards, 25 completed parts |
| Generated HTML status/link assertions | Passed: CP27 in progress, policy and work-record links present, no CP27 completion claim or stale CP27–CP32 planned label |
| Local policy/work-record links | Passed: all referenced local documents exist |
| `git diff --check` in the frontend repository | Passed; Git reports existing Windows line-ending normalization notices |

No CP27 migration has been generated or applied to the configured database. No production deletion, provider disposal request, customer communication or public policy publication was performed. CP25 remains independently in progress. The total remains 25/32 complete.
