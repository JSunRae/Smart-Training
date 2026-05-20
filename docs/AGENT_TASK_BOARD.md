# AGENT_TASK_BOARD

Last updated: 2026-05-20

## Completed MVP work

- [x] Replace the starter web shell with a working product flow.
- [x] Implement auth, dashboard, scenario listing, session start, buyer turns, coach pauses, and session completion.
- [x] Persist users, sessions, messages, and documents in a repeatable local store and a Postgres backend.
- [x] Add deterministic seed data plus a one-command seed script.
- [x] Add route-level API coverage for auth, session lifecycle, and org isolation.
- [x] Upgrade Next.js and the dependency tree until `pnpm audit --prod` is clean.
- [x] Manually validate the full browser flow and record results.
- [x] Add shared Postgres-backed rate limiting for hosted deployments.
- [x] Add an experimental OpenAI realtime voice lab using WebRTC call setup through the API server.

## Current release posture

- [x] Publish-ready for a Postgres-backed MVP deployment.
- [x] CI release gate covers typecheck, lint, unit/integration tests, production build, browser E2E, and audit.

## Strategic follow-ups

- [ ] Sync the included `render.yaml` Blueprint or translate it to the chosen host.
- [ ] Run `pnpm smoke:hosted` against the deployed API and hosted web origin.
- [ ] Configure the public pilot support contact on `/privacy`.
- [ ] Record the live deploy ids, URLs, and smoke/QA evidence in `docs/PILOT_LAUNCH_RECORD.md`.
