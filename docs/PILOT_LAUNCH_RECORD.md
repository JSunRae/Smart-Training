# Pilot Launch Record

Last updated: 2026-11-13
Status: hosted application rollout deferred; the separate marketing site is live, but this record remains the control point before opening external pilot access. Current work follows [ENQUIRY_FIRST_LAUNCH.md](ENQUIRY_FIRST_LAUNCH.md).

September 13 preparation note: the hosted website draft and security dependency refresh are recorded in [JASONRAE_WEBSITE_INTEGRATION.md](JASONRAE_WEBSITE_INTEGRATION.md). Source candidate `ddc337f` includes the approved support contact on top of security-fix commit `498c0d5` and passed its release gate; the July tag is historical. Hosted application fields remain unknown and the pilot remains no-go. A 26 September marketing release addendum records production revision `6ab78c1684f6d6072a619a27` at `https://training.jasonrae.ai/`; an authorized fictional non-PII test is captured as normal submission `#5`. A separate fictional website enquiry and its Netlify notification forwarded to Outlook were verified on 13 October in [Website Coordination's delivery receipt](../../Website%20Coordination/docs/email-routing-2026-10-13/DELIVERY_VERIFICATION.md). That website test does not establish hosted application notification/support operations or pilot readiness. No application deployment, paid provisioning, real contact data or pilot access occurred.

Use this file as the single launch-control record for the first hosted pilot.

The controlled-access API defaults to closed in production and supports invitation-only enrolment, operator-assisted recovery and session revocation. Use the reviewed candidate, record the committed local gate and disposable PostgreSQL results in the owning checkout, and capture live evidence below after approval. [Pilot access runbook](PILOT_ACCESS_RUNBOOK.md)

Use [FINAL_READINESS_REVIEW.md](./FINAL_READINESS_REVIEW.md) during the final pilot review meeting, then use this file to confirm the evidence package and deployment facts are complete.

## Marketing website handoff evidence

This section covers the product-owned marketing site only. It does not fill or replace the hosted application fields in Sections 3–5.

| Item | Evidence |
| --- | --- |
| Canonical marketing URL | `https://training.jasonrae.ai/` over valid HTTPS |
| Netlify project / production revision | `smart-training-992w` / `6ab78c1684f6d6072a619a27` |
| Marketing routes | Homepage, privacy, pilot brief, three use-case routes, `/robots.txt`, `/sitemap.xml` and `/pilot-brief.txt` verified live; sitemap has six canonical entries |
| Enquiry contract | `smart-training-enquiry` registered with qualification, attribution, acknowledgement/version and honeypot fields |
| Consent / acknowledgement | Required `enquiry_acknowledgement` with versioned `consent_version` and privacy link |
| Synthetic production test | Earlier fictional `.invalid` submission reached the success state and appears in Netlify spam; later fictional non-PII `example.com` test reached HTTP 200 and is captured as normal submission `#5` with the expected fields |
| Marketing rollback | Previous production revision `6aae9000367fc01b709b4f6f` |
| Boundary | Product web/API URLs, hosted smoke, database, monitoring, export, recovery and pilot-access evidence remain `TBD` until the application is actually deployed and tested |

The synthetic tests prove the production form reaches Netlify's capture path, including the normal submission collection for a non-PII test. The separate 13 October receipt linked above verifies one fictional enquiry's notification delivery to Outlook. Both forms of evidence are limited to the marketing form; neither establishes hosted application notification/support handling. Review the [marketing release record](WEBSITE_RELEASE_2026-09-19.md) before treating the website handoff as complete.

For live step order during rollout, use [HOSTED_LAUNCH_WORKSHEET.md](./HOSTED_LAUNCH_WORKSHEET.md) and record each result here immediately after the step completes.

## 1. Operator decisions

| Decision                                 | Value                                                                                                                                         |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Render workspace tier                    | `Hobby` - selected by Jason on September 13; do not upgrade to Pro |
| Domain posture                           | `onrender.com` for the first pilot                                                                                                            |
| API exposure                             | `Public`                                                                                                                                      |
| OpenAI text default                      | `Disabled`                                                                                                                                    |
| Voice lab                                | `Disabled`                                                                                                                                    |
| Postgres region                          | `Virginia, USA`                                                                                                                               |
| Extra backup/export policy beyond Render | `Named pre-pilot logical export before access opens, weekly manual export during the pilot, 30-day retention in operator-controlled storage.` |
| Approved product support contact | `Jason_C_Rae@Outlook.com` - Jason confirmed September 13, 2026; local Blueprint configured, hosted visibility still unverified |
| Observed Render workspace state | September 13: `Smart Training` / `tea-d86samuk1jcs739kdda0`, `Hobby`, no card, services or Blueprint instances; no resources created |
| Paid provisioning decision | Intentionally deferred until an interested client needs an independent trial. Hobby has a USD 0 workspace fee, not free compute/storage. Recheck the actual budget and obtain spending approval at that point. |

## 2. Ownership

| Area                          | Owner   | Contact / escalation |
| ----------------------------- | ------- | -------------------- |
| Database access and restore   | `Pilot` | `Pilot`              |
| Web deploy approvals          | `Pilot` | `Pilot`              |
| API deploy approvals          | `Pilot` | `Pilot`              |
| Pilot support and inbox monitoring | `TBD` | Confirm access and responsibility for the approved Outlook inbox. |
| Physical iPhone Safari acceptance | `TBD` | Name the tester before hosted QA. |
| Secrets rotation              | `Pilot` | `Pilot`              |
| Privacy and deletion requests | `Pilot` | `Pilot`              |
| Incident response             | `Pilot` | `Pilot`              |

## 3. Live deployment details

| Item                                       | Value                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| Git revision / release tag                 | `TBD` - select and verify the exact committed hosted candidate |
| Web URL                                    | `TBD`                                                                       |
| API URL                                    | `TBD`                                                                       |
| `/api/health` URL                          | `TBD`                                                                       |
| Render database name                       | `smart-training-db`                                                         |
| Render API service name                    | `smart-training-api`                                                        |
| Pilot frontend target | `TBD` - approved Netlify site and deploy context for the hybrid topology |
| Hosted support contact shown on `/privacy` | `TBD - must show approved NEXT_PUBLIC_SUPPORT_EMAIL=Jason_C_Rae@Outlook.com after deployment` |
| Last known-good web deploy id              | `TBD`                                                                       |
| Last known-good API deploy id              | `TBD`                                                                       |
| Pre-pilot logical export artifact          | `TBD`                                                                       |
| Recovery window being relied on            | `Not provisioned. Future paid Postgres on Hobby: verify 3-day PITR, plus pre-pilot and weekly manual logical exports retained for 30 days. Do not claim the historical 7-day Pro window.` |

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
| `pnpm release:check` | Release gate passed | `CI=true pnpm release:check` | `TBD` | `TBD` | `TBD` | Record the gate log for the selected committed hosted revision. | `TBD` |
| Live `/api/health` posture check | Four-key health posture | `Invoke-RestMethod [health url] \| ConvertTo-Json -Depth 5` | `TBD` | `TBD` | `TBD` | `Health URL plus saved response path/URL, or n/a.` | `If FAIL, note owner and next step.` |
| Direct `pnpm smoke:hosted` | Render API passes with its own synthetic invitation | `pnpm smoke:hosted -- --api [api url] --web [web url] --support-email [support email]` | `TBD` | `TBD` | `TBD` | Saved log path or note URL. | If FAIL, note blocker and owner. |
| Proxied `pnpm smoke:hosted` | Netlify web proxy passes with a fresh synthetic invitation | `pnpm smoke:hosted -- --api [web url] --web [web url] --support-email [support email]` | `TBD` | `TBD` | `TBD` | Saved log path or note URL. | If FAIL, note blocker and owner. |
| Physical iPhone Safari | The invited practice and transcript workflow passes on a physical iPhone | [Run the iPhone checks](TESTING_AND_IPHONE_GUIDE_2026-09-19.md) | `TBD` | `TBD` | `TBD` | Record device model, iOS, revision, keyboard, rotation/resume, interrupted connectivity and auth outcome. | If FAIL, note blocker and owner. |
| Pre-pilot logical export evidence | Export artifact verified | `Run pre-pilot pg_dump export and verify stored artifact exists` | `TBD` | `TBD` | `TBD` | `Artifact filename plus storage path.` | `If FAIL, note re-run timing.` |
| Hosted QA checklist | Hosted QA handoff passed | `Manual run of HOSTED_QA_CHECKLIST.md` | `TBD` | `TBD` | `TBD` | `Checklist copy, screenshot path, or note URL with scenario and transcript reopen result.` | `If FAIL, note next owner/action.` |
| Hosted demo rehearsal | Demo rehearsal passed | `Manual rehearsal using hosted demo flow` | `TBD` | `TBD` | `TBD` | `Recording, screenshot path, or note URL with scenario used.` | `If FAIL, note retry plan.` |
| `/privacy` support contact visible | Support contact confirmed | `Open [web url]/privacy` | `TBD` | `TBD` | `TBD` | `Screenshot path, page URL, or note URL proving the configured support contact and retention/deletion wording.` | `If FAIL, note config fix owner.` |

Keep hosted-dependent `TBD` values in this file until the hosted environment exists and the evidence has been captured from the live pilot deployment. Preflight evidence that does not depend on the hosted environment, such as `pnpm release:check`, can be recorded when it is actually run from the selected committed launch revision. A dirty working-tree pass is useful audit evidence, but it does not replace launch-revision evidence.

Historical evidence: `pilot-launch-2026-07-13` passed the release gate on 2026-07-13 at 03:31 Europe/Berlin, including 48 Vitest tests, both builds, browser E2E and the then-current dependency audits. The September `ddc337f` candidate passed at 14:12 Europe/Berlin on 2026-09-13 with 48 tests, both builds, a Playwright test and a clean production audit. Its application, Blueprint and lockfile matched the commit, and the result is recorded in `test-results/release-candidate-ddc337f.log`. Later dependency advisories required fresh checks.

For `pnpm release:check`, `PASS` means typecheck, lint, Vitest, build, Playwright E2E, and `pnpm audit --prod` all completed and the command exited `0`.

The hosted demo rehearsal row is launch-supporting evidence, not a replacement for the hosted QA checklist row.

Use these row rules when you fill Section 4:

- `Live /api/health posture check`: accept `PASS` only if the live health response shows `status=ok`, `storageBackend=postgres`, `openAiTextEnabled=false`, and `voiceLabEnabled=false`.
- For each hosted smoke row, require health, privacy, invited registration, roleplay, completion and rejection of the previous session cookie after deletion. Use a fresh synthetic invitation for each path.
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
| Restart / crash visibility | The operator can inspect Render API restart and deployment history, and the Netlify pilot deployment and function failure history. | `TBD` | `Pilot` | `TBD` | `Screenshot path, dashboard URL, or n/a.` | `Only if setup is incomplete.` |
| Service logs | The operator can open Render API logs and Netlify pilot frontend function or deploy logs for triage. | `TBD` | `Pilot` | `TBD` | `Log view URL, screenshot path, or n/a.` | `Only if access still needs setup.` |
| Database visibility | The operator can open the `smart-training-db` dashboard and inspect current database status plus provider-visible connection or auth failures. | `TBD` | `Pilot` | `TBD` | `Dashboard URL, screenshot path, or n/a.` | `Only if a permission fix is needed.` |
| Backup confirmation | Render backup or PITR coverage is visible for `smart-training-db`, the recovery window in Section 3 is current, and the restore owner in Section 5 remains explicit. | `TBD` | `Pilot` | `TBD` | `Backup screen path/URL, note URL, or n/a.` | `Only if ownership needs update.` |
| Manual logical export | One dated export was created before pilot access opened, saved to operator-controlled storage, the artifact check was recorded, and the weekly repeat owner and cadence are noted. | `TBD` | `Pilot` | `TBD` | `Export storage path plus cadence note or note URL.` | `Only if re-run is scheduled.` |

If any row above is still `TBD`, the pilot remains no-go even if deployment and QA evidence is otherwise complete.

## 5. Rollback and recovery

| Item                              | Value                                                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Web recovery target | `TBD` - retained deploy or tested fix-forward path for the approved Netlify pilot target |
| API rollback target               | `Most recent known-good Render deploy id for smart-training-api`                                                            |
| Database restore owner            | `Pilot`                                                                                                                     |
| Database restore executed by      | `Pilot`                                                                                                                     |
| Database restore trigger criteria | `Only after pilot access is paused and a service rollback cannot fix confirmed data loss, corruption, or the release issue` |
| Pilot pause decision owner        | `Pilot`                                                                                                                     |

Rollback sequence for the first pilot:

1. Pause pilot access.
2. Recover the failing service using the recorded Render API or Netlify pilot frontend target. Verify that access is still closed after recovery.
3. Re-check `GET /api/health`.
4. Repeat direct and proxy smoke with new synthetic invitations in the approved test window.
5. If the problem is still data loss, corruption, or a release issue that service rollback cannot correct, the `Pilot` operator executes the recorded database restore.
6. Reopen access only after the smoke path and hosted QA pass again.

## 6. Hosted validation commands

Run the local gate before deployment. Once hosted testing is authorized and the origins are known, load a fresh synthetic invitation and email for each smoke run. [Token handling and launch steps](PILOT_LAUNCH_RUNBOOK.md)

```powershell
pnpm release:check
Invoke-RestMethod "$apiUrl/api/health" | ConvertTo-Json -Depth 5
pnpm smoke:hosted -- --api $apiUrl --web $webUrl --support-email Jason_C_Rae@Outlook.com
# Load a fresh synthetic invitation and email before testing the web proxy.
pnpm smoke:hosted -- --api $webUrl --web $webUrl --support-email Jason_C_Rae@Outlook.com
```

The first command is the local repo release gate for the launch revision. It passes only if the repo-root run completes typecheck, lint, Vitest, build, Playwright E2E, and `pnpm audit --prod` with exit `0`.

The health posture command should return JSON that includes:

- `status=ok`
- `storageBackend=postgres`
- `openAiTextEnabled=false`
- `voiceLabEnabled=false`

Use the same four keys when recording rollback verification after a deploy reversal.
