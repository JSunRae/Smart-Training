# Decisions Required (Owner)

Last updated: 2026-05-15

## Resolved for the current MVP

### D-001: MVP Boundary

- Selected scope: login, dashboard, scenario select, live text roleplay, coach pause, transcript persistence, session history, and an experimental voice lab.
- Deferred: advanced analytics, multi-org admin tooling, and mobile clients.

### D-002: Auth + Tenant Model

- Selected approach: local cookie-based auth with org-scoped access checks in every session route.
- Current implication: suitable for local MVP and pilot validation, not yet an enterprise SSO or federated auth solution.

### D-003: Retrieval Strategy

- Selected approach: deterministic local snippet ranking with optional OpenAI-generated response text.
- Current implication: good enough for the MVP loop, but not a substitute for a production retrieval stack.

### D-004: Transport Strategy

- Selected approach: synchronous text-first loop.
- Additional execution: experimental WebRTC voice lab backed by the OpenAI Realtime API, isolated from the persisted transcript workflow.

### D-005: Quality Gate

- Selected gate: route-level integration tests plus browser E2E automation in CI.
- Current result: achieved on May 15, 2026.

## Resolved owner approvals now executed

### D-006: Persistence Upgrade

- Selected approach: Postgres.
- Result: the API now supports a Postgres backend through `DATABASE_URL`, with shared rate limiting and the file store retained as a local fallback.
- Remaining external task: provision the managed Postgres instance for the target deployment environment.

### D-007: Privacy and Retention Policy

- Selected approach: 30-day transcript retention.
- Result: retention remains enforced through `SESSION_RETENTION_DAYS`, with immediate account-driven transcript deletion.

### D-008: AI Runtime Default

- Selected approach: deterministic text workflow by default, with OpenAI enhancement optional.
- Result: the main roleplay workflow remains deterministic unless both `OPENAI_API_KEY` and `OPENAI_TEXT_ENABLED=true` are configured.

### D-009: Realtime Audio

- Selected approach: keep voice outside the core transcript MVP, but build it as a separate experimental lab.
- Result: `/voice-lab` now uses the OpenAI Realtime API over WebRTC call setup through the API server, without changing the launch-critical text workflow, and it stays hidden unless `VOICE_LAB_ENABLED=true`.
