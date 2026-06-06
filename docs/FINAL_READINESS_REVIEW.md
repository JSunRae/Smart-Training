# Final Readiness Review

Last updated: 2026-05-29

Use this in the final pilot go or no-go meeting. This is a thin review prompt that coordinates the source-of-truth documents listed below; it does not replace them.

Primary source documents:

- [READINESS_AUDIT.md](./READINESS_AUDIT.md) for current P0, P1, and P2 blocker status.
- [PILOT_LAUNCH_RUNBOOK.md](./PILOT_LAUNCH_RUNBOOK.md) for the operational launch contract.
- [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md) for deployment facts, evidence rows, and rollback anchors.
- [DECISIONS_REQUIRED.md](./DECISIONS_REQUIRED.md) for owner approvals and approved deferrals.
- [AGENT_TASK_BOARD.md](./AGENT_TASK_BOARD.md) for what stays out of the pre-pilot lane unless evidence changes.

## Final review prompt

Answer each item in order. If any required answer is `No`, the outcome is `No-go` until the linked source document is updated.

### 1. What must be true right now?

- Are all P0 blockers closed in [READINESS_AUDIT.md](./READINESS_AUDIT.md)?
- Are all P1 items closed before opening external pilot access, as required by [READINESS_AUDIT.md](./READINESS_AUDIT.md)?
- Does the launch still match the approved pilot scope: text-first, Postgres-backed, `OPENAI_TEXT_ENABLED=false`, and `VOICE_LAB_ENABLED=false`, as required by [PILOT_LAUNCH_RUNBOOK.md](./PILOT_LAUNCH_RUNBOOK.md)?
- Are the live deployment facts complete in Section 3 and the rollback owners and targets complete in Section 5 of [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md)?

### 2. What evidence must exist before go?

- Does every required row in Section 4 of [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md) include `Result`, `Operator`, `Timestamp`, `Artifact / note location`, and `Failure follow-up` when applicable?
- Is Section 4 of [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md) complete with `PASS` evidence for `pnpm release:check`, live `/api/health`, `pnpm smoke:hosted`, the pre-pilot logical export, hosted QA, hosted demo rehearsal, and `/privacy` support-contact visibility?
- Is Section 4A of [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md) complete with `PASS` evidence for `Health probe`, `Restart / crash visibility`, `Service logs`, `Database visibility`, `Backup confirmation`, and `Manual logical export`, with the same evidence fields filled for each row?
- Does the hosted health evidence show exactly `status=ok`, `storageBackend=postgres`, `openAiTextEnabled=false`, and `voiceLabEnabled=false`, per [PILOT_LAUNCH_RUNBOOK.md](./PILOT_LAUNCH_RUNBOOK.md)?
- Does the hosted evidence prove the operator-facing support contact is visible on `/privacy` and matches the configured launch contact?
- Does the hosted evidence prove account deletion removes the signed-in account immediately and that retention only governs completed or abandoned transcript history that was not explicitly deleted?

### 3. What decisions must be explicitly signed off?

- D-001: Approve the current text-first MVP boundary in [DECISIONS_REQUIRED.md](./DECISIONS_REQUIRED.md).
- D-002: Approve the current first-party auth and org-scoped tenant posture in [DECISIONS_REQUIRED.md](./DECISIONS_REQUIRED.md).
- D-005: Approve the pilot go or no-go pass set defined by [READINESS_AUDIT.md](./READINESS_AUDIT.md), [PILOT_LAUNCH_RUNBOOK.md](./PILOT_LAUNCH_RUNBOOK.md), and [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md).
- D-006: Approve the privacy posture and confirm hosted evidence capture is complete in [DECISIONS_REQUIRED.md](./DECISIONS_REQUIRED.md).

### 4. What unresolved items are acceptable at go-live?

- P2 items in [READINESS_AUDIT.md](./READINESS_AUDIT.md) are acceptable only if pilot scope has not changed.
- D-003 retrieval backend selection may remain deferred if the current pilot path works without it, as recorded in [DECISIONS_REQUIRED.md](./DECISIONS_REQUIRED.md).
- D-004 realtime audio may remain deferred if voice stays out of pilot scope and disabled in the live environment, as recorded in [DECISIONS_REQUIRED.md](./DECISIONS_REQUIRED.md).
- Items listed under `Pilot hardening` or `Post-launch improvement` in [AGENT_TASK_BOARD.md](./AGENT_TASK_BOARD.md) are not reasons to delay launch unless current hosted evidence shows they are blocking the text-first pilot.

## Decision rule

- `Go`: every required answer above is `Yes`, every P0 and P1 item is closed, and the launch record contains the full evidence package.
- `No-go`: any P0 is open, any required launch evidence is missing, any required sign-off is still pending, or the live posture differs from the approved pilot scope.

## Meeting close-out

Record the outcome in [PILOT_LAUNCH_RECORD.md](./PILOT_LAUNCH_RECORD.md) by confirming the final evidence rows, evidence fields, and deployment facts are current. If the outcome is `No-go`, move the remaining item into the appropriate lane in [AGENT_TASK_BOARD.md](./AGENT_TASK_BOARD.md) and update [READINESS_AUDIT.md](./READINESS_AUDIT.md) if blocker severity changed.
