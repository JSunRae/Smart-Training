# Readiness Audit (2026-06-06)

## Purpose

Assess how close the repository is to a **testable product** and define the shortest path to a validated MVP in a 3-4 week window.

## Scoring Model

Each pillar is scored 0-5:

- **0**: Not started
- **1**: Scaffold exists
- **2**: Partial implementation
- **3**: Functional but incomplete
- **4**: Testable with known minor gaps
- **5**: Release-ready against MVP definition

## Current Scores

| Pillar | Score | Evidence |
| --- | ---: | --- |
| Product completeness | 3.5/5 | Core text-first user journey works locally (auth, dashboard, session flow, coach pause, transcript history), while broader reporting/admin depth remains out of scope |
| Technical readiness | 4/5 | Monorepo, file and postgres-backed flows, route handlers, seed tooling, production storage guards, and file-store atomic writes are in place; the repo-root `pnpm release:check` preflight passed from committed launch revision tag `pilot-launch-2026-06-05` on 2026-06-06, including typecheck, lint, tests, build, Playwright E2E, and `pnpm audit --prod`; full `pnpm audit` also reported no known vulnerabilities; hosted migration and live deployment evidence still need completion |
| Test readiness | 4.5/5 | `vitest` runs package, API, script, and web tests with roleplay flow coverage on file and postgres backends, invalid completed-session transition coverage, privacy/deletion coverage, seed result coverage, and file-store recovery coverage; Playwright E2E smoke is wired and passing |
| Operational readiness | 2.5/5 | Security/privacy controls are documented as complete, but hosted launch evidence and rollout record fields are still open |

**Overall readiness estimate**: **~75% toward a hosted pilot-ready near-full MVP**.

Current first hosted pilot runtime posture: `storageBackend=postgres`, `OPENAI_TEXT_ENABLED=false`, `VOICE_LAB_ENABLED=false`, `SESSION_RETENTION_DAYS=30`, `OPENAI_API_KEY` optional and inert unless a matching feature flag is enabled, and `/privacy` must show `NEXT_PUBLIC_SUPPORT_EMAIL` or `NEXT_PUBLIC_SUPPORT_URL`.

## Current Launch Blockers By Severity

This is the current go/no-go summary for the first hosted pilot. Use it with [FINAL_READINESS_REVIEW.md](FINAL_READINESS_REVIEW.md), [PILOT_LAUNCH_RUNBOOK.md](PILOT_LAUNCH_RUNBOOK.md), [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md), and [HOSTED_QA_CHECKLIST.md](HOSTED_QA_CHECKLIST.md).

| Severity | Blocker | Owner | Evidence needed to close |
| --- | --- | --- | --- |
| P0 | Hosted release evidence is still incomplete for the launch revision. The local repo gate `pnpm release:check` passed from committed launch revision tag `pilot-launch-2026-06-05` on 2026-06-06, but the runbook still requires live `/api/health`, `pnpm smoke:hosted`, and hosted manual QA to pass before go. | Pilot operator / release owner | Fill the remaining hosted checks with pass/fail, runner, and timestamp in Section 4 of [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md); hosted QA must be marked pass from [HOSTED_QA_CHECKLIST.md](HOSTED_QA_CHECKLIST.md). |
| P0 | Live deployment metadata and rollback anchors are incomplete. Launch control still has `TBD` values for URLs and known-good deploy ids, so rollback and verification are not yet operationally grounded. | Pilot operator / deployment owner | Complete Section 3 and the known-good deploy ids in Section 5 of [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md) with the actual hosted web URL, API URL, health URL, and rollback targets. |
| P0 | Pilot environment posture required by the runbook is not yet evidenced on the hosted system. Support contact visibility, Postgres-backed health posture, restart or crash visibility, service logs, database visibility, backup confirmation, and the disabled text or voice flags have not been recorded from the live environment. | Pilot operator / privacy and infrastructure owner | Evidence that `/privacy` shows the support contact, live `GET /api/health` reports `storageBackend=postgres`, `openAiTextEnabled=false`, and `voiceLabEnabled=false`, and every required row in Section 4A of [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md) is filled with launch-day monitoring evidence. |
| P1 | Auth and tenant model decisions are implemented in practice but still lack explicit owner sign-off. External usage should not proceed while the intended access model is only implicit across code and docs. | Product owner / security owner | Update D-002 in `docs/DECISIONS_REQUIRED.md` with explicit selected posture and owner approval, then confirm the decision matches current org-scoped API behavior. |
| P2 | Retrieval backend selection is still open, but current hosted pilot scope remains text-first and does not require retrieval to validate the main launch path. | Product owner / platform owner | Either record a deferral for the first pilot or choose the retrieval posture in `docs/DECISIONS_REQUIRED.md`. |
| P2 | Realtime audio transport remains deferred for the text-first pilot and does not block the current hosted launch criteria. | Product owner | Keep voice disabled for pilot and record any future transport decision in `docs/DECISIONS_REQUIRED.md`. |
| P2 | Reporting depth, admin tooling, and placeholder retrieval or usage scripts remain outside the first pilot gate. They should not be treated as launch blockers unless MVP scope changes. | Product owner / platform owner | Keep them deferred in backlog or productionize after pilot without changing the current hosted go/no-go criteria. |

### Go / No-Go Alignment

- Use [FINAL_READINESS_REVIEW.md](FINAL_READINESS_REVIEW.md) as the meeting prompt for the final pilot review.
- Go only when every P0 item above is closed with evidence linked in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
- P1 items should be closed before external pilot access opens, even if internal verification can continue while they are still open.
- P2 items are accepted follow-up work after launch unless the MVP boundary is expanded.

## What Not To Chase Before Pilot Launch

Use the follow-up queue in [AGENT_TASK_BOARD.md](AGENT_TASK_BOARD.md) as the planning source of truth after the current pilot-ready line.

- Non-blocking for the current text-first hosted pilot: retrieval backend expansion, voice transport hardening, advanced analytics, deeper reporting, role-specific admin depth, and pricing or usage instrumentation.
- Pull any of those items back into the pre-pilot lane only if current repo or hosted evidence shows the text-first pilot cannot meet the launch contract without them.

## What Is Working Now

- Workspace scaffold and package boundaries are clean.
- Baseline commands pass:
  - `pnpm test`
  - `pnpm lint`
  - `pnpm --filter api db:bootstrap`
- API route coverage exists for health, realtime call setup, and the full roleplay lifecycle on both file and postgres-backed flows.
- Prompt assets and helper tests exist (`packages/prompts/*`, `packages/core/src/prompts.ts`, `packages/core/src/prompts.test.ts`).
- The API owns schema creation directly through `apps/api/src/lib/postgres.ts` and `apps/api/scripts/migrate.ts`; launch-time database setup is handwritten Postgres bootstrap SQL rather than Prisma generation or versioned migrations.

## Critical Gaps To Become Testable

### Product Gaps

- Reporting and role-specific admin depth remain limited to MVP scope.

### Technical Gaps

- Hosted database lifecycle proof remains incomplete (live bootstrap/seed verification and launch evidence rows).
- Retrieval and usage scripts are explicitly deferred post-MVP utilities and are non-blocking for the text-first hosted launch (`scripts/ingest.ts`, `scripts/usage.ts`).
- Auth and tenant direction are implemented, but the owner still needs to formally sign off on keeping that posture for pilot.

### Testing Gaps

- Hosted QA evidence is pending (`docs/HOSTED_QA_CHECKLIST.md`, `docs/PILOT_LAUNCH_RECORD.md`).

### Operational Gaps

- Hosted launch record remains `TBD` for URLs, deploy ids, and launch evidence.
- No final go/no-go evidence package has been captured yet.

## Feasibility Assessment

- **Feasible in 3-4 weeks** if scope is actively constrained to your near-full MVP definition and critical decisions are locked quickly.
- Main schedule risks:
  1. Delayed auth/tenant model decision.
  2. Building UI/API breadth before contract tests.

## Week-by-Week Execution Plan

### Week 1: Reconcile Current Status and Decisions

- Reconcile readiness, testing, and decision docs so current implementation state is consistent.
- Confirm owner sign-off on the implemented MVP boundary and auth/tenant posture, and approve retrieval deferral for pilot.

### Week 2: Hosted Validation and Evidence Capture

- Keep `pilot-launch-2026-06-05` as the local launch-candidate anchor unless a later committed revision is intentionally selected and the repo release gate is rerun.
- Execute hosted smoke and hosted manual QA and record outcomes.
- Fill launch-control artifacts with owners, timestamps, and rollback targets.

### Week 3: Reliability Hardening

- Validate operational alerting and backup/restore drills against hosted posture.

### Week 4: Pilot Go/No-Go Review

- Publish final blocker-severity list and decision outcomes.
- Execute formal go/no-go review using launch evidence package.

## Exit Criteria For “Testable Product”

All must pass:

1. Critical API integration suite is green.
2. Manual near-full user journey checklist is green.
3. Local bootstrap from clean environment succeeds using documented steps.
4. No P0 security/privacy blockers for transcript handling and tenant isolation.

## Immediate Next Build Tasks (Implementation Backlog)

1. Resolve remaining decision-register items with explicit owner sign-off (`docs/DECISIONS_REQUIRED.md`).
2. Deploy the tagged launch candidate, then fill live URLs, deploy ids, rollback anchors, support contact, and pre-pilot export details in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
3. Run hosted validation (`pnpm smoke:hosted` + hosted manual QA) and fill all hosted `TBD` launch evidence fields.
4. Publish blocker-severity list and final readiness update for pilot go/no-go.
5. Keep retrieval/usage scripts deferred until post-MVP billing/retrieval work is intentionally scheduled.
