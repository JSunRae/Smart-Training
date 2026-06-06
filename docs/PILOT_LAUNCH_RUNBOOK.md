# Pilot Launch Runbook

Last updated: 2026-05-29

Start with the short operator handoff in [FIRST_HOSTED_PILOT_HANDOFF.md](./FIRST_HOSTED_PILOT_HANDOFF.md) if you need the fastest supported path for the first hosted pilot. Use this runbook as the detailed source of truth behind that handoff.

For live operator execution during rollout, use [HOSTED_LAUNCH_WORKSHEET.md](./HOSTED_LAUNCH_WORKSHEET.md) as the compact step-by-step control sheet while recording evidence in [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md).

Use [FINAL_READINESS_REVIEW.md](./FINAL_READINESS_REVIEW.md) to run the final pilot go or no-go meeting against this runbook, the blocker summary, the launch record, and the decision register.

Use this runbook for the **first hosted pilot launch**. It assumes the current MVP scope: Postgres-backed, deterministic text by default, 30-day transcript retention, a public support contact on `/privacy`, and voice kept disabled.

## 1. Preflight ownership

Fill these before launch:

| Area                      | Owner   | Required decision                                                                    |
| ------------------------- | ------- | ------------------------------------------------------------------------------------ |
| Managed Postgres          | `Pilot` | Use Render Pro workspace, Virginia region, plus pre-pilot and weekly logical exports |
| Web deploy                | `Pilot` | Use `onrender.com` for the first pilot                                               |
| API deploy                | `Pilot` | Keep the API public; web uses private hostport routing for server-side calls         |
| Secrets rotation          | `Pilot` | Pilot owns `APP_SESSION_SECRET` and `DATA_ENCRYPTION_KEY` changes                    |
| Privacy/deletion requests | `Pilot` | Pilot owns the support contact shown on `/privacy`                                   |
| Incident response         | `Pilot` | Pilot is the primary escalation path                                                 |
| API deploy                | `Pilot` | Keep the API public; web uses private hostport routing for server-side calls         |
| Secrets rotation          | `Pilot` | Pilot owns `APP_SESSION_SECRET` and `DATA_ENCRYPTION_KEY` changes                    |

Record the completed values in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). For each launch-evidence row, capture the exact command or action, a `PASS` or `FAIL` result summary, the operator, the timestamp, an `Artifact / note location` entry, and a `Failure follow-up` only when the row failed or still needs action.

## 2. Required environment

Use [LAUNCH_ENV_MATRIX.md](LAUNCH_ENV_MATRIX.md) as the single environment reference for both services.

For the first hosted pilot, the variables that are truly mandatory are:

- Web: one API routing variable and one public support contact.
- API: `DATABASE_URL`, `APP_SESSION_SECRET`, and `DATA_ENCRYPTION_KEY`.
- Runtime posture: keep `OPENAI_TEXT_ENABLED=false`, `VOICE_LAB_ENABLED=false`, and `SESSION_RETENTION_DAYS=30`.

Operator-facing default story for the first hosted pilot:

- `DATABASE_URL` must be present so `/api/health` reports `storageBackend=postgres`.
- `OPENAI_API_KEY` is optional and does nothing by itself beyond making `/api/health` report `openAiApiConfigured=true`.
- OpenAI-backed text becomes active only when both `OPENAI_API_KEY` and `OPENAI_TEXT_ENABLED=true` are set.
- `/voice-lab` becomes active only when both `OPENAI_API_KEY` and `VOICE_LAB_ENABLED=true` are set.
- `/privacy` must expose `NEXT_PUBLIC_SUPPORT_EMAIL` or `NEXT_PUBLIC_SUPPORT_URL`; `NEXT_PUBLIC_SUPPORT_NAME` only changes the label and otherwise defaults to `Smart Training Pilot Support`.

Do not rely on the local file store in hosted production. If `DATABASE_URL` is missing in production, API requests now fail fast instead of silently falling back to file-backed storage. Use `ALLOW_FILE_STORAGE_IN_PRODUCTION=true` only as an explicit, temporary exception for an intentional file-backed production run.

## 3. Deploy sequence

`pnpm release:check` is the repo release gate for the launch revision. It runs typecheck, lint, Vitest, the monorepo build, Playwright E2E, and `pnpm audit --prod`. Treat it as `PASS` only when it is run from the repo root on the intended launch revision and exits `0`. The production dependency audit is included in that gate, but hosted health, smoke, and manual QA are still separate go/no-go checks.

1. Run `pnpm release:check` from the repo root.
2. Push the release revision and create or sync the Render Blueprint in [render.yaml](../render.yaml).
3. Confirm the Blueprint provisions:
   - `smart-training-db`
   - `smart-training-api`
   - `smart-training-web`
   - API build/start commands: `pnpm build:api` and `pnpm --filter api exec next start --port $PORT`
   - API pre-deploy command: `pnpm --filter api db:bootstrap && pnpm seed`
   - Web build/start commands: `pnpm build:web` and `pnpm --filter web exec next start --port $PORT`
4. During initial Blueprint creation, provide the prompted `NEXT_PUBLIC_SUPPORT_EMAIL` value.
5. For a brand-new hosted Postgres database, run the explicit database lifecycle commands once against the target `DATABASE_URL` before opening pilot access:

   ```powershell
   pnpm --filter api db:bootstrap
   pnpm seed
   ```

   The Blueprint already runs the equivalent bootstrap plus idempotent seed during API pre-deploy with `pnpm --filter api db:bootstrap && pnpm seed`. Treat the manual commands above as hosted-launch relevant only when the pilot database is new, has been reset, or you want an explicit preflight check from an operator workstation. `db:migrate` remains the backward-compatible alias of `db:bootstrap`, and it only bootstraps missing schema objects.

   Success looks like one of these outcomes:
   - bootstrap exits cleanly and reports Postgres schema bootstrap completion
   - seed reports inserted baseline scenarios and documents into the Postgres backend
   - or, if the pilot database was already initialized, seed reports that it skipped because scenario records already exist

6. Confirm `GET /api/health` reports:
   - `status=ok`
   - `storageBackend=postgres`
   - `openAiApiConfigured=false` for the standard first-pilot posture, or `true` only if an operator intentionally preprovisioned `OPENAI_API_KEY`
   - `openAiTextEnabled=false`
   - `voiceLabEnabled=false`
   - Treat `openAiApiConfigured=true` with both feature flags still `false` as acceptable key preprovisioning, not feature activation.
   - Treat any production result other than `storageBackend=postgres` as no-go unless a time-boxed `ALLOW_FILE_STORAGE_IN_PRODUCTION=true` exception was approved before launch.
   - No extra operator-facing fields are required for launch or rollback checks.
   - Record the exact command or action used, the health URL, the returned values, the operator, the timestamp, the saved response URL or path if one exists, and any needed next action in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).

   Expected response shape:

   ```json
   {
     "status": "ok",
     "storageBackend": "postgres",
      "openAiApiConfigured": false,
     "openAiTextEnabled": false,
     "voiceLabEnabled": false
   }
   ```

   Example PowerShell check:

   ```powershell
   Invoke-RestMethod https://api.your-domain.example/api/health | ConvertTo-Json -Depth 5
   ```

   `GET /api/health` confirms runtime posture only. It does not prove schema bootstrap or seeding.

7. Run `pnpm smoke:hosted` with:

```powershell
pnpm smoke:hosted -- --api https://api.your-domain.example --web https://app.your-domain.example --support-email pilot-support@example.com
```

The hosted smoke path is limited to launch smoke. It verifies health posture, optional `/privacy` retention and support-contact posture, registration, dashboard access, session start, seller turn, coach response, session completion, completed-session visibility on the dashboard, account deletion, and logout invalidation.
Record the exact command line used, the pass or fail result, the operator, the timestamp, the log path or note URL if one exists, and any next follow-up action in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
The privacy check must confirm that `/privacy` shows the exact operator support email or support URL configured for launch.
8. Run the hosted demo rehearsal in [HOSTED_DEMO_FLOW.md](HOSTED_DEMO_FLOW.md) against the live environment and record the result in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
9. Run the hosted manual QA checklist in [HOSTED_QA_CHECKLIST.md](HOSTED_QA_CHECKLIST.md).
Use hosted manual QA, not the smoke script, to confirm acceptance checks such as `/privacy`, transcript reopen behavior, deletion, and auth re-entry. If the demo rehearsal used the same live environment, you may reuse it only as supporting evidence for the core text workflow section.
Immediately record the final hosted QA outcome in the `Hosted QA checklist` row in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). A `PASS` there means the checklist cleared with no blocking defects; a `FAIL` means a required acceptance check failed or a blocking defect was observed. Use `Artifact / note location` for any checklist copy, screenshot path, note URL, or the short note that captures the scenario used, transcript reopen confirmation, deletion re-auth result, and defect summary when no external artifact was saved.
10. Fill in the live URLs, support contact, deploy ids, recovery owner, and rollback target in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).

## 3A. What each hosted check proves

- Hosted smoke proves the deployment endpoints and automated core path are reachable.
- Hosted demo rehearsal proves the live environment can support the default stakeholder story and the core text workflow through transcript reopen.
- Hosted manual QA proves the environment also satisfies acceptance checks for `/privacy`, support contact visibility, account lifecycle, deletion, and auth re-entry.

## 4. Backup/export drill

Run this once after `smart-training-db` is provisioned and the intended release revision is ready, but before opening pilot access.

1. Use the managed Postgres connection details from Render and run one logical export from an operator workstation.
2. Name the file `smart-training-db_pre-pilot_<YYYYMMDD-HHMM>_<git-revision>.sql.gz`.
3. Store the export in operator-controlled storage that is retained for 30 days.
4. Record the filename, storage location, revision, and existence check in `Artifact / note location` in Section 4 and Section 4A of [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). If the export must be rerun or moved, note that in `Failure follow-up`.
5. Repeat the same export pattern weekly during the pilot, keeping the same storage location and retention window.

Example command shape:

```powershell
pg_dump "$env:DATABASE_URL" | gzip > smart-training-db_pre-pilot_20260529-1530_<git-revision>.sql.gz
```

## 5. Monitoring baseline

Treat the items below as the **required minimum monitoring posture** for the first pilot. Anything not listed here is advisory follow-up rather than a go-live gate.

The monitoring baseline is operational only when every required row below is configured and recorded in Section 4A of [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). If any row is still `TBD`, pilot access remains no-go.

| Capability | Exact check / probe | Configured when | Record evidence in | Owner |
| --- | --- | --- | --- | --- |
| Health probe | Run the hosted `/api/health` PowerShell check shown in Section 3 against the live API URL and confirm `status=ok`, `storageBackend=postgres`, `openAiTextEnabled=false`, and `voiceLabEnabled=false`. Also confirm `openAiApiConfigured` matches operator intent: `false` for the standard pilot posture or `true` only for deliberate key preprovisioning. | The live health URL is saved in the launch record and the latest result is captured as `PASS` with the returned posture values. | Section 4 `Live /api/health posture check` and Section 4A `Health probe` in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). | `Pilot` |
| Restart / crash visibility | In the Render workspace, confirm notifications are enabled for failed deploys and service incidents, then open both `smart-training-api` and `smart-training-web` event or deploy history pages and verify you can see restart or crash history. | The notification destination exists, failure notifications are enabled for the pilot workspace or services, and both services show accessible event history. | Section 4A `Restart / crash visibility` in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). | `Pilot` |
| Service logs | Open the live Render logs for `smart-training-api` and `smart-training-web` and confirm the operator can access current request and runtime logs for both services. | The operator can open both service log views from the Render dashboard without additional setup on launch day. | Section 4A `Service logs` in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). | `Pilot` |
| Database visibility | Open the Render Postgres dashboard for `smart-training-db` and confirm database status plus recent connection or error visibility are available from the provider view. | The operator can reach the database dashboard and inspect current status plus any visible connection failures or auth errors. | Section 4A `Database visibility` in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). | `Pilot` |
| Backup confirmation | Confirm the managed Postgres instance shows PITR or backup coverage in Render and that the restore owner is explicitly assigned. | The recovery window relied on for the pilot is filled in, the provider backup posture is visible, and the restore owner remains named in the launch record. | Section 3 `Recovery window being relied on`, Section 5 `Database restore owner`, and Section 4A `Backup confirmation` in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). | `Pilot` |
| Manual logical export | Run one manual logical export before pilot access opens, save it to operator-controlled storage, and repeat weekly during the pilot. | The pre-launch export has a dated evidence note with storage location and operator name; the weekly cadence owner is explicit. | Section 4A `Manual logical export` in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). | `Pilot` |

Advisory follow-up after the first pilot is open:

1. Add a second notification destination such as Slack if the pilot team already uses it.
2. Review API logs for repeated 5xx responses and convert recurring failures into tracked issues.
3. Tighten health-check cadence or add synthetic checks only if the first pilot shows a real need.

## 6. Go / no-go criteria

Review the current blocker list in [READINESS_AUDIT.md](READINESS_AUDIT.md) before opening access:

Use [FINAL_READINESS_REVIEW.md](FINAL_READINESS_REVIEW.md) as the reusable meeting checklist for this section.

- Any open P0 item means no-go.
- P1 items should be closed before any external participant uses the hosted pilot.
- P2 items are accepted follow-up unless scope changes.
- Do not widen launch scope for retrieval backend expansion, voice transport hardening, advanced analytics, or deeper admin tooling unless current hosted evidence shows the text-first pilot cannot run without them. Track those items in [AGENT_TASK_BOARD.md](AGENT_TASK_BOARD.md).

Go only if all are true:

1. `pnpm release:check` passed from the current repo revision, meaning the repo-root run completed typecheck, lint, Vitest, build, Playwright E2E, and `pnpm audit --prod` with exit `0`.
2. Hosted smoke passed cleanly.
3. Hosted demo rehearsal passed cleanly and was recorded.
4. Hosted manual QA passed cleanly.
5. `/privacy` shows the exact operator-facing support email or support URL configured through `NEXT_PUBLIC_SUPPORT_EMAIL` or `NEXT_PUBLIC_SUPPORT_URL`.
6. Section 4A monitoring evidence in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md) is fully recorded with no `TBD` rows.
7. The pre-pilot logical export exists and is evidenced in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
8. `OPENAI_TEXT_ENABLED=false` and `VOICE_LAB_ENABLED=false` in the pilot environment.
9. `DATABASE_URL` is present for the live API environment, and no production file-store override is active unless it was explicitly approved as a temporary exception.

Treat the `Hosted QA checklist` row in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md) as the authoritative hosted-QA handoff. If that row is `FAIL` or still `TBD`, the launch decision stays no-go.

No-go if any are false.

## 7. Rollback posture

If the hosted smoke or QA pass fails after deployment:

1. Pause pilot access.
2. Roll back the failing service to the prior known-good deploy.
3. Re-run `GET /api/health` and confirm the same five-key payload above.
4. Re-run hosted smoke before reopening access.

Escalate from service rollback to database restore only when pilot access is already paused and the issue is confirmed to be data loss, unrecoverable corruption, or a release issue that service rollback cannot correct. The `Pilot` operator executes the restore using Render PITR or the retained logical export recorded in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
