# Render Deployment Guide

Last updated: 2026-05-29

Use this path when you want the fastest supported hosted deployment for the current MVP.

Use [LAUNCH_ENV_MATRIX.md](LAUNCH_ENV_MATRIX.md) when you need the single source of truth for which variables matter, what they do, and which ones are actually mandatory for the first pilot.

## What the Blueprint creates

The root [render.yaml](../render.yaml) provisions:

- `smart-training-db`: managed Render Postgres
- `smart-training-api`: public Node web service for auth, sessions, health, and the external smoke target
- `smart-training-web`: public Node web service for the user-facing app

Default posture in the Blueprint:

- `storageBackend=postgres`
- `OPENAI_TEXT_ENABLED=false`
- `VOICE_LAB_ENABLED=false`
- generated `APP_SESSION_SECRET`
- generated `DATA_ENCRYPTION_KEY`
- `SESSION_RETENTION_DAYS=30`

Render command wiring in the Blueprint:

- API build: `corepack enable && pnpm install --frozen-lockfile && pnpm build:api`
- API pre-deploy: `pnpm --filter api db:bootstrap && pnpm seed`
- API start: `pnpm --filter api exec next start --port $PORT`
- Web build: `corepack enable && pnpm install --frozen-lockfile && pnpm build:web`
- Web start: `pnpm --filter web exec next start --port $PORT`

The current hosted path does not run Prisma generate or Prisma migrations. Database setup is performed by the API bootstrap script, which creates missing tables and indexes with inline Postgres SQL.

The API pre-deploy hook already bootstraps the schema and runs the idempotent baseline seed before each API deploy. In the current code, `db:migrate` is the backward-compatible alias for `db:bootstrap`, and `pnpm seed` skips when scenario records already exist.

Network boundary in the current Blueprint:

- The API remains public for health checks, smoke tests, and direct operator access.
- The web service still routes its own server-side `/api/*` traffic over Render service discovery through `INTERNAL_API_HOSTPORT`, avoiding a public hop from web to api.

## Before you sync

1. Run `pnpm release:check`.
2. Push the exact revision you want to deploy.
3. Decide whether you will use Render subdomains first or attach custom domains immediately.

## Create the Blueprint

1. Sign in to Render.
2. Confirm you are in the workspace you want to use for the pilot.
3. If the workspace is not already `Pro`, upgrade it before you create the pilot services.
4. Click `New +`.
5. Click `Blueprint`.
6. Select this repository.
7. Keep the Blueprint path as `render.yaml`.
8. Review the three resources that Render will create:
   - `smart-training-db`
   - `smart-training-api`
   - `smart-training-web`
9. When Render prompts for `NEXT_PUBLIC_SUPPORT_EMAIL`, enter the operator-facing support address you want shown on `/privacy`.
10. Click the action that creates or applies the Blueprint.
11. Wait for all three resources to finish provisioning.

The Blueprint does not require `OPENAI_API_KEY` for the first pilot. Add OpenAI-related env vars later only if you intentionally widen scope.

For the first pilot, the Blueprint already supplies or prompts for every truly mandatory variable:

- Web: `INTERNAL_API_HOSTPORT` plus `NEXT_PUBLIC_SUPPORT_EMAIL`
- API: `DATABASE_URL`, `APP_SESSION_SECRET`, `DATA_ENCRYPTION_KEY`, `SESSION_RETENTION_DAYS=30`, `OPENAI_TEXT_ENABLED=false`, and `VOICE_LAB_ENABLED=false`

The Blueprint also sets `NEXT_PUBLIC_SUPPORT_NAME=Smart Training Pilot Support` on the web service. `NEXT_PUBLIC_SUPPORT_URL` remains optional and is not used by the current Blueprint.

## First deploy checks

1. Wait for `smart-training-db`, `smart-training-api`, and `smart-training-web` to finish provisioning.
2. Treat the Blueprint's API pre-deploy hook as the default schema bootstrap plus seed path. Run `pnpm --filter api db:bootstrap` and `pnpm seed` manually only if you want an explicit workstation-side preflight against a new or reset hosted database.
3. Open the API service and verify `GET /api/health` reports:
   - `status=ok`
   - `storageBackend=postgres`
   - `openAiTextEnabled=false`
   - `voiceLabEnabled=false`
4. Copy the live service URLs into [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
5. Point the smoke test at the live API and web app:

```powershell
pnpm smoke:hosted -- --api https://your-api-host --web https://your-web-host --support-email pilot-support@example.com
```

1. Record the live deploy ids, owners, and rollback target in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
2. Run the manual flow in [HOSTED_QA_CHECKLIST.md](HOSTED_QA_CHECKLIST.md).

## Backup/export drill before pilot access

Before opening access to external pilot users:

1. Use the Render Postgres connection details for `smart-training-db` and run one logical export from an operator workstation.
2. Name the file `smart-training-db_pre-pilot_<YYYYMMDD-HHMM>_<git-revision>.sql.gz`.
3. Store it in operator-controlled storage with the same 30-day retention already assumed by the launch docs.
4. Record the filename, storage location, revision, and existence check result in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
5. Prefer service rollback first. Escalate to Render PITR or the retained logical export only when service rollback cannot correct the incident.

Example command shape:

```powershell
pg_dump "$env:DATABASE_URL" | gzip > smart-training-db_pre-pilot_20260529-1530_<git-revision>.sql.gz
```

## Minimum monitoring setup before pilot access opens

Keep the first pilot lightweight and Render-native. Do not add a separate observability stack for this stage.

Before external access opens, confirm and record all of the following in Section 4A of [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md):

1. Health probe: run `Invoke-RestMethod https://<api-host>/api/health | ConvertTo-Json -Depth 5` and record the returned posture values.
2. Restart or crash visibility: enable Render failure notifications and verify both hosted services expose deploy or event history.
3. Service logs: verify the operator can open current logs for `smart-training-api` and `smart-training-web`.
4. Database visibility: verify the operator can open the `smart-training-db` dashboard and inspect provider-visible status or connection errors.
5. Backup confirmation: verify the managed Postgres backup or PITR posture visible in Render matches the recovery window recorded in the launch record.
6. Manual logical export: capture one dated logical export before go-live and note where it is stored.

## Recommended follow-up settings

- Keep the first pilot on `onrender.com` unless you have an immediate brand or trust requirement.
- Configure Render notifications:
  1. In the Render dashboard, open the workspace home.
  2. Open `Integrations`.
  3. Open `Notifications`.
  4. Set the notification destination to email, or email plus Slack if you already use Slack.
  5. Set default service notifications to `Only failure notifications`.
  6. Open each service if you want to override defaults and confirm the service-level notification settings.
- Record who owns:
  - database access and restore
  - execution of any database restore
  - secret rotation
  - privacy and deletion requests
  - incident response

## Optional later changes

- Add `OPENAI_API_KEY` and `OPENAI_TEXT_ENABLED=true` only after the text-first pilot is stable.
- Add `VOICE_LAB_ENABLED=true` only if you intentionally want to expose `/voice-lab`.
