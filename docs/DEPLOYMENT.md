# Deployment Guide

Last updated: 2026-05-16

## Recommended launch shape

Use a **Postgres-backed deployment** for the current MVP:

- one `web` service for the user-facing app
- one `api` service for auth, session state, and transcript persistence
- one managed Postgres instance referenced by `DATABASE_URL`

The repo now includes a ready-to-sync Render Blueprint in [render.yaml](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/render.yaml). If you want the shortest supported hosted path, use the Render-specific steps in [DEPLOYMENT_RENDER.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/DEPLOYMENT_RENDER.md).

If `DATABASE_URL` is omitted, the API falls back to a local encrypted file store. That fallback is still useful for local development and demos, but it is no longer the preferred publish path.

## Required production environment

### Web

- `NODE_ENV=production`
- `INTERNAL_API_ORIGIN=https://api.your-domain.example` or `INTERNAL_API_HOSTPORT=smart-training-api:10000`
- `NEXT_PUBLIC_SUPPORT_NAME=Smart Training Pilot Support`
- `NEXT_PUBLIC_SUPPORT_EMAIL=<pilot-support@example.com>` or `NEXT_PUBLIC_SUPPORT_URL=<support portal>`

Optional:

- `NEXT_PUBLIC_API_ORIGIN=https://api.your-domain.example`

### API

- `NODE_ENV=production`
- `DATABASE_URL=<managed postgres connection string>`
- `APP_SESSION_SECRET=<high-entropy secret>`
- `DATA_ENCRYPTION_KEY=<64-char hex or base64url 32-byte key>`
- `SESSION_RETENTION_DAYS=30`

### Optional API environment

- `OPENAI_API_KEY`
- `OPENAI_API_BASE_URL`
- `OPENAI_TEXT_ENABLED=false`
- `VOICE_LAB_ENABLED=false`
- `OPENAI_MODEL`
- `OPENAI_REALTIME_MODEL=gpt-realtime`
- `OPENAI_REALTIME_VOICE=marin`

`OPENAI_API_KEY` alone does not switch on user-facing AI features. The current launch posture stays deterministic unless `OPENAI_TEXT_ENABLED=true`, and `/voice-lab` stays unavailable unless `VOICE_LAB_ENABLED=true`.

## Release procedure

1. Install dependencies: `pnpm install --frozen-lockfile`
2. Initialize the database schema: `pnpm --filter api db:migrate`
3. Seed initial data: `pnpm seed`
4. Run the full gate: `pnpm release:check`
5. Build assets: `pnpm build`
6. Start the API: `pnpm start:api`
7. Start the web app: `pnpm start:web`
8. Run the hosted smoke path: `SMART_TRAINING_API_ORIGIN=https://api.your-domain.example pnpm smoke:hosted`

References:

- [Pilot launch runbook](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/PILOT_LAUNCH_RUNBOOK.md)
- [Pilot launch record](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/PILOT_LAUNCH_RECORD.md)
- [Hosted QA checklist](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/HOSTED_QA_CHECKLIST.md)
- [Hosted demo flow](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/HOSTED_DEMO_FLOW.md)
- [Render deployment guide](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/DEPLOYMENT_RENDER.md)

## Runtime expectations

- Terminate HTTPS in front of both services.
- Expose the same `DATABASE_URL` to every API instance.
- Route `/api/*` traffic to the API origin declared in the web environment.
- Monitor `GET /api/health` for liveness and backend mode.
- If you enable `OPENAI_TEXT_ENABLED`, treat that as a deliberate product/cost choice rather than an automatic effect of having an API key available.
- If you enable `VOICE_LAB_ENABLED`, treat `/voice-lab` as experimental rather than part of the guaranteed transcript workflow.
- Ensure `/privacy` shows an operator-facing support contact before pilot access opens.

## Current scale boundary

With `DATABASE_URL` configured, persistence and rate-limit state are shared across API instances. The remaining boundary is product-level hardening, not basic storage consistency.
