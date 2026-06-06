# Pilot Launch Record

Last updated: 2026-06-05
Status: fill this before opening external pilot access

Use this file as the single launch-control record for the first hosted pilot.

Use [FINAL_READINESS_REVIEW.md](./FINAL_READINESS_REVIEW.md) during the final pilot review meeting, then use this file to confirm the evidence package and deployment facts are complete.

For live step order during rollout, use [HOSTED_LAUNCH_WORKSHEET.md](./HOSTED_LAUNCH_WORKSHEET.md) and record each result here immediately after the step completes.

## 1. Operator decisions

| Decision                                 | Value                                                                                                                                         |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Render workspace tier                    | `Pro`                                                                                                                                         |
| Domain posture                           | `onrender.com` for the first pilot                                                                                                            |
| API exposure                             | `Public`                                                                                                                                      |
| OpenAI text default                      | `Disabled`                                                                                                                                    |
| Voice lab                                | `Disabled`                                                                                                                                    |
| Postgres region                          | `Virginia, USA`                                                                                                                               |
| Extra backup/export policy beyond Render | `Named pre-pilot logical export before access opens, weekly manual export during the pilot, 30-day retention in operator-controlled storage.` |

## 2. Ownership

| Area                          | Owner   | Contact / escalation |
| ----------------------------- | ------- | -------------------- |
| Database access and restore   | `Pilot` | `Pilot`              |
| Web deploy approvals          | `Pilot` | `Pilot`              |
| API deploy approvals          | `Pilot` | `Pilot`              |
| Secrets rotation              | `Pilot` | `Pilot`              |
| Privacy and deletion requests | `Pilot` | `Pilot`              |
| Incident response             | `Pilot` | `Pilot`              |

## 3. Live deployment details

| Item                                       | Value                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| Git revision / release tag                 | `TBD - commit or tag the audited working tree before opening pilot access`   |
| Web URL                                    | `TBD`                                                                       |
| API URL                                    | `TBD`                                                                       |
| `/api/health` URL                          | `TBD`                                                                       |
| Render database name                       | `smart-training-db`                                                         |
| Render API service name                    | `smart-training-api`                                                        |
| Render web service name                    | `smart-training-web`                                                        |
| Hosted support contact shown on `/privacy` | `TBD - must match NEXT_PUBLIC_SUPPORT_EMAIL or NEXT_PUBLIC_SUPPORT_URL`     |
| Last known-good web deploy id              | `TBD`                                                                       |
| Last known-good API deploy id              | `TBD`                                                                       |
| Pre-pilot logical export artifact          | `TBD`                                                                       |
| Recovery window being relied on            | `7-day Render PITR plus weekly manual logical exports retained for 30 days` |

## 4. Launch evidence

Use the P0 items in [READINESS_AUDIT.md](READINESS_AUDIT.md) as the closure standard for this section. If any required row below is still `TBD`, the hosted pilot remains no-go.

Record each row immediately after it is run. Use the same compact evidence fields in Section 4 and Section 4A:

- `Command / action`: exact command run or the operator action taken.
- `Result`: start with `PASS` or `FAIL`, then the short observed outcome.
- `Operator`: who ran the check.
- `Timestamp`: local date and time when possible, for example `2026-05-29 14:35 ET`.
- `Artifact / note location`: saved response, screenshot path, log path, checklist copy, note URL, or `n/a` if no separate artifact was kept.
- `Failure follow-up`: next action, owner, or ticket only when the row is `FAIL` or still needs follow-up; otherwise use `n/a`.

For `pnpm release:check`, record the repo-root run from the launch revision only. `PASS` means typecheck, lint, Vitest, build, Playwright E2E, and `pnpm audit --prod` all completed and the command exited `0`.

| Check | Acceptable evidence | Command / action | Result | Operator | Timestamp | Artifact / note location | Failure follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pnpm release:check` | Release gate passed | `pnpm release:check` | `TBD - local audited working tree passed on 2026-06-05; rerun and record PASS only from the final committed launch revision` | `Pilot` | `2026-06-05` | `n/a` | `Commit or tag the audited working tree, rerun the gate, and replace this row with final revision evidence.` |
| Live `/api/health` posture check | Four-key health posture | `Invoke-RestMethod [health url] \| ConvertTo-Json -Depth 5` | `TBD` | `TBD` | `TBD` | `Health URL plus saved response path/URL, or n/a.` | `If FAIL, note owner and next step.` |
| `pnpm smoke:hosted` | Hosted smoke passed | `pnpm smoke:hosted -- --api [api url] --web [web url] --support-email [support email]` | `TBD` | `TBD` | `TBD` | `Saved log path, screenshot path, or note URL, or n/a.` | `If FAIL, note blocker and owner.` |
| Pre-pilot logical export evidence | Export artifact verified | `Run pre-pilot pg_dump export and verify stored artifact exists` | `TBD` | `TBD` | `TBD` | `Artifact filename plus storage path.` | `If FAIL, note re-run timing.` |
| Hosted QA checklist | Hosted QA handoff passed | `Manual run of HOSTED_QA_CHECKLIST.md` | `TBD` | `TBD` | `TBD` | `Checklist copy, screenshot path, or note URL with scenario and transcript reopen result.` | `If FAIL, note next owner/action.` |
| Hosted demo rehearsal | Demo rehearsal passed | `Manual rehearsal using hosted demo flow` | `TBD` | `TBD` | `TBD` | `Recording, screenshot path, or note URL with scenario used.` | `If FAIL, note retry plan.` |
| `/privacy` support contact visible | Support contact confirmed | `Open [web url]/privacy` | `TBD` | `TBD` | `TBD` | `Screenshot path, page URL, or note URL proving the configured support contact and retention/deletion wording.` | `If FAIL, note config fix owner.` |

Keep hosted-dependent `TBD` values in this file until the hosted environment exists and the evidence has been captured from the live pilot deployment. Preflight evidence that does not depend on the hosted environment, such as `pnpm release:check`, can be recorded when it is actually run.

For `pnpm release:check`, `PASS` means typecheck, lint, Vitest, build, Playwright E2E, and `pnpm audit --prod` all completed and the command exited `0`.

The hosted demo rehearsal row is launch-supporting evidence, not a replacement for the hosted QA checklist row.

Use these row rules when you fill Section 4:

- `Live /api/health posture check`: accept `PASS` only if the live health response shows `status=ok`, `storageBackend=postgres`, `openAiTextEnabled=false`, and `voiceLabEnabled=false`.
- `pnpm smoke:hosted`: accept `PASS` only if the hosted smoke path clears health, privacy, auth, session, coach, transcript, deletion, and logout checks on the live deployment.
- `Pre-pilot logical export evidence`: accept `PASS` only if the filename, storage location, matching revision, and existence check are recorded.
- `Hosted QA checklist`: accept `PASS` only if every item in [HOSTED_QA_CHECKLIST.md](HOSTED_QA_CHECKLIST.md) passed on the hosted environment, transcript reopen was confirmed, and no blocking defect was observed. This row is the final hosted-QA result used for go / no-go.
- `Hosted QA checklist`: the recorded evidence must also capture the scenario used, whether `Frontline Coaching Consistency` or a fallback seeded scenario was used, whether transcript reopen was confirmed, whether deletion forced immediate re-auth, and either `No blocking defects observed` or a one-line blocking defect summary.
- `Hosted demo rehearsal`: accept `PASS` only if the live hosted rehearsal reaches buyer reply, coach guidance, session end, and transcript reopen without manual intervention.
- `/privacy` support contact visible: accept `PASS` only if `/privacy` shows the live operator-facing support contact, states that completed or abandoned transcripts are retained for at most 30 days by default, states that active sessions are not pruned until they end, and states that account deletion is immediate.

For the `Hosted QA checklist` row, keep the result field simple and operational:

- Use `PASS - ...` only when the hosted QA checklist passed cleanly.
- Use `FAIL - ...` if any hosted QA acceptance item failed or a blocking defect was found.
- Record the blocking defect briefly in `Result`, `Artifact / note location`, or `Failure follow-up`; do not expand this table into a defect tracker.
- If this row is `FAIL` or `TBD`, hosted QA has not handed off a go decision and the pilot remains no-go.

## 4A. Monitoring evidence

Use this section to prove the minimum first-pilot monitoring posture is configured before external access opens. Every row is required for go-live. Use the same compact evidence schema as Section 4 so operators do not have to switch formats mid-launch.

| Monitoring check | Configured when | Result | Operator | Timestamp | Artifact / note location | Failure follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Health probe | The live `/api/health` URL is known, the response was checked from the hosted API, and the returned posture is `status=ok`, `storageBackend=postgres`, `openAiTextEnabled=false`, and `voiceLabEnabled=false`. | `TBD` | `Pilot` | `TBD` | `Response path/URL, note URL, or n/a.` | `Only if FAIL or re-check needed.` |
| Restart / crash visibility | Render notifications are enabled for failure events and the operator can open restart or deploy history for both `smart-training-api` and `smart-training-web`. | `TBD` | `Pilot` | `TBD` | `Screenshot path, dashboard URL, or n/a.` | `Only if setup is incomplete.` |
| Service logs | The operator can open live logs for both hosted services from the Render dashboard and use them for incident triage without extra setup. | `TBD` | `Pilot` | `TBD` | `Log view URL, screenshot path, or n/a.` | `Only if access still needs setup.` |
| Database visibility | The operator can open the `smart-training-db` dashboard and inspect current database status plus provider-visible connection or auth failures. | `TBD` | `Pilot` | `TBD` | `Dashboard URL, screenshot path, or n/a.` | `Only if a permission fix is needed.` |
| Backup confirmation | Render backup or PITR coverage is visible for `smart-training-db`, the recovery window in Section 3 is current, and the restore owner in Section 5 remains explicit. | `TBD` | `Pilot` | `TBD` | `Backup screen path/URL, note URL, or n/a.` | `Only if ownership needs update.` |
| Manual logical export | One dated export was created before pilot access opened, saved to operator-controlled storage, the artifact check was recorded, and the weekly repeat owner and cadence are noted. | `TBD` | `Pilot` | `TBD` | `Export storage path plus cadence note or note URL.` | `Only if re-run is scheduled.` |

If any row above is still `TBD`, the pilot remains no-go even if deployment and QA evidence is otherwise complete.

## 5. Rollback and recovery

| Item                              | Value                                                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Web rollback target               | `Most recent known-good Render deploy id for smart-training-web`                                                            |
| API rollback target               | `Most recent known-good Render deploy id for smart-training-api`                                                            |
| Database restore owner            | `Pilot`                                                                                                                     |
| Database restore executed by      | `Pilot`                                                                                                                     |
| Database restore trigger criteria | `Only after pilot access is paused and a service rollback cannot fix confirmed data loss, corruption, or the release issue` |
| Pilot pause decision owner        | `Pilot`                                                                                                                     |

Rollback sequence for the first pilot:

1. Pause pilot access.
2. Roll back the failing Render service to the last known-good deploy id above.
3. Re-check `GET /api/health`.
4. Re-run `pnpm smoke:hosted`.
5. If the problem is still data loss, corruption, or a release issue that service rollback cannot correct, the `Pilot` operator executes the recorded database restore.
6. Reopen access only after the smoke path and hosted QA pass again.

## 6. Hosted validation commands

Run these in order after the live deployment exists and the real hosted values are known:

```powershell
pnpm release:check
Invoke-RestMethod https://api.example.onrender.com/api/health | ConvertTo-Json -Depth 5
pnpm smoke:hosted -- --api https://api.example.onrender.com --web https://smart-training.example.onrender.com --support-email pilot-support@example.com
```

The first command is the local repo release gate for the launch revision. It passes only if the repo-root run completes typecheck, lint, Vitest, build, Playwright E2E, and `pnpm audit --prod` with exit `0`.

The health posture command should return JSON that includes:

- `status=ok`
- `storageBackend=postgres`
- `openAiTextEnabled=false`
- `voiceLabEnabled=false`

Use the same four keys when recording rollback verification after a deploy reversal.

Use the smoke command only when the live web and API URLs are known:

```powershell
pnpm smoke:hosted -- --api https://api.example.onrender.com --web https://smart-training.example.onrender.com --support-email pilot-support@example.com
```
