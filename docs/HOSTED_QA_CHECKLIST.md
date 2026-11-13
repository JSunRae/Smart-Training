# Hosted QA Checklist

Last updated: 2026-05-29
Environment: hosted `web` + hosted `api`
Status: pending until run against the real pilot environment

Use this checklist after the hosted deployment and after `pnpm smoke:hosted` passes.
Record the final result in the `Hosted QA checklist` row in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
Treat this checklist as part of the P0 closure evidence listed in [READINESS_AUDIT.md](READINESS_AUDIT.md).
When you complete this checklist, fill the launch-record row using the compact evidence schema: `Result`, `Operator`, `Timestamp`, `Artifact / note location`, and `Failure follow-up` if the run failed or still needs action.

`pnpm smoke:hosted` checks `/api/health`, optional `/privacy`, registration, dashboard access, session start, buyer reply, coach reply, session completion, the completed session on the dashboard, and rejection of the previous session cookie after account deletion. This checklist covers transcript reopening and visible UI workflow checks.

## Relationship to the hosted demo

Use [HOSTED_DEMO_FLOW.md](HOSTED_DEMO_FLOW.md) when you need a stakeholder-readable rehearsal of the live text workflow.

- The hosted demo can supply supporting evidence for the core text workflow if it was run against the same live environment.
- This checklist remains the hosted acceptance path because it also covers `/privacy`, support-contact posture, account deletion, and auth re-entry.
- Do not mark hosted QA as complete from demo evidence alone.

## 1. Launch posture

1. Open the hosted `/privacy` page.
2. Confirm `/privacy` shows at least one operator-facing support contact method: the configured `NEXT_PUBLIC_SUPPORT_EMAIL` or `NEXT_PUBLIC_SUPPORT_URL`.
3. Confirm the page states completed or abandoned transcript history is capped at 30 days by default, that active sessions are not pruned until they end, and that account deletion removes the signed-in account immediately.
4. Confirm `/voice-lab` is not part of the visible default workflow.

## 2. Core text workflow

If you already ran the hosted demo rehearsal against the same live environment, you may reuse that evidence for this section only if you also record the exact scenario used and confirm the transcript was reopened from the dashboard.

1. Open the hosted web app.
2. Redeem a dedicated synthetic invitation for its issued email. Confirm the account joins the intended organisation and a direct uninvited registration is rejected. [Pilot access runbook](PILOT_ACCESS_RUNBOOK.md)
3. Confirm the dashboard loads and seeded scenarios are visible.
4. Start `Frontline Coaching Consistency` if present, otherwise start any seeded scenario.
5. Send one seller turn.
6. Confirm a buyer response is appended.
7. Trigger `Pause for coach`.
8. Confirm coach guidance is appended.
9. End the session.
10. Return to the dashboard and reopen the saved transcript.

Record which scenario was used. Prefer `Frontline Coaching Consistency`; if it is unavailable, name the seeded fallback scenario you used.

## 3. Recovery, revocation and deletion

1. Sign in to the synthetic account in two browser contexts. Sign out on all devices in one context and confirm the other needs to sign in again.
2. Sign in again and rehearse an operator-issued reset for the same synthetic account. Verify the previous password and sessions are rejected, then sign in with the new password. [Pilot access runbook](PILOT_ACCESS_RUNBOOK.md)
3. Delete the synthetic account from the dashboard. Confirm immediate sign-out and that returning to the dashboard requires authentication.
4. Check that the deleted account has lost dashboard and transcript access. The 30-day retention window applies to non-active transcripts that remain after normal use.

## 4. Acceptance result

After you finish Sections 1 through 3, immediately update the `Hosted QA checklist` row in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). That row is the authoritative hosted QA result for launch control.

Record the result like this:

- `PASS` means every checklist section completed on the hosted environment, transcript reopen was confirmed, `/privacy` showed the configured support contact, and no blocking UI or auth defect was observed.
- `FAIL` means any required step or acceptance check failed, or any blocking defect prevented the normal hosted workflow from completing.
- Put the scenario used, transcript reopen result, deletion re-auth result, and any screenshot path, checklist copy, or note URL into `Artifact / note location`.
- Note defects briefly in the launch record row only. Do not turn this checklist into a defect tracker.
- If the run passed cleanly, use `Failure follow-up = n/a`. If the run failed, put the blocking defect and next owner or action in one short sentence there.
- Always note the scenario used. If `Frontline Coaching Consistency` was unavailable, name the seeded fallback scenario.

Mark `PASS` only if:

1. The full text workflow succeeds without manual API intervention.
2. Transcript history persists and reopens correctly.
3. `/privacy` shows the exact operator support email or support URL configured for launch.
4. All-device sign-out, password reset and account deletion force re-authentication immediately.
5. No blocking UI or auth defects are observed.

Hosted demo evidence can help prove item 1 and item 2, but item 3 through item 5 still require this hosted QA run.

If any item fails, record `FAIL` in the `Hosted QA checklist` row in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md), summarize the blocking defect briefly, note the next follow-up owner or action, and keep launch status at no-go until the defect is resolved and hosted QA is rerun.

Suggested launch-record wording:

- `PASS - Hosted QA completed on [scenario]; transcript reopen confirmed; no blocking defects observed.`
- `FAIL - Hosted QA blocked on [scenario]; transcript reopen [failed or not reached]; blocking defect: [brief defect].`
