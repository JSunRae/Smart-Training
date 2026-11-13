# Pilot Launch Runbook

Last updated: 2026-11-13

Current phase is enquiry-first, with no hosted provisioning before a client needs independent trial access. See [ENQUIRY_FIRST_LAUNCH.md](ENQUIRY_FIRST_LAUNCH.md). The selected workspace tier is Hobby; paid compute still requires separate approval.

Start with the short operator handoff in [FIRST_HOSTED_PILOT_HANDOFF.md](./FIRST_HOSTED_PILOT_HANDOFF.md) if you need the fastest supported path for the first hosted pilot. Use this runbook as the detailed source of truth behind that handoff.

For live operator execution during rollout, use [HOSTED_LAUNCH_WORKSHEET.md](./HOSTED_LAUNCH_WORKSHEET.md) as the compact step-by-step control sheet while recording evidence in [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md).

Use [FINAL_READINESS_REVIEW.md](./FINAL_READINESS_REVIEW.md) to run the final pilot go or no-go meeting against this runbook, the blocker summary, the launch record, and the decision register.

Use this runbook for the **first hosted pilot launch**. It assumes the current MVP scope: Postgres-backed, deterministic text by default, 30-day transcript retention, a public support contact on `/privacy`, and voice kept disabled.

## 1. Preflight ownership

Fill these before launch:

| Area                      | Owner   | Required decision                                                                    |
| ------------------------- | ------- | ------------------------------------------------------------------------------------ |
| Managed Postgres          | `Pilot` | Future trial: Hobby workspace, Virginia region, paid Postgres only after spending approval; verify three-day PITR plus pre-pilot and weekly logical exports |
| Frontend deploy           | `Pilot` | Use the approved Netlify pilot target; keep the enquiry site separate                 |
| API deploy                | `Pilot` | Public Render API; Netlify uses its public HTTPS origin                              |
| Secrets rotation          | `Pilot` | Pilot owns `APP_SESSION_SECRET` and `DATA_ENCRYPTION_KEY` changes                    |
| Privacy/deletion requests | `Pilot` | Pilot owns the support contact shown on `/privacy`                                   |
| Support inbox             | `Pilot` | Name the operator with access to and responsibility for monitoring the approved Outlook inbox before access opens |
| Incident response         | `Pilot` | Pilot is the primary escalation path                                                 |

Record the completed values in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). For each launch-evidence row, capture the exact command or action, a `PASS` or `FAIL` result summary, the operator, the timestamp, an `Artifact / note location` entry, and a `Failure follow-up` only when the row failed or still needs action.

## 2. Required environment

Use [LAUNCH_ENV_MATRIX.md](LAUNCH_ENV_MATRIX.md) as the single environment reference for both services.

For the first hosted pilot, the variables that are truly mandatory are:

- Web: one API routing variable and one public support contact.
- API: `DATABASE_URL`, `APP_SESSION_SECRET`, and `DATA_ENCRYPTION_KEY`.
- Runtime posture: keep `OPENAI_TEXT_ENABLED=false`, `VOICE_LAB_ENABLED=false`, and `SESSION_RETENTION_DAYS=30`.
- `PILOT_ACCESS_MODE`: production defaults to `closed`. Set `invite` only for a separately authorized synthetic acceptance window or approved controlled pilot. Issue synthetic grants for validation; do not create customer grants before the final go decision.
- Pilot support contact: retain the already approved `Jason_C_Rae@Outlook.com` on the application `/privacy` page unless a new contact change is approved. The `training@jasonrae.ai` marketing-site alias is a separate conditional website release; follow the recovery and forwarding checks in [WEBSITE_RELEASE_2026-09-19.md](WEBSITE_RELEASE_2026-09-19.md#recovery-follow-up).

Operator-facing default story for the first hosted pilot:

- `DATABASE_URL` must be present so `/api/health` reports `storageBackend=postgres`.
- `OPENAI_API_KEY` is optional and does nothing by itself beyond making `/api/health` report `openAiApiConfigured=true`.
- OpenAI-backed text becomes active only when both `OPENAI_API_KEY` and `OPENAI_TEXT_ENABLED=true` are set.
- `/voice-lab` becomes active only when both `OPENAI_API_KEY` and `VOICE_LAB_ENABLED=true` are set.
- `/privacy` must expose `NEXT_PUBLIC_SUPPORT_EMAIL` or `NEXT_PUBLIC_SUPPORT_URL`; `NEXT_PUBLIC_SUPPORT_NAME` only changes the label and otherwise defaults to `Smart Training Pilot Support`.

Do not rely on the local file store in hosted production. If `DATABASE_URL` is missing in production, API requests now fail fast instead of silently falling back to file-backed storage. Use `ALLOW_FILE_STORAGE_IN_PRODUCTION=true` only as an explicit, temporary exception for an intentional file-backed production run.

## 3. Deploy sequence

`pnpm release:check` is the repo release gate for the launch revision. It runs typecheck, lint, Vitest, the monorepo build, Playwright E2E, and `pnpm audit --prod`. Treat it as `PASS` only when it is run from the repo root on the intended launch revision and exits `0`. The production dependency audit is included in that gate, but hosted health, smoke, and manual QA are still separate go/no-go checks.

1. Run `pnpm release:check` on the exact committed candidate, after isolated real-Postgres migration, backfill, idempotence, and concurrency checks pass.
2. Before hosted provisioning, obtain approval for the current provider estimate and exact target/scope. The selected Render Hobby workspace does not make compute or storage free.
3. Push the approved revision and create or sync only [deploy/render-backend.yaml](../deploy/render-backend.yaml) for the selected hybrid topology. Root [render.yaml](../render.yaml) is the all-Render alternative; do not apply both.
4. Confirm the backend Blueprint provisions:
   - `smart-training-db`
   - `smart-training-api`
   - API build/start commands: `pnpm build:api` and `pnpm --filter api exec next start --port $PORT`
   - API pre-deploy command: `pnpm --filter api db:bootstrap && pnpm seed`
5. The API pre-deploy hook runs schema bootstrap and idempotent seed. Record the hook result. For a brand-new or reset database, or a separately authorized workstation preflight, run the explicit commands once against the intended `DATABASE_URL`:

   ```powershell
   pnpm --filter api db:bootstrap
   pnpm seed
   ```

   `db:migrate` remains the backward-compatible alias of `db:bootstrap`, and it only bootstraps missing schema objects. Avoid duplicating a successful automatic hook unless performing the cases above.

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

7. Keep API access closed until the hosted synthetic acceptance window and target are approved. For that window only, set API `PILOT_ACCESS_MODE=invite` and issue a dedicated synthetic invitation. Configure the approved Netlify pilot target with the actual public HTTPS `INTERNAL_API_ORIGIN` for build and function runtime where selectable. Clear `INTERNAL_API_HOSTPORT` and `NEXT_PUBLIC_API_ORIGIN`; Render's private hostname is not reachable from Netlify. Keep the existing conversion site and normal previews in `marketing` mode. Rebuild the approved pilot target with `SMART_TRAINING_SITE_MODE=pilot`; this build setting is separate from API invite authorization.

8. Run hosted smoke twice, using a fresh single-use synthetic invitation and matching `SMART_TRAINING_SMOKE_EMAIL` / `SMART_TRAINING_SMOKE_INVITATION_TOKEN` process environment for each run. Issue each invitation through [the operator runbook](PILOT_ACCESS_RUNBOOK.md) against the intended API database. Enter the token at a hidden prompt, not as a command argument or saved script value. The first run targets the API directly; the second targets the web origin to exercise the Netlify proxy:

```powershell
$apiUrl = Read-Host 'Enter the approved Render API origin'
$webUrl = Read-Host 'Enter the approved Netlify pilot web origin'
$env:SMART_TRAINING_SMOKE_EMAIL = 'synthetic-direct@example.com'
$secureGrant = Read-Host 'Paste the fresh direct-smoke invitation token' -AsSecureString
$env:SMART_TRAINING_SMOKE_INVITATION_TOKEN = [System.Net.NetworkCredential]::new('', $secureGrant).Password
pnpm smoke:hosted -- --api $apiUrl --web $webUrl --support-email Jason_C_Rae@Outlook.com
$secureGrant.Dispose()
Remove-Item Env:SMART_TRAINING_SMOKE_EMAIL, Env:SMART_TRAINING_SMOKE_INVITATION_TOKEN

$env:SMART_TRAINING_SMOKE_EMAIL = 'synthetic-proxy@example.com'
$secureGrant = Read-Host 'Paste a separate fresh proxy-smoke invitation token' -AsSecureString
$env:SMART_TRAINING_SMOKE_INVITATION_TOKEN = [System.Net.NetworkCredential]::new('', $secureGrant).Password
pnpm smoke:hosted -- --api $webUrl --web $webUrl --support-email Jason_C_Rae@Outlook.com
$secureGrant.Dispose()
Remove-Item Env:SMART_TRAINING_SMOKE_EMAIL, Env:SMART_TRAINING_SMOKE_INVITATION_TOKEN
```

`--api` selects the origin for health, registration, roleplay and deletion. `--web` only checks `/privacy`; it does not proxy application calls. Each smoke consumes its invitation and deletes its synthetic account, so the second run needs a new grant. Smoke verifies health, optional privacy, invite registration, dashboard, roleplay, coach, completion, deletion and rejection of the old cookie. It does not verify browser cookie behavior, reset, all-device sign-out, tenant isolation, real-Postgres migration/concurrency, monitoring, backup restore or iPhone behavior.

Record both exact commands, synthetic email identifiers (not invitation tokens), result, operator, timestamp, artifact and follow-up in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). The privacy check must confirm `Jason_C_Rae@Outlook.com` and the required retention/deletion wording.
9. Run the hosted demo rehearsal in [HOSTED_DEMO_FLOW.md](HOSTED_DEMO_FLOW.md) against the approved pilot target and record the result in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
10. Run the hosted manual QA checklist in [HOSTED_QA_CHECKLIST.md](HOSTED_QA_CHECKLIST.md), including the full physical iPhone Safari journey in [TESTING_AND_IPHONE_GUIDE_2026-09-19.md](TESTING_AND_IPHONE_GUIDE_2026-09-19.md): invite/sign-in, roleplay, keyboard-over-reply, long transcript, portrait/landscape, refresh/background-resume, connection loss, sign-out, and deletion. Record the actual model and iOS version. Desktop emulation is not device evidence.
Use hosted manual QA, not the smoke script, to confirm acceptance checks such as `/privacy`, transcript reopen behavior, deletion, and auth re-entry. If the demo rehearsal used the same live environment, you may reuse it only as supporting evidence for the core text workflow section.
Immediately record the final hosted QA outcome in the `Hosted QA checklist` row in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). A `PASS` there means the checklist cleared with no blocking defects; a `FAIL` means a required acceptance check failed or a blocking defect was observed. Use `Artifact / note location` for any checklist copy, screenshot path, note URL, or the short note that captures the scenario used, transcript reopen confirmation, deletion re-auth result, and defect summary when no external artifact was saved.
11. Fill in the live Netlify and Render URLs, support contact and named inbox owner, deploy ids, recovery owner, and rollback targets in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). Use the launch record as the single source for launch evidence.

After all synthetic acceptance is complete, return API access to `PILOT_ACCESS_MODE=closed`. Keep it closed until the owner records the final go decision. At that point, set `invite` for the approved cohort and issue only the explicitly authorized customer invitations.

Do not deliver real credentials until the final go decision is recorded and the owner authorizes a named cohort, organisation membership, identity checks, support procedure, and separate delivery through a verified channel. The operator CLI never sends tokens. An enquiry submission or notification is not pilot consent, identity verification, or transactional-sender readiness.

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
| Restart / crash visibility | Confirm Render failure notifications and event history for `smart-training-api`, and Netlify deploy/function failure visibility for the approved pilot frontend. | The notification destination is known, and the operator can inspect backend and frontend deploy/runtime failure evidence. | Section 4A `Restart / crash visibility` in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). | `Pilot` |
| Service logs | Open Render logs for `smart-training-api` and Netlify function/runtime logs for the approved pilot frontend; confirm the named operator can access them. | The operator can open the API and frontend log views without additional setup on launch day. | Section 4A `Service logs` in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). | `Pilot` |
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
3. Both the direct API smoke and web-origin proxy smoke passed using separate fresh synthetic invitations.
4. Hosted demo rehearsal passed cleanly and was recorded.
5. Hosted manual QA passed cleanly, including physical iPhone Safari checks with device model and iOS version recorded.
6. `/privacy` shows the already approved pilot contact `Jason_C_Rae@Outlook.com` and required retention/deletion wording.
7. A named operator has confirmed access to and current monitoring responsibility for the approved support inbox; recovery and privacy request ownership are recorded.
8. Section 4A monitoring evidence in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md) is fully recorded with no `TBD` rows.
9. The pre-pilot logical export exists and is evidenced in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
10. `OPENAI_TEXT_ENABLED=false` and `VOICE_LAB_ENABLED=false` in the pilot environment.
11. `DATABASE_URL` is present for the live API environment, and no production file-store override is active unless it was explicitly approved as a temporary exception.
12. The owner has approved the named cohort, organisation membership and separate verified-channel invitation delivery. Without that go decision, issue no customer credentials.

Treat the `Hosted QA checklist` row in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md) as the authoritative hosted-QA handoff. If that row is `FAIL` or still `TBD`, the launch decision stays no-go.

No-go if any are false.

## 7. Rollback posture

If hosted smoke or QA fails after deployment:

1. Pause pilot access.
2. Roll back the failing Render API or approved Netlify pilot frontend to its recorded known-good deploy.
3. Re-run `GET /api/health` and confirm the same five-key payload above.
4. Re-run direct and proxy hosted smoke with fresh synthetic invitations before considering re-opening access.

Escalate from service rollback to database restore only when pilot access is already paused and the issue is confirmed to be data loss, unrecoverable corruption, or a release issue that service rollback cannot correct. The `Pilot` operator executes the restore using Render PITR or the retained logical export recorded in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
