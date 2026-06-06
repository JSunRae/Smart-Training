# Deployment Guide

Last updated: 2026-05-29

## Recommended launch shape

Use a **Postgres-backed deployment** for the current MVP:

- one `web` service for the user-facing app
- one `api` service for auth, session state, and transcript persistence
- one managed Postgres instance referenced by `DATABASE_URL`

The repo now includes a ready-to-sync Render Blueprint in [render.yaml](../render.yaml). If you want the shortest supported hosted path, start with [FIRST_HOSTED_PILOT_HANDOFF.md](FIRST_HOSTED_PILOT_HANDOFF.md), then use the Render-specific steps in [DEPLOYMENT_RENDER.md](DEPLOYMENT_RENDER.md).

If `DATABASE_URL` is omitted outside production, the API falls back to a local encrypted file store for local development and demo workflows. In production, requests now fail fast unless `DATABASE_URL` is present or `ALLOW_FILE_STORAGE_IN_PRODUCTION=true` is set as an explicit override for an intentional file-backed run.

## Launch environment

Use [LAUNCH_ENV_MATRIX.md](LAUNCH_ENV_MATRIX.md) for the authoritative web and API variable list, required-vs-optional status, and first-pilot defaults.

`OPENAI_API_KEY` alone does not switch on user-facing AI features. The current launch posture stays deterministic unless `OPENAI_TEXT_ENABLED=true`, and `/voice-lab` stays unavailable unless `VOICE_LAB_ENABLED=true`.

## Database contract

- `pnpm --filter api db:bootstrap` is the explicit database bootstrap command.
- `pnpm --filter api db:migrate` is a backward-compatible alias for the same script.
- For Postgres, the command opens the configured database and runs inline `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` statements. It bootstraps missing schema objects, but it is not a versioned migration system.
- For the file backend, the command only ensures the encrypted store file can be opened or created.
- `pnpm seed` inserts the baseline scenario and document library only when the target backend is empty. If any scenario rows or records already exist, seed exits without modifying them.
- Run bootstrap when pointing the API at a brand-new database, after a destructive reset, or any time you want an explicit readiness check before starting the app. Do not treat it as something that upgrades live schema revisions across releases.
- Run seed only when you want the stock baseline library in an empty backend. Do not run it expecting it to reconcile, refresh, or overwrite existing scenario data.

## Release procedure

1. Install dependencies: `pnpm install --frozen-lockfile`
2. For a new Postgres database, bootstrap the schema explicitly: `pnpm --filter api db:bootstrap`
3. If the target backend should contain the stock baseline library, seed it once: `pnpm seed`
4. Run the full gate: `pnpm release:check`
5. For a generic self-managed deploy, build assets: `pnpm build`
6. For a generic self-managed deploy, start the API: `pnpm start:api`
7. For a generic self-managed deploy, start the web app: `pnpm start:web`
8. For the Render Blueprint, use the per-service commands declared in [render.yaml](../render.yaml):
   - API build: `corepack enable && pnpm install --frozen-lockfile && pnpm build:api`
   - API pre-deploy: `pnpm --filter api db:bootstrap && pnpm seed`
   - API start: `pnpm --filter api exec next start --port $PORT`
   - Web build: `corepack enable && pnpm install --frozen-lockfile && pnpm build:web`
   - Web start: `pnpm --filter web exec next start --port $PORT`
9. Run the hosted smoke path: `pnpm smoke:hosted -- --api https://api.your-domain.example --web https://app.your-domain.example --support-email pilot-support@example.com`

Success criteria for the database steps:

- Bootstrap succeeds when the command exits cleanly and reports schema or store bootstrap completion.
- Seed succeeds when it either reports the number of inserted baseline scenarios and documents or explicitly reports that seeding was skipped because scenario data already exists.
- `GET /api/health` is still required for runtime posture, but it does not prove that bootstrap or seed has run.

References:

- [First hosted pilot handoff](FIRST_HOSTED_PILOT_HANDOFF.md)
- [Pilot launch runbook](PILOT_LAUNCH_RUNBOOK.md)
- [Pilot launch record](PILOT_LAUNCH_RECORD.md)
- [Hosted QA checklist](HOSTED_QA_CHECKLIST.md)
- [Hosted demo flow](HOSTED_DEMO_FLOW.md)
- [Render deployment guide](DEPLOYMENT_RENDER.md)

## Runtime expectations

- Terminate HTTPS in front of both services.
- Expose the same `DATABASE_URL` to every API instance.
- Treat a missing `DATABASE_URL` in production as a deployment misconfiguration. The supported hosted posture is `storageBackend=postgres` unless `ALLOW_FILE_STORAGE_IN_PRODUCTION=true` was set deliberately for a temporary exception.
- Route web `/api/*` traffic using the web environment precedence implemented in code: `INTERNAL_API_ORIGIN`, then `INTERNAL_API_HOSTPORT`, then `NEXT_PUBLIC_API_ORIGIN`, then `http://localhost:3001`.
- On Render, keep the API publicly reachable for operator checks and smoke tests, but let the web service reach it over `INTERNAL_API_HOSTPORT` for its own server-side traffic.
- Monitor `GET /api/health` for liveness and backend mode.
- Before pilot access opens, take one logical export of the managed Postgres database, name it with the launch timestamp and release revision, store it in operator-controlled storage for 30 days, and record the evidence in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
- Prefer service rollback first. Escalate to Render PITR or the retained logical export only for confirmed data loss, unrecoverable corruption, or a release issue that service rollback cannot fix, and keep the restore executor explicitly assigned in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
- If you enable `OPENAI_TEXT_ENABLED`, treat that as a deliberate product/cost choice rather than an automatic effect of having an API key available.
- If you enable `VOICE_LAB_ENABLED`, treat `/voice-lab` as experimental rather than part of the guaranteed transcript workflow.
- Ensure `/privacy` shows an operator-facing support contact before pilot access opens.

## Current scale boundary

With `DATABASE_URL` configured, persistence and rate-limit state are shared across API instances. The remaining boundary is product-level hardening, not basic storage consistency.
