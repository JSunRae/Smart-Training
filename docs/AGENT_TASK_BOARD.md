# AGENT_TASK_BOARD

## Assumptions

- Windows-first local development environment.
- Monorepo with `pnpm` and TypeScript.
- Web-first MVP; iOS is a later phase.

## Current Tasks

- [x] Initialize workspace scaffold
- [x] Add docs and configuration baselines
- [x] Add persona prompts and conversation templates
- [x] Add deferred retrieval/ingestion script stubs
- [x] Add deferred usage monitoring scaffold
- [x] Add basic Vitest and CI pipeline
- [x] Scaffold `apps/web` Next.js app
- [x] Scaffold `apps/api` Next.js/Node API
- [x] Add API health endpoint scaffold
- [x] Baseline readiness audit and scorecard (`docs/READINESS_AUDIT.md`)
- [x] Owner decision register (`docs/DECISIONS_REQUIRED.md`)
- [x] Testing kickoff checklist (`docs/TESTING_KICKOFF_CHECKLIST.md`)

## Started This Sprint (Readiness Execution)

- [x] Define near-full MVP acceptance criteria by user journey.
- [x] Document the implemented email/password auth and org-scoped tenant model; formal owner sign-off still pending.
- [x] Implement API session lifecycle endpoints for integration testing.
- [x] Add deterministic DB seed workflow for repeatable tests.
- [x] Add API integration test suite for critical roleplay flow.
- [x] Add manual QA runbook tied to MVP pass/fail gates.

## Progress Notes (2026-05-28)

- Fixed root Vitest alias resolution so API and web app tests can run from the workspace root.
- Confirmed route coverage passes for health, realtime, and full roleplay lifecycle on both file and postgres backends.
- Hardened the health route test so it is deterministic across local environments and CI.
- Confirmed deterministic seed command is wired through `pnpm seed` (`apps/api/scripts/seed.ts`).
- Confirmed local manual QA runbook exists and is passing (`docs/QA_MANUAL_CHECKLIST.md`).
- Published a single blocker-severity summary in `docs/READINESS_AUDIT.md` and linked it to hosted launch evidence artifacts.

## Progress Notes (2026-05-29)

- Confirmed `scripts/ingest.ts` and `scripts/usage.ts` are not referenced by package scripts, tests, runtime code, release checks, or hosted smoke.
- Marked retrieval ingestion and usage monitoring as deferred, non-blocking post-MVP utilities in the launch docs.

## Progress Notes (2026-06-05)

- Fixed API typecheck failures caused by direct `process.env.NODE_ENV` mutation in tests.
- Fixed Postgres seed-result reporting and added coverage for first-run insertion versus idempotent skip behavior.
- Hardened the local file store with atomic writes and empty-file recovery after an E2E run exposed a truncated-read failure mode.
- Upgraded the Vitest/Vite test toolchain and added targeted transitive overrides so both `pnpm audit` and `pnpm audit --prod` report no known vulnerabilities.
- Confirmed `pnpm release:check` passes on the audited working tree with 48 Vitest tests and the Playwright launch-flow E2E test.

## Progress Notes (2026-06-06)

- Created launch-candidate branch `codex/launch-readiness-audit` from `main@66e67e9`.
- Committed the full audited working tree with message `chore: prepare pilot launch candidate`.
- Confirmed `pnpm release:check` passes from the clean committed revision with 48 Vitest tests and the Playwright launch-flow E2E test.
- Confirmed full `pnpm audit` reports no known vulnerabilities.
- Created annotated launch anchor tag `pilot-launch-2026-06-05` on the passing committed revision.

## Risks / Follow-ups

- Retrieval backend choice is intentionally deferred for the text-first pilot; owner approval is still needed if that deferral is the launch posture.
- Realtime audio remains experimental and out of the pilot gate unless the owner explicitly changes scope.
- Pricing and usage scripts stay out of scope until post-MVP billing/reporting requirements are approved.
- Hosted database bootstrap evidence has not been captured from a live database yet.
- The launch candidate is committed and tagged, but it has not been deployed and hosted evidence is still incomplete.

## Follow-up Queue (After The Pilot-Ready Line)

Use this as the short planning queue once the current MVP boundary is accepted. If an item is not in the `launch-blocking` list below, do not pull it into pre-pilot work unless current hosted evidence shows the text-first pilot cannot run without it.

### Launch-blocking

Use [FINAL_READINESS_REVIEW.md](FINAL_READINESS_REVIEW.md) as the final meeting prompt before external access opens.

1. Capture the hosted evidence package in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md): live `GET /api/health`, `pnpm smoke:hosted`, hosted QA, and demo rehearsal results.
2. Fill live deployment metadata and rollback anchors in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md): web URL, API URL, health URL, support contact, and known-good deploy ids.
3. Verify the hosted pilot posture from the live environment: Postgres-backed health, `/privacy` support contact visibility, explicit backup/restore ownership, `OPENAI_TEXT_ENABLED=false`, and `VOICE_LAB_ENABLED=false`.
4. If the deployed revision changes after `pilot-launch-2026-06-05`, rerun `pnpm release:check` and update the launch record before opening access.

### Pilot hardening

1. Record explicit owner approval of the implemented pilot posture: MVP boundary, auth and tenant model, release gate, and privacy posture.

### Post-launch improvement

1. Retrieval backend expansion beyond local snippet ranking, including vector backend selection and a production ingestion path, stays deferred unless retrieval quality becomes a proved pilot blocker.
2. Voice transport hardening or productionizing `/voice-lab` stays non-blocking while the pilot remains text-first with `VOICE_LAB_ENABLED=false`.
3. Advanced analytics, deeper reporting, and richer scorecard depth stay outside the first pilot gate.
4. Role-specific admin depth, richer RBAC, and broader multi-org admin tooling stay deferred until after pilot.
5. Usage and pricing instrumentation remain post-pilot utilities rather than launch criteria.
