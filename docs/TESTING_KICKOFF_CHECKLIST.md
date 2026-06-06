# Testing Kickoff Checklist

Last updated: 2026-06-05
Owner mode: API integration + manual UI validation

## 1) Baseline Environment

- [x] Install dependencies from workspace root: `pnpm install`
- [x] Confirm node engine compatibility (`>=22.18.0 <23`)
- [ ] Configure required env vars (`DATABASE_URL`, `OPENAI_API_KEY`, optional `OPENAI_API_BASE_URL`)
- [x] Verify API tooling and route tests execute from workspace root (`pnpm test`)

## 2) Database Setup

- [ ] Apply local schema bootstrap from `apps/api`: `pnpm --filter api db:bootstrap`
- [x] Deterministic seed command is implemented: `pnpm seed`
- [ ] Verify seeded org/user/scenario records exist

`pnpm --filter api db:migrate` remains available as a compatibility alias, but it runs the same bootstrap script and does not apply versioned Prisma migrations.

## 3) Baseline Quality Gate

- [x] `pnpm lint` passes
- [x] `pnpm test` passes
- [x] Record baseline outputs in sprint notes

## 4) API Integration Testing (To Implement)

Mandatory suites:

- [x] `GET /api/health` returns 200 + status payload
- [x] `POST /api/session/start` creates session with user + scenario
- [x] `POST /api/session/:id/message` persists user message and returns buyer message
- [x] `POST /api/session/:id/coach` returns coach intervention payload
- [x] `POST /api/session/:id/complete` closes session and persists final state

Error-path suites:

- [x] Invalid scenario/user handling
- [x] Unauthorized session access across org boundaries
- [x] Invalid session state transitions

## 5) Manual UI Validation (Near-Full Flow)

- [x] Login succeeds and user lands on dashboard
- [x] Scenario can be selected and session started
- [x] Buyer response appears after user turn
- [x] Pause-for-coach returns guidance and resumes flow
- [x] Session completion persists transcript/history
- [x] Existing session history can be viewed

## 6) Readiness Review Output

Before calling the product "testable", publish:

- [x] API integration test results (pass/fail)
- [x] Manual UI checklist results (pass/fail + defects)
- [x] Open blocker list by severity (P0/P1/P2) in [READINESS_AUDIT.md](READINESS_AUDIT.md)
- [x] Updated readiness score in `docs/READINESS_AUDIT.md`

Use the blocker severities in [READINESS_AUDIT.md](READINESS_AUDIT.md) as the launch-facing interpretation of this checklist:

- P0 means hosted pilot launch stays no-go until launch evidence is captured.
- P1 means close before external usage even if internal verification can continue.
- P2 means acceptable follow-up after pilot launch.
