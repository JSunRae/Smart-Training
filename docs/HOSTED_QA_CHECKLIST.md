# Hosted QA Checklist

Last updated: 2026-05-16
Environment: hosted `web` + hosted `api`
Status: pending until run against the real pilot environment

Use this checklist after the hosted deployment and after `pnpm smoke:hosted` passes.
Record the final result in [PILOT_LAUNCH_RECORD.md](/C:/Users/Pilot/Documents/Vs%20Code%20Projects/Smart_Training/docs/PILOT_LAUNCH_RECORD.md).

## 1. Launch posture

1. Open the hosted `/privacy` page.
2. Confirm support contact details are visible.
3. Confirm the page still states 30-day retention and account-driven deletion.
4. Confirm `/voice-lab` is not part of the visible default workflow.

## 2. Core text workflow

1. Open the hosted web app.
2. Create a new workspace account.
3. Confirm the dashboard loads and seeded scenarios are visible.
4. Start `Frontline Coaching Consistency` if present, otherwise start any seeded scenario.
5. Send one seller turn.
6. Confirm a buyer response is appended.
7. Trigger `Pause for coach`.
8. Confirm coach guidance is appended.
9. End the session.
10. Return to the dashboard and reopen the saved transcript.

## 3. Deletion and auth

1. Delete the account from the dashboard.
2. Confirm the session is terminated.
3. Confirm returning to the dashboard requires authentication again.

## 4. Acceptance result

Mark pass only if:

1. The full text workflow succeeds without manual API intervention.
2. Transcript history persists and reopens correctly.
3. The support contact is visible on `/privacy`.
4. No blocking UI or auth defects are observed.
