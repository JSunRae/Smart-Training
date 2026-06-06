# Hosted Launch Worksheet

Last updated: 2026-05-29
Use this during the live hosted pilot rollout while filling [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md). This is the operator worksheet, not the full procedure. Use [FIRST_HOSTED_PILOT_HANDOFF.md](./FIRST_HOSTED_PILOT_HANDOFF.md) for the short launch path and [PILOT_LAUNCH_RUNBOOK.md](./PILOT_LAUNCH_RUNBOOK.md) for the full operational contract.

## 1. Before deployment

Fill these in the launch record before touching Render:

- Section 1 and Section 2 owners and decisions in [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md)
- Git revision or release tag to launch
- Live `NEXT_PUBLIC_SUPPORT_EMAIL`
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

## 3. Render deployment

In Render, create or sync the Blueprint from [render.yaml](../render.yaml), confirm `smart-training-db`, `smart-training-api`, and `smart-training-web` provision, and enter the live `NEXT_PUBLIC_SUPPORT_EMAIL` when prompted.

Copy from Render into Section 3 of [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md) as soon as they exist:

- Web URL
- API URL
- `/api/health` URL
- Last known-good web deploy id
- Last known-good API deploy id

If the Postgres database is new or reset, also run:

```powershell
pnpm --filter api db:bootstrap
pnpm seed
```

Record the operator note or artifact only if bootstrap or seed needed explanation.

Stop and declare `No-go` if any required service fails to provision, if the live URLs are still unknown, or if database bootstrap or seed fails for a new or reset pilot database.

## 4. Live verification

Run after the live URLs are known:

```powershell
Invoke-RestMethod <API_URL>/api/health | ConvertTo-Json -Depth 5
pnpm smoke:hosted -- --api <API_URL> --web <WEB_URL> --support-email <NEXT_PUBLIC_SUPPORT_EMAIL>
```

The health check is `PASS` only if it returns:

- `status=ok`
- `storageBackend=postgres`
- `openAiTextEnabled=false`
- `voiceLabEnabled=false`

Record immediately in Section 4:

- `Live /api/health posture check` result plus the four returned values
- `pnpm smoke:hosted` exact command and result

Stop and declare `No-go` if the health payload differs from the approved posture or if `pnpm smoke:hosted` fails.

## 5. Manual hosted checks

Run [HOSTED_QA_CHECKLIST.md](./HOSTED_QA_CHECKLIST.md) on the live environment, then verify the support contact on `/privacy` matches the launch contact.

Record immediately in Section 4:

- `Hosted QA checklist` result
- Scenario used
- Whether transcript reopen was confirmed
- Whether deletion forced immediate re-auth
- `No blocking defects observed` or a one-line blocking defect summary
- `/privacy` support-contact visibility result

Record hosted demo rehearsal evidence only if it was actually run.

Stop and declare `No-go` if hosted QA fails, transcript reopen fails, deletion does not force re-auth, or `/privacy` does not show the configured support contact.

## 6. Monitoring and backup proof before opening access

Before opening pilot access, capture the required monitoring and export evidence from [PILOT_LAUNCH_RUNBOOK.md](./PILOT_LAUNCH_RUNBOOK.md) into Section 4A and Section 3 or Section 5 of [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md):

- Render failure notifications and deploy history visible for API and web
- Live service logs openable for API and web
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

If any item above is incomplete or failed, keep the rollout at `No-go` and use [FINAL_READINESS_REVIEW.md](./FINAL_READINESS_REVIEW.md) plus [PILOT_LAUNCH_RUNBOOK.md](./PILOT_LAUNCH_RUNBOOK.md) to resolve the blocker before opening pilot access.
