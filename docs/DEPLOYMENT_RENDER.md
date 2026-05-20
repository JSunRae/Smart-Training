# Render Deployment Guide

Last updated: 2026-05-16

Use this path when you want the fastest supported hosted deployment for the current MVP.

## What the Blueprint creates

The root [render.yaml](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/render.yaml) provisions:

- `smart-training-db`: managed Render Postgres
- `smart-training-api`: public Node web service for auth, sessions, and health
- `smart-training-web`: public Node web service for the user-facing app

Default posture in the Blueprint:

- `storageBackend=postgres`
- `OPENAI_TEXT_ENABLED=false`
- `VOICE_LAB_ENABLED=false`
- generated `APP_SESSION_SECRET`
- generated `DATA_ENCRYPTION_KEY`
- `SESSION_RETENTION_DAYS=30`

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

## First deploy checks

1. Wait for `smart-training-db`, `smart-training-api`, and `smart-training-web` to finish provisioning.
2. Open the API service and verify `GET /api/health` reports:
   - `status=ok`
   - `storageBackend=postgres`
   - `openAiTextEnabled=false`
   - `voiceLabEnabled=false`
3. Copy the live service URLs into [PILOT_LAUNCH_RECORD.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/PILOT_LAUNCH_RECORD.md).
4. Point the smoke test at the live API and web app:

```powershell
pnpm smoke:hosted -- --api https://your-api-host --web https://your-web-host --support-email pilot-support@example.com
```

5. Record the live deploy ids, owners, and rollback target in [PILOT_LAUNCH_RECORD.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/PILOT_LAUNCH_RECORD.md).
6. Run the manual flow in [HOSTED_QA_CHECKLIST.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/HOSTED_QA_CHECKLIST.md).

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
  - secret rotation
  - privacy and deletion requests
  - incident response

## Optional later changes

- Add `OPENAI_API_KEY` and `OPENAI_TEXT_ENABLED=true` only after the text-first pilot is stable.
- Add `VOICE_LAB_ENABLED=true` only if you intentionally want to expose `/voice-lab`.
