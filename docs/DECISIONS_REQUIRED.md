# Decisions Required (Owner)

Last updated: 2026-05-29

This register tracks the current status of owner decisions against the implementation and launch posture in the repo. It is intended to be a live status artifact, not a brainstorming note.

## Status Snapshot

Use [FINAL_READINESS_REVIEW.md](./FINAL_READINESS_REVIEW.md) to run the final sign-off meeting against the decisions below and the linked launch evidence.

| Decision | Status | Current direction | Next action |
| --- | --- | --- | --- |
| D-001 | Implemented | Text-first MVP boundary is already reflected in product flows and launch docs | Owner to formally approve this as the pilot MVP boundary |
| D-002 | Implemented | First-party email/password auth with org-scoped tenancy is the current implementation | Owner to approve keeping this model for pilot instead of introducing external auth/SSO |
| D-003 | Deferred | No vector backend is in the MVP path; current retrieval uses local snippet ranking over scenario and document text | Owner to approve deferring pgvector/external vector DB selection for pilot |
| D-004 | Implemented | Text-first synchronous loop is the pilot path; voice remains experimental and disabled for launch | Owner to confirm that realtime audio is out of pilot scope |
| D-005 | Partially implemented | Repo gates and QA artifacts exist, but final owner-approved pass set for pilot sign-off is not yet explicit | Owner to approve the exact go/no-go checklist for pilot launch |
| D-006 | Implemented | Current MVP posture includes consent, deletion, retention, and support-contact requirements | Owner to approve the policy posture and complete hosted evidence capture |

## Decision Triage For The First Pilot

- Pre-pilot blockers: D-005 launch gate approval and D-006 hosted evidence capture remain tied to the current go/no-go path.
- Pilot hardening: D-001 and D-002 still need explicit owner approval so the implemented MVP and auth posture are intentional rather than implied.
- Post-launch unless evidence changes: D-003 retrieval backend expansion and D-004 realtime transport hardening are intentionally deferred for the first text-first pilot.

## D-001: MVP Boundary (Near-Full)

**Status**: Implemented current direction, pending formal owner sign-off.

**Implemented current direction**:

- In scope now: registration/login, dashboard, scenario selection, session start, buyer turns, coach intervention, transcript persistence, session history, and session completion.
- Out of scope in the current repo and launch posture: advanced analytics, deep reporting, multi-org admin tooling, deeper role-based admin workflows, and iOS/native delivery.

**What the repo already implies**:

- README and launch docs describe a text-first MVP with dashboard, scenario library, roleplay sessions, coach intervention, and persisted transcripts.
- Route tests cover the full roleplay lifecycle and transcript history for that journey.

**Required owner approval**:

- Approve that the pilot MVP boundary is the current text-first workflow.
- Approve that reporting/admin depth and native/mobile work stay out of pilot scope.

**Next action**: Mark this boundary approved in the launch record or keep it explicitly constrained as the pilot scope baseline.

---

## D-002: Auth + Tenant Model

**Status**: Implemented current direction, pending formal owner sign-off.

**Implemented current direction**:

- The repo uses first-party email/password authentication with signed app sessions.
- Each user belongs to a single organization for the current MVP model.
- Organization-scoped access is enforced in dashboard, scenarios, sessions, realtime call setup, and account-deletion flows.
- The first user in an organization is created as `ADMIN`; later users default to `SELLER` in the current registration flow.

**What the repo already implies**:

- There is no external auth provider, SSO, or multi-org membership model in the implementation.
- Integration tests explicitly cover cross-organization access blocking.

**Required owner approval**:

- Approve keeping first-party email/password auth for pilot.
- Approve the current one-organization-per-user tenant model for pilot.
- Approve deferring external auth/SSO and deeper role-based authorization until after pilot unless they become launch blockers.

**Next action**: Record explicit owner approval of the current auth and tenant posture, or reopen scope if external auth is mandatory before pilot.

---

## D-003: Retrieval Backend

**Status**: Deferred decision.

**Implemented current direction**:

- The roleplay flow currently builds context by chunking scenario and document text and ranking snippets in process.
- The standalone ingestion/query script surface remains a stub and does not back the live MVP workflow.
- No pgvector schema, external vector DB integration, or production retrieval pipeline is currently on the pilot-critical path.

**What the repo already implies**:

- The MVP can run without a vector backend today.
- Retrieval quality for the current pilot depends on seeded scenario/document content plus local snippet ranking, not on vector search infrastructure.

**Deferred decision**:

- Defer pgvector vs external vector DB selection until post-pilot hardening unless retrieval quality becomes a pilot blocker.

**Required owner approval**:

- Approve shipping the pilot without committing to pgvector, Pinecone, Weaviate, OpenSearch, or another vector backend.

**Next action**: Either approve the deferral for pilot, or explicitly fund a retrieval-backend implementation as a new pre-pilot requirement.

---

## D-004: Realtime Transport Strategy

**Status**: Implemented current direction, pending formal owner confirmation of scope.

**Implemented current direction**:

- The main MVP workflow is text-first and synchronous.
- Realtime voice exists only as an explicit opt-in voice-lab experiment.
- Pilot launch docs require `VOICE_LAB_ENABLED=false` and keep voice out of the launch gate.

**What the repo already implies**:

- Realtime audio is not required for the MVP gate.
- WebRTC voice experimentation is available only when deliberately enabled and configured with OpenAI credentials.

**Required owner approval**:

- Confirm that realtime audio is not part of the first hosted pilot scope.
- Confirm that `/voice-lab` remains experimental and disabled in the pilot environment.

**Next action**: Keep voice disabled for pilot unless the owner explicitly changes launch scope.

---

## D-005: Test Quality Gate

**Status**: Partially implemented.

**Selected direction**:

- Automated gate: `pnpm release:check` runs typecheck, lint, tests, builds, Playwright E2E, and production dependency audit.
- Workflow validation: manual QA and hosted smoke/runbook artifacts exist for the near-full text-first path.

**What is already implemented**:

- Local API integration coverage exists for the roleplay lifecycle on file and Postgres backends.
- Manual QA and hosted QA/runbook documents exist and are tied to launch readiness.
- Readiness docs define exit criteria for a testable product.

**Required owner approval**:

- Approve the exact pilot go/no-go pass set: which automated checks are mandatory, which manual checklist items are mandatory, and whether any hosted evidence can be waived.

**Next action**: Convert the current gate from "implemented in practice" to "owner-approved release standard" by approving [FINAL_READINESS_REVIEW.md](./FINAL_READINESS_REVIEW.md) as the final mandatory checklist.

---

## D-006: Privacy Guardrails for Pilot Testing

**Status**: Implemented current direction, pending policy sign-off and hosted evidence capture.

**Implemented current direction**:

- Transcript consent is required during registration and can be refreshed at login if missing.
- Account deletion removes the user and related session history.
- Retention defaults to 30 days via `SESSION_RETENTION_DAYS`.
- Production requires `DATA_ENCRYPTION_KEY`, and the customer-facing `/privacy` page publishes the current privacy/retention posture.
- Pilot launch docs require an operator-facing support contact on `/privacy`.

**What the repo already implies**:

- The current pilot posture is privacy-constrained and text-first by default.
- Optional OpenAI processing is treated as opt-in and documented as third-party processing when enabled.

**Required owner approval**:

- Approve the current minimum privacy posture for pilot: consent, deletion, 30-day default retention, support contact ownership, and opt-in third-party AI processing.
- Approve that hosted evidence still must be captured before launch, even though the repo posture is already implemented.

**Next action**: Keep the current controls and complete the hosted support-contact and launch-evidence fields before pilot opens.
