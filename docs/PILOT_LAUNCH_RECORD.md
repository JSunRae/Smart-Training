# Pilot Launch Record

Last updated: 2026-05-20
Status: fill this before opening external pilot access

Use this file as the single launch-control record for the first hosted pilot.

## 1. Operator decisions

| Decision | Value |
|---|---|
| Render workspace tier | `Pro` |
| Domain posture | `onrender.com` for the first pilot |
| API exposure | `Public` |
| OpenAI text default | `Disabled` |
| Voice lab | `Disabled` |
| Postgres region | `Virginia, USA` |
| Extra backup/export policy beyond Render | `Create one logical export before pilot access, then one manual export each week during the pilot. Retain exports for 30 days in operator-controlled storage.` |

## 2. Ownership

| Area | Owner | Contact / escalation |
|---|---|---|
| Database access and restore | `Pilot` | `Pilot` |
| Web deploy approvals | `Pilot` | `Pilot` |
| API deploy approvals | `Pilot` | `Pilot` |
| Secrets rotation | `Pilot` | `Pilot` |
| Privacy and deletion requests | `Pilot` | `Pilot` |
| Incident response | `Pilot` | `Pilot` |

## 3. Live deployment details

| Item | Value |
|---|---|
| Git revision / release tag | `TBD` |
| Web URL | `TBD` |
| API URL | `TBD` |
| `/api/health` URL | `TBD` |
| Render database name | `smart-training-db` |
| Render API service name | `smart-training-api` |
| Render web service name | `smart-training-web` |
| Last known-good web deploy id | `TBD` |
| Last known-good API deploy id | `TBD` |
| Recovery window being relied on | `7-day Render PITR plus weekly manual logical exports retained for 30 days` |

## 4. Launch evidence

| Check | Result | Run by | Timestamp |
|---|---|---|---|
| `pnpm release:check` | `TBD` | `TBD` | `TBD` |
| Live `/api/health` posture check | `TBD` | `TBD` | `TBD` |
| `pnpm smoke:hosted` | `TBD` | `TBD` | `TBD` |
| Hosted QA checklist | `TBD` | `TBD` | `TBD` |
| Hosted demo rehearsal | `TBD` | `TBD` | `TBD` |
| `/privacy` support contact visible | `TBD` | `TBD` | `TBD` |

## 5. Rollback and recovery

| Item | Value |
|---|---|
| Web rollback target | `Most recent known-good Render deploy id for smart-training-web` |
| API rollback target | `Most recent known-good Render deploy id for smart-training-api` |
| Database restore owner | `Pilot` |
| Database restore trigger criteria | `Any confirmed data loss, unrecoverable corruption, or release issue that cannot be fixed with service rollback alone` |
| Pilot pause decision owner | `Pilot` |

Rollback sequence for the first pilot:

1. Pause pilot access.
2. Roll back the failing Render service to the last known-good deploy id above.
3. Re-check `GET /api/health`.
4. Re-run `pnpm smoke:hosted`.
5. Reopen access only after the smoke path and hosted QA pass again.

## 6. Hosted smoke command

Use this when the live web and API URLs are known:

```powershell
pnpm smoke:hosted -- --api https://api.example.onrender.com --web https://smart-training.example.onrender.com --support-email pilot-support@example.com
```
