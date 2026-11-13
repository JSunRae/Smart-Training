# Hosted Launch Worksheet

Last updated: 2026-11-13

Current decision: defer this rollout until an interested client needs independent trial access. Render Hobby is selected; no upgrade or billable resources are authorized now. Use [ENQUIRY_FIRST_LAUNCH.md](ENQUIRY_FIRST_LAUNCH.md) for the current local demo and discovery workflow.

Use this during the live hosted pilot rollout while filling [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md). This is the operator worksheet, not the full procedure. Use [FIRST_HOSTED_PILOT_HANDOFF.md](./FIRST_HOSTED_PILOT_HANDOFF.md) for the short launch path and [PILOT_LAUNCH_RUNBOOK.md](./PILOT_LAUNCH_RUNBOOK.md) for the full operational contract.

## 1. Before deployment

The selected topology is a separate Netlify pilot frontend with Render API + PostgreSQL. Root `render.yaml` is the all-Render alternative; do not apply both. Obtain approval for the current provider estimate and exact deployment target before provisioning any billable resource. The selected Render Hobby workspace does not make compute or storage free.

Fill these in the launch record before touching either provider:

- Section 1 and Section 2 owners and decisions in [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md)
- Git revision or release tag to launch
- Keep the already approved pilot `NEXT_PUBLIC_SUPPORT_EMAIL=Jason_C_Rae@Outlook.com`; verify this on the deployed application page. The `training@jasonrae.ai` website alias is a separate conditional release.
- Named support operator with access to and monitoring responsibility for the approved inbox
- Confirm the launch still matches the approved scope in [FINAL_READINESS_REVIEW.md](./FINAL_READINESS_REVIEW.md): Postgres-backed, `OPENAI_TEXT_ENABLED=false`, `VOICE_LAB_ENABLED=false`

Stop and declare `No-go` if any required owner, launch revision, or live support contact is still unknown.

## 2. Local preflight

Run from the repo root:

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm release:check
```

Record immediately in Section 4 `pnpm release:check`:

- Command actually run
- `PASS` or `FAIL`
- Operator
- Timestamp
- Artifact or log path only if saved

Stop and declare `No-go` if `pnpm release:check` fails or was not run on the exact launch revision.

## 3. Render API and database deployment

Select the approved branch and [backend-only Blueprint](../deploy/render-backend.yaml). Confirm `smart-training-db` on PostgreSQL 16 and `smart-training-api` at the approved revision. The Blueprint selects manual API deploys. Root [render.yaml](../render.yaml) defines the all-Render alternative.

Record the following in Section 3 of [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md) as soon as they exist.

- Netlify pilot web URL
- API URL
- `/api/health` URL
- Actual PostgreSQL server version
- Last known-good Netlify pilot web deploy id
- Last known-good API deploy id

The API pre-deploy hook runs `pnpm --filter api db:bootstrap && pnpm seed`. Record the hook result. Run the commands manually only for a new/reset database or a deliberate workstation preflight; do not repeat a successful hook unnecessarily:

```powershell
pnpm --filter api db:bootstrap
pnpm seed
```

`/api/health` verifies runtime posture but does not prove schema bootstrap or seeding. Record the hook or manual command outcome separately in the launch record.

Stop and declare `No-go` if a required backend service fails to provision, if the live API URL is unknown, or if bootstrap or seed fails.

Keep production API `PILOT_ACCESS_MODE` unset/closed until an authorized hosted synthetic acceptance window. Only for that window, set it to `invite` and issue synthetic invitations. Restore `closed` when synthetic acceptance ends and keep all customer grants and delivery on hold until final launch evidence and the owner go decision are accepted.

## 3A. Netlify pilot frontend

Use the [dedicated Netlify configuration](DEPLOYMENT_NETLIFY.md#select-the-dedicated-pilot-configuration). Set the pilot project's package directory to `deploy/netlify-pilot` and keep the base at the repository root. Set `INTERNAL_API_ORIGIN` to the approved public HTTPS Render API origin for the production context. Verify the config, adapter, publish directory and commit in the build log.

Confirm the pilot page uses the approved Outlook support contact, sign-in and invitation UI, sends the noindex header, and that its same-origin `/api/*` rewrite targets the intended API.

## 4. Live verification

Once the hosted target and synthetic `invite` window are authorized, use a separate disposable organisation and fresh invitation for each path. Each smoke deletes its synthetic account and can remove the organisation and remaining invitations. Enter the matching email and token through the smoke process environment.

First smoke the API directly, then smoke through the Netlify proxy by making the web origin the API target:

```powershell
$apiUrl = Read-Host 'Enter the approved Render API origin'
$webUrl = Read-Host 'Enter the approved Netlify pilot web origin'
Invoke-RestMethod "$apiUrl/api/health" | ConvertTo-Json -Depth 5
$env:SMART_TRAINING_SMOKE_EMAIL = 'synthetic-direct@example.com'
$secureGrant = Read-Host 'Paste the fresh direct-smoke invitation token' -AsSecureString
$env:SMART_TRAINING_SMOKE_INVITATION_TOKEN = [System.Net.NetworkCredential]::new('', $secureGrant).Password
pnpm smoke:hosted -- --api $apiUrl --web $webUrl --support-email Jason_C_Rae@Outlook.com
$secureGrant.Dispose()
Remove-Item Env:SMART_TRAINING_SMOKE_EMAIL, Env:SMART_TRAINING_SMOKE_INVITATION_TOKEN
$env:SMART_TRAINING_SMOKE_EMAIL = 'synthetic-proxy@example.com'
$secureGrant = Read-Host 'Paste the separate fresh proxy-smoke invitation token' -AsSecureString
$env:SMART_TRAINING_SMOKE_INVITATION_TOKEN = [System.Net.NetworkCredential]::new('', $secureGrant).Password
pnpm smoke:hosted -- --api $webUrl --web $webUrl --support-email Jason_C_Rae@Outlook.com
$secureGrant.Dispose()
Remove-Item Env:SMART_TRAINING_SMOKE_EMAIL, Env:SMART_TRAINING_SMOKE_INVITATION_TOKEN
```

Before running, issue the two grants through [PILOT_ACCESS_RUNBOOK.md](PILOT_ACCESS_RUNBOOK.md) and use a dedicated PowerShell session. Clear the environment values even if a command fails. The first command exercises the API directly and checks the web privacy page. The second sends health, registration, roleplay and deletion requests through the Netlify proxy; `--web` by itself does not route API calls.

The health check is `PASS` only if it returns:

- `status=ok`
- `storageBackend=postgres`
- `openAiTextEnabled=false`
- `voiceLabEnabled=false`

Record immediately in Section 4:

- `Live /api/health posture check` result plus the four returned values
- `pnpm smoke:hosted` exact command and result

Stop and declare `No-go` if the health payload differs from the approved posture or if `pnpm smoke:hosted` fails.

## 5. Manual hosted and physical-device checks

Run [HOSTED_QA_CHECKLIST.md](./HOSTED_QA_CHECKLIST.md) on the live environment, then verify the support contact on `/privacy` matches the launch contact.

Record immediately in Section 4:

- `Hosted QA checklist` result
- Scenario used
- Whether transcript reopen was confirmed
- Whether deletion forced immediate re-auth
- `No blocking defects observed` or a one-line blocking defect summary
- `/privacy` support-contact visibility result
- Physical iPhone model and iOS version; Safari invitation/sign-in, roleplay, keyboard-over-reply, long transcript, portrait/landscape, refresh/background-resume, connection loss, all-device sign-out, and deletion results

Record hosted demo rehearsal evidence only if it was actually run.

Run the full physical-device journey on an actual iPhone in Safari; desktop emulation is not device evidence. Follow [TESTING_AND_IPHONE_GUIDE_2026-09-19.md](TESTING_AND_IPHONE_GUIDE_2026-09-19.md) for coverage, including smallest supported viewport, keyboard-over-reply behavior, long transcript, portrait/landscape, refresh, background/resume, connection loss, sign-out, and deletion. Record the model, iOS version, scenario and outcomes in the Hosted QA evidence/notes in [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md). Stop and declare `No-go` if hosted QA or the agreed iPhone acceptance fails, transcript reopen fails, deletion does not force re-auth, or `/privacy` does not show the approved pilot support contact.

## 6. Monitoring and backup proof before opening access

Before opening pilot access, capture the required monitoring and export evidence from [PILOT_LAUNCH_RUNBOOK.md](./PILOT_LAUNCH_RUNBOOK.md) into Section 4A and Section 3 or Section 5 of [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md):

- Render failure notifications and API deploy history; Netlify pilot deploy/function failure visibility
- Render API logs and Netlify pilot function/runtime logs openable to the named operator
- `smart-training-db` dashboard visible
- Backup or PITR coverage visible and recovery owner still explicit
- One pre-pilot logical export created and its storage path verified

Example export shape:

```powershell
pg_dump "$env:DATABASE_URL" | gzip > smart-training-db_pre-pilot_<YYYYMMDD-HHMM>_<git-revision>.sql.gz
```

Record immediately:

- Export artifact name
- Storage path
- Existence check result
- Weekly export owner or cadence note if needed

Stop and declare `No-go` if any Section 4A row is still `TBD` or if the pre-pilot logical export does not exist.

## 7. Go or no-go close-out

Go only if all of these are true in [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md):

- Section 3 live deployment facts are filled
- Section 4 required evidence rows are `PASS`
- Section 4A monitoring rows have no `TBD`
- Section 5 rollback owner and targets are filled
- Hosted QA records the physical iPhone model, iOS version and Safari journey outcome
- A named support operator has confirmed access to and monitoring of the approved Outlook inbox, and recovery/privacy request ownership is recorded
- Jason has approved the cohort, organisation membership, and separate credential-delivery action before any real invitation is issued

If any item above is incomplete or failed, keep the rollout at `No-go` and use [FINAL_READINESS_REVIEW.md](./FINAL_READINESS_REVIEW.md) plus [PILOT_LAUNCH_RUNBOOK.md](./PILOT_LAUNCH_RUNBOOK.md) to resolve the blocker before opening pilot access.
