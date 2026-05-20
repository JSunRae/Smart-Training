# Pilot Launch Runbook

Last updated: 2026-05-20

Use this runbook for the **first hosted pilot launch**. It assumes the current MVP scope: Postgres-backed, deterministic text by default, and voice kept disabled.

## 1. Preflight ownership

Fill these before launch:

| Area | Owner | Required decision |
|---|---|---|
| Managed Postgres | `Pilot` | Use Render Pro workspace, Virginia region, and weekly manual logical exports |
| Web deploy | `Pilot` | Use `onrender.com` for the first pilot |
| API deploy | `Pilot` | Keep the API public for the first pilot |
| Secrets rotation | `Pilot` | Pilot owns `APP_SESSION_SECRET` and `DATA_ENCRYPTION_KEY` changes |
| Privacy/deletion requests | `Pilot` | Pilot owns the support contact shown on `/privacy` |
| Incident response | `Pilot` | Pilot is the primary escalation path |

Record the completed values in [PILOT_LAUNCH_RECORD.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/PILOT_LAUNCH_RECORD.md).

## 2. Required environment

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
- `OPENAI_TEXT_ENABLED=false`
- `VOICE_LAB_ENABLED=false`

Optional:

- `OPENAI_API_KEY`
- `OPENAI_API_BASE_URL`
- `OPENAI_MODEL`

## 3. Deploy sequence

1. Run `pnpm release:check` from the repo root.
2. Push the release revision and create or sync the Render Blueprint in [render.yaml](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/render.yaml).
3. Confirm the Blueprint provisions:
   - `smart-training-db`
   - `smart-training-api`
   - `smart-training-web`
4. During initial Blueprint creation, provide the prompted `NEXT_PUBLIC_SUPPORT_EMAIL` value.
5. Confirm `GET /api/health` reports:
   - `status=ok`
   - `storageBackend=postgres`
   - `openAiTextEnabled=false`
   - `voiceLabEnabled=false`
6. Run `pnpm smoke:hosted` with:

```powershell
pnpm smoke:hosted -- --api https://api.your-domain.example --web https://app.your-domain.example --support-email pilot-support@example.com
```

7. Run the hosted manual QA checklist in [HOSTED_QA_CHECKLIST.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/HOSTED_QA_CHECKLIST.md).
8. Fill in the deploy ids, recovery owner, and rollback target in [PILOT_LAUNCH_RECORD.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/PILOT_LAUNCH_RECORD.md).

## 4. Monitoring baseline

Minimum monitoring for the first pilot:

1. Health probe against `GET /api/health`.
2. Platform restart/crash alerts for both `web` and `api`.
3. Platform log access for both services.
4. Database connection/error visibility from the hosting platform or provider dashboard.
5. Backup confirmation for the managed Postgres instance.
6. One manual logical export captured before pilot access opens, then repeated weekly during the pilot.

Recommended alert conditions:

1. Repeated API restarts within a short window.
2. Health check failures.
3. Database unavailable or authentication failures.
4. Repeated 5xx responses from the API platform logs.

## 5. Go / no-go criteria

Go only if all are true:

1. `pnpm release:check` passed from the current repo revision.
2. Hosted smoke passed cleanly.
3. Hosted manual QA passed cleanly.
4. `/privacy` shows an operator-facing support contact.
5. Postgres backups and restore ownership are explicitly assigned.
6. `OPENAI_TEXT_ENABLED=false` and `VOICE_LAB_ENABLED=false` in the pilot environment.

No-go if any are false.

## 6. Rollback posture

If the hosted smoke or QA pass fails after deployment:

1. Pause pilot access.
2. Roll back the failing service to the prior known-good deploy.
3. Re-run `GET /api/health`.
4. Re-run hosted smoke before reopening access.
