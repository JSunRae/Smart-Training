# Testing Kickoff Checklist

Last updated: 2026-05-16
Owner mode: route-level integration tests + browser E2E automation

## 1) Baseline Environment

- [x] Install dependencies from workspace root: `pnpm install`
- [x] Confirm node engine compatibility (`>=22.18.0 <23`)
- [x] Configure optional OpenAI env vars (`OPENAI_API_KEY`, optional `OPENAI_API_BASE_URL`)
- [x] Seed the active backend with `pnpm seed`

## 2) Quality Gate

- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] `pnpm test` passes
- [x] `pnpm build` passes
- [x] `pnpm test:e2e` passes
- [x] `pnpm audit --prod` passes

## 3) API Integration Coverage

- [x] `GET /api/health` returns 200 + status payload
- [x] Register, logout, and login flow works
- [x] `POST /api/sessions/start` creates a session
- [x] `POST /api/sessions/:id/message` persists user and buyer turns
- [x] `POST /api/sessions/:id/coach` returns coach guidance
- [x] `POST /api/sessions/:id/complete` closes the session
- [x] Cross-org session access is denied
- [x] The Postgres backend passes the same auth and session lifecycle checks
- [x] `POST /api/realtime/call` returns a guarded 503 when voice credentials are absent

Reference: `apps/api/src/app/api/roleplay-flow.test.ts`

## 4) Manual UI Validation

- [x] Account creation succeeds and lands on the dashboard
- [x] Scenario can be selected and session started
- [x] Buyer response appears after a seller turn
- [x] Pause-for-coach returns guidance
- [x] Session completion persists the transcript
- [x] Saved history can be reopened from the dashboard

Reference: `docs/QA_MANUAL_CHECKLIST.md`

## 5) Remaining Launch Tasks

- [ ] Sync the included `render.yaml` Blueprint or translate it to the chosen host
- [ ] Configure the public support contact shown on `/privacy`
- [ ] Run `pnpm smoke:hosted` against the deployed API and hosted web origin
- [ ] Run the hosted manual QA pass in `docs/HOSTED_QA_CHECKLIST.md`
