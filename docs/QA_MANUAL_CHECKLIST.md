# QA Manual Checklist

Validated on: 2026-05-15
Environment: local `pnpm dev:web` + `pnpm dev:api`
Status: pass

## Journey verified

1. Open `http://localhost:3000`.
2. Create a new workspace account.
3. Confirm dashboard loads with seeded scenarios.
4. Start a scenario.
5. Send a seller turn.
6. Confirm buyer response appears.
7. Pause for coach.
8. Confirm coach guidance is appended to the transcript.
9. End the session.
10. Return to dashboard and confirm transcript history is visible.

## Observed result

- Full launch-path flow worked without manual API intervention.
- Transcript history persisted and was visible on return to the dashboard.
- No blocking UI defects were observed in the verified path.
