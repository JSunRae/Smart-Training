# Smart Training

Text-first sales roleplay MVP with:

- account creation and sign-in
- org-scoped dashboard and scenario library
- buyer simulation plus on-demand coach intervention
- persisted transcript history
- Postgres-backed deployment support with encrypted file fallback for local work
- deterministic default runtime with opt-in OpenAI-generated replies
- experimental OpenAI live voice lab over WebRTC when explicitly enabled
- automated route tests plus browser E2E coverage in CI

## Workspace layout

- `apps/web`: user-facing Next.js app
- `apps/api`: session, auth, and roleplay API
- `packages/core`: shared prompts, contracts, and simulation helpers
- `docs`: readiness, QA, and operating notes

## Quick start

1. Install Node.js 22.x and pnpm 9.x.
2. Install dependencies:

    ```powershell
    pnpm install
    ```

3. Copy `.env.example` values into your environment if you want to change defaults.
4. Optional: set `DATABASE_URL` if you want to run the API against Postgres instead of the local encrypted file store.
5. Optional: set `OPENAI_API_KEY` if you plan to enable OpenAI-backed features.
6. Optional: set `OPENAI_TEXT_ENABLED=true` if you want model-generated buyer and coach replies.
7. Optional: set `VOICE_LAB_ENABLED=true` if you want the `/voice-lab` realtime voice experiment.
8. For production, set `APP_SESSION_SECRET` and `DATA_ENCRYPTION_KEY`.
9. If you are using Postgres, run the schema bootstrap once against the target database:

    ```powershell
    pnpm --filter api db:bootstrap
    ```

    Smart Training does not use Prisma in the current launch path. `pnpm --filter api db:migrate` is kept only as a backward-compatible alias, and still just bootstraps missing tables and indexes. It does not apply versioned migrations.

10. Seed the active backend once if you want the baseline scenario library:

    ```powershell
    pnpm seed
    ```

    `pnpm seed` inserts the baseline library only into an empty backend. If scenario records already exist, it exits without changing them.

11. Start both apps in separate terminals:

    ```powershell
    pnpm dev:api
    pnpm dev:web
    ```

12. Open [http://localhost:3000](http://localhost:3000). The dashboard exposes the main text workflow. `/voice-lab` stays hidden unless `VOICE_LAB_ENABLED=true`.

Local default runtime posture: without `DATABASE_URL`, the API uses the encrypted file store outside production. First hosted pilot posture: `storageBackend=postgres`, `OPENAI_TEXT_ENABLED=false`, `VOICE_LAB_ENABLED=false`, `SESSION_RETENTION_DAYS=30`, and `/privacy` must show `NEXT_PUBLIC_SUPPORT_EMAIL` or `NEXT_PUBLIC_SUPPORT_URL`. `OPENAI_API_KEY` alone does not enable OpenAI-backed behavior; it only changes `/api/health` to report `openAiApiConfigured=true`.

OpenAI activation contract:

- Text generation becomes active only when both `OPENAI_API_KEY` and `OPENAI_TEXT_ENABLED=true` are set.
- Voice lab becomes active only when both `OPENAI_API_KEY` and `VOICE_LAB_ENABLED=true` are set.
- For the first hosted pilot, keep `OPENAI_TEXT_ENABLED=false` and `VOICE_LAB_ENABLED=false` so the product stays text-first, deterministic by default, and voice-disabled even if an API key is preprovisioned.

## Release checks

```powershell
pnpm release:check
```

`pnpm release:check` is the repo release gate. It runs `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, and `pnpm audit --prod` in sequence. Treat it as passed only when it is run from the repo root on the intended release revision and exits `0`; the production dependency audit is part of that pass condition. This is a local preflight gate, not the full hosted go/no-go by itself.

For a step-by-step deployment path, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and the included Render blueprint guide in [docs/DEPLOYMENT_RENDER.md](docs/DEPLOYMENT_RENDER.md). If you are launching the first hosted pilot, start with [docs/FIRST_HOSTED_PILOT_HANDOFF.md](docs/FIRST_HOSTED_PILOT_HANDOFF.md).

If you need the exact hosted launch variables for `web` and `api`, use [docs/LAUNCH_ENV_MATRIX.md](docs/LAUNCH_ENV_MATRIX.md). It is the single environment reference for the first pilot.

For hosted verification after deployment, start with `pnpm smoke:hosted -- --help`, then run one of these exact forms:

```powershell
pnpm smoke:hosted -- --api https://your-api-host
pnpm smoke:hosted -- --api https://your-api-host --web https://your-web-host --support-email pilot-support@example.com
```

The hosted smoke path is launch smoke, not full hosted QA. It verifies `/api/health`, optional `/privacy` retention and support-contact posture, registration, dashboard access, session start, seller turn, coach response, session completion, completed-session presence on the dashboard, account deletion, and post-delete logout behavior.
Use [docs/HOSTED_QA_CHECKLIST.md](docs/HOSTED_QA_CHECKLIST.md) for transcript reopen and visible UI checks that the smoke script does not cover.
Use `pnpm pilot:gate` when you want to require both the repo release gate and hosted smoke in one command.

For sales-facing positioning, showcase flows, and target-market recommendations, see [docs/CHALLENGER_MARKET_PACK.md](docs/CHALLENGER_MARKET_PACK.md).
Use [docs/SHOWCASE_RUNBOOK.md](docs/SHOWCASE_RUNBOOK.md) for repeatable demos and the vertical packs in [docs/VERTICAL_PACK_CYBER_INFRA.md](docs/VERTICAL_PACK_CYBER_INFRA.md) and [docs/VERTICAL_PACK_INDUSTRIAL_FIELD.md](docs/VERTICAL_PACK_INDUSTRIAL_FIELD.md) for market-specific motions.
For hosted pilot operations, start with [docs/FIRST_HOSTED_PILOT_HANDOFF.md](docs/FIRST_HOSTED_PILOT_HANDOFF.md), then use [docs/PILOT_LAUNCH_RUNBOOK.md](docs/PILOT_LAUNCH_RUNBOOK.md), [docs/HOSTED_QA_CHECKLIST.md](docs/HOSTED_QA_CHECKLIST.md), and [docs/HOSTED_DEMO_FLOW.md](docs/HOSTED_DEMO_FLOW.md) for detail.
Track the live owners, deploy ids, smoke results, rollback target, and launch evidence entries in [docs/PILOT_LAUNCH_RECORD.md](docs/PILOT_LAUNCH_RECORD.md). Each evidence row uses the same quick-fill fields: command or action, result, operator, timestamp, and notes or artifact location.

## Current status

As of June 6, 2026, the local launch candidate is committed on `codex/launch-readiness-audit` and anchored by tag `pilot-launch-2026-06-05`: `pnpm release:check` completes typecheck, lint, Vitest, build, Playwright E2E, and `pnpm audit --prod`; `pnpm audit` also reports no known vulnerabilities. The first hosted pilot posture is fixed: Postgres backend, 30-day transcript retention, explicit operator support contact on `/privacy`, `OPENAI_TEXT_ENABLED=false`, and `VOICE_LAB_ENABLED=false`. `OPENAI_API_KEY` remains optional and does not activate model-backed behavior unless a matching feature flag is enabled. Retrieval ingestion and usage monitoring remain post-MVP utilities: `scripts/ingest.ts` and `scripts/usage.ts` are not part of the launch gate, release checks, or hosted smoke path. Retrieval backend expansion, voice transport hardening, advanced analytics, and deeper admin workflows are intentionally deferred unless hosted pilot evidence proves they are required. The hosted pilot remains no-go until [docs/PILOT_LAUNCH_RECORD.md](docs/PILOT_LAUNCH_RECORD.md) is filled with live URLs, hosted smoke, hosted QA, support-contact, rollback, monitoring, and export evidence. The current blocker summary lives in [docs/READINESS_AUDIT.md](docs/READINESS_AUDIT.md), and the short follow-up queue lives in [docs/AGENT_TASK_BOARD.md](docs/AGENT_TASK_BOARD.md).
