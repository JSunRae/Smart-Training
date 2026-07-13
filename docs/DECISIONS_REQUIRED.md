# Decisions Required (Owner)

Last updated: 2026-06-12

This register tracks the current status of owner decisions against the implementation and launch posture in the repo. It is intended to be a live status artifact, not a brainstorming note.

## Status Snapshot

Use [FINAL_READINESS_REVIEW.md](./FINAL_READINESS_REVIEW.md) to run the final sign-off meeting against the decisions below and the linked launch evidence.

| Decision | Status | Current direction | Next action |
| --- | --- | --- | --- |
| D-001 | Approved for pilot | Text-first MVP boundary is approved for the first hosted pilot | No pre-pilot action unless scope changes |
| D-002 | Approved for pilot | First-party email/password auth with org-scoped tenancy is approved for the first hosted pilot | No pre-pilot action unless external auth becomes mandatory |
| D-003 | Approved deferral | No vector backend is in the MVP path; current retrieval uses local snippet ranking over scenario and document text | Keep deferred unless retrieval quality becomes a proven pilot blocker |
| D-004 | Approved for pilot | Text-first synchronous loop is the pilot path; voice remains experimental and disabled for launch | Keep `VOICE_LAB_ENABLED=false` in the hosted pilot |
| D-005 | Approved for pilot | `pnpm release:check`, hosted smoke, hosted QA, hosted demo rehearsal, privacy, monitoring, backup/export, and launch-record evidence are the pilot pass set | Complete hosted evidence in `docs/PILOT_LAUNCH_RECORD.md` |
| D-006 | Approved for pilot | Current MVP posture includes consent, deletion, 30-day retention, support-contact requirements, and opt-in third-party AI processing | Complete hosted evidence capture before external access |

## Decision Triage For The First Pilot

- Pre-pilot blockers: D-006 hosted evidence capture remains tied to the current go/no-go path through [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md).
- Pilot posture approvals: D-001, D-002, D-004, D-005, and the D-006 policy posture are approved for the first hosted pilot based on the owner's implementation request on 2026-06-12.
- Post-launch unless evidence changes: D-003 retrieval backend expansion and D-004 realtime transport hardening are intentionally deferred for the first text-first pilot.

## D-001: MVP Boundary (Near-Full)

**Status**: Approved for the first hosted pilot.

**Implemented current direction**:

- In scope now: registration/login, dashboard, scenario selection, session start, buyer turns, coach intervention, transcript persistence, session history, and session completion.
- Out of scope in the current repo and launch posture: advanced analytics, deep reporting, multi-org admin tooling, deeper role-based admin workflows, and iOS/native delivery.

**What the repo already implies**:

- README and launch docs describe a text-first MVP with dashboard, scenario library, roleplay sessions, coach intervention, and persisted transcripts.
- Route tests cover the full roleplay lifecycle and transcript history for that journey.

**Owner approval recorded 2026-06-12**:

- Approve that the pilot MVP boundary is the current text-first workflow.
- Approve that reporting/admin depth and native/mobile work stay out of pilot scope.

**Next action**: Keep this boundary constrained as the pilot scope baseline unless the owner explicitly changes scope.

---

## D-002: Auth + Tenant Model

**Status**: Approved for the first hosted pilot.

**Implemented current direction**:

- The repo uses first-party email/password authentication with signed app sessions.
- Each user belongs to a single organization for the current MVP model.
- Organization-scoped access is enforced in dashboard, scenarios, sessions, realtime call setup, and account-deletion flows.
- The first user in an organization is created as `ADMIN`; later users default to `SELLER` in the current registration flow.

**What the repo already implies**:

- There is no external auth provider, SSO, or multi-org membership model in the implementation.
- Integration tests explicitly cover cross-organization access blocking.

**Owner approval recorded 2026-06-12**:

- Approve keeping first-party email/password auth for pilot.
- Approve the current one-organization-per-user tenant model for pilot.
- Approve deferring external auth/SSO and deeper role-based authorization until after pilot unless they become launch blockers.

**Next action**: Keep external auth, SSO, and deeper role-based authorization deferred unless they become mandatory before pilot.

---

## D-003: Retrieval Backend

**Status**: Approved deferral for the first hosted pilot.

**Implemented current direction**:

- The roleplay flow currently builds context by chunking scenario and document text and ranking snippets in process.
- The standalone ingestion/query script surface remains a stub and does not back the live MVP workflow.
- No pgvector schema, external vector DB integration, or production retrieval pipeline is currently on the pilot-critical path.

**What the repo already implies**:

- The MVP can run without a vector backend today.
- Retrieval quality for the current pilot depends on seeded scenario/document content plus local snippet ranking, not on vector search infrastructure.

**Approved deferral**:

- Defer pgvector vs external vector DB selection until post-pilot hardening unless retrieval quality becomes a pilot blocker.

**Owner approval recorded 2026-06-12**:

- Approve shipping the pilot without committing to pgvector, Pinecone, Weaviate, OpenSearch, or another vector backend.

**Next action**: Keep vector backend selection and production ingestion out of the pre-pilot lane unless retrieval quality becomes a proven blocker.

---

## D-004: Realtime Transport Strategy

**Status**: Approved for the first hosted pilot.

**Implemented current direction**:

- The main MVP workflow is text-first and synchronous.
- Realtime voice exists only as an explicit opt-in voice-lab experiment.
- Pilot launch docs require `VOICE_LAB_ENABLED=false` and keep voice out of the launch gate.

**What the repo already implies**:

- Realtime audio is not required for the MVP gate.
- WebRTC voice experimentation is available only when deliberately enabled and configured with OpenAI credentials.

**Owner approval recorded 2026-06-12**:

- Confirm that realtime audio is not part of the first hosted pilot scope.
- Confirm that `/voice-lab` remains experimental and disabled in the pilot environment.

**Next action**: Keep voice disabled for pilot unless the owner explicitly changes launch scope.

---

## D-005: Test Quality Gate

**Status**: Approved for the first hosted pilot; hosted evidence still pending.

**Selected direction**:

- Automated gate: `pnpm release:check` runs typecheck, lint, tests, builds, Playwright E2E, and production dependency audit.
- Workflow validation: manual QA and hosted smoke/runbook artifacts exist for the near-full text-first path.

**What is already implemented**:

- Local API integration coverage exists for the roleplay lifecycle on file and Postgres backends.
- Manual QA and hosted QA/runbook documents exist and are tied to launch readiness.
- Readiness docs define exit criteria for a testable product.

**Owner approval recorded 2026-06-12**:

- Approve the exact pilot go/no-go pass set: `pnpm release:check`, live `/api/health`, hosted smoke, hosted QA checklist, hosted demo rehearsal, `/privacy` support contact visibility, monitoring evidence, rollback anchors, and pre-pilot logical export evidence.
- Approve that no hosted evidence is waived before external pilot access.

**Next action**: Complete the hosted evidence rows in [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md).

---

## D-006: Privacy Guardrails for Pilot Testing

**Status**: Privacy posture approved for the first hosted pilot; hosted evidence still pending.

**Implemented current direction**:

- Transcript consent is required during registration and can be refreshed at login if missing.
- Account deletion removes the user and related session history.
- Retention defaults to 30 days via `SESSION_RETENTION_DAYS`.
- Production requires `DATA_ENCRYPTION_KEY`, and the customer-facing `/privacy` page publishes the current privacy/retention posture.
- Pilot launch docs require an operator-facing support contact on `/privacy`.

**What the repo already implies**:

- The current pilot posture is privacy-constrained and text-first by default.
- Optional OpenAI processing is treated as opt-in and documented as third-party processing when enabled.

**Owner approval recorded 2026-06-12**:

- Approve the current minimum privacy posture for pilot: consent, deletion, 30-day default retention, support contact ownership, and opt-in third-party AI processing.
- Approve that hosted evidence still must be captured before launch, even though the repo posture is already implemented.

**Next action**: Keep the current controls and complete the hosted support-contact and launch-evidence fields before pilot opens.
