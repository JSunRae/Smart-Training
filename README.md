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
9. Seed the active backend:

```powershell
pnpm seed
```

10. Start both apps in separate terminals:

```powershell
pnpm dev:api
pnpm dev:web
```

11. Open [http://localhost:3000](http://localhost:3000). The dashboard exposes the main text workflow. `/voice-lab` stays hidden unless `VOICE_LAB_ENABLED=true`.

## Release checks

```powershell
pnpm release:check
```

For a step-by-step deployment path, see [docs/DEPLOYMENT.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/DEPLOYMENT.md) and the included Render blueprint guide in [docs/DEPLOYMENT_RENDER.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/DEPLOYMENT_RENDER.md).

For hosted verification after deployment, run `pnpm smoke:hosted -- --api https://your-api-host`.
If you also pass `--web` and `--support-email`, the hosted smoke path verifies the live `/privacy` page and support-contact posture too.
Use `pnpm pilot:gate` when you want to require both the repo gate and hosted smoke in one command.

For sales-facing positioning, showcase flows, and target-market recommendations, see [docs/CHALLENGER_MARKET_PACK.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/CHALLENGER_MARKET_PACK.md).
Use [docs/SHOWCASE_RUNBOOK.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/SHOWCASE_RUNBOOK.md) for repeatable demos and the vertical packs in [docs/VERTICAL_PACK_CYBER_INFRA.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/VERTICAL_PACK_CYBER_INFRA.md) and [docs/VERTICAL_PACK_INDUSTRIAL_FIELD.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/VERTICAL_PACK_INDUSTRIAL_FIELD.md) for market-specific motions.
For hosted pilot operations, use [docs/PILOT_LAUNCH_RUNBOOK.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/PILOT_LAUNCH_RUNBOOK.md), [docs/HOSTED_QA_CHECKLIST.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/HOSTED_QA_CHECKLIST.md), and [docs/HOSTED_DEMO_FLOW.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/HOSTED_DEMO_FLOW.md).
Track the live owners, deploy ids, smoke results, and rollback target in [docs/PILOT_LAUNCH_RECORD.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/PILOT_LAUNCH_RECORD.md).

## Current status

As of May 15, 2026, the repo is publish-ready for a Postgres-backed text-first MVP deployment. OpenAI text generation and the voice lab are both explicit opt-in features. The current readiness state is summarized in `docs/READINESS_AUDIT.md`.
