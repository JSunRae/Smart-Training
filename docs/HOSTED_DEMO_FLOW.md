# Hosted Demo Flow

Last updated: 2026-05-29

Use this as the default hosted pilot demo when you need one flow that works for three jobs at once:

1. stakeholder showcase
2. launch rehearsal
3. sanity check before pilot access

This remains a readable operator script, not a replacement for full hosted acceptance QA.

## Audience

Best for:

1. VP of Sales
2. Sales Enablement
3. RevOps
4. CRO

## How this differs from other docs

Use this document when you want a hosted rehearsal that proves the live product can support the core text workflow in front of a stakeholder.

- Demo-only: pacing, talk track, and audience framing
- Launch-critical: hosted transcript persistence, visible seeded scenario availability, and a clean coach-assisted session path
- Still covered only by hosted QA: account creation, deletion, auth re-entry, and `/privacy` support-contact validation

If you only need the presentation script, use [SHOWCASE_RUNBOOK.md](SHOWCASE_RUNBOOK.md).
If you are deciding whether the hosted pilot is actually ready, also run [HOSTED_QA_CHECKLIST.md](HOSTED_QA_CHECKLIST.md).

## Hosted demo rehearsal sequence

1. Open the hosted dashboard and explain that the pilot is running the text-first workflow with transcript review.
2. Confirm `Frontline Coaching Consistency` is visible. If it is not visible, use another seeded scenario and record the fallback name in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).
3. State that `/voice-lab` is intentionally out of scope for the hosted pilot and is not part of the default workflow.
4. Open `Frontline Coaching Consistency`.
5. Read the buyer opener out loud.
6. Give a weak first seller answer on purpose:

`We help managers coach more often with AI roleplay and transcript review.`

7. Confirm the buyer responds in the live hosted session.
8. Trigger `Pause for coach`.
9. Use the coach correction to reframe the story:

`Most managers are coaching after calls go wrong. We give them a controlled place to correct objection handling before that risk shows up in pipeline.`

10. End the session and return to the dashboard.
11. Reopen the saved transcript and confirm the session persisted.
12. Open `Forecast Confidence Through Coaching` only if the audience needs the RevOps extension.
13. Explain how the same platform supports a RevOps conversation about upstream pipeline quality.

## What the hosted demo proves

### Launch-critical proof

1. The hosted environment exposes at least one seeded scenario that supports the default pilot story.
2. A full live text session can reach buyer response, coach intervention, session end, and transcript reopen without manual API intervention.
3. Transcript review persists the practice session for manager follow-up.
4. The operator can demonstrate the default pilot posture without relying on voice features.

### Demo-only proof

1. Smart Training is not a passive content library.
2. The product supports a repeatable before/after coaching moment.
3. The same platform can support VP Sales and RevOps buying narratives.

## Demo guardrails

1. Do not use `/voice-lab` in the hosted pilot demo.
2. Do not position the product as generic AI roleplay.
3. Always tie the pitch back to manager consistency, behavior variance, and risk entering live pipeline.
4. Do not treat this rehearsal as a substitute for the auth, deletion, or privacy checks in hosted QA.

## Record the rehearsal

Record the hosted demo in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md) when all of the following are true:

1. You ran the flow against the live hosted environment.
2. You named the scenario used, including any fallback scenario.
3. You confirmed transcript persistence by reopening the saved session from the dashboard.
4. You noted whether the RevOps extension was included or skipped.

## Related references

1. [SHOWCASE_RUNBOOK.md](SHOWCASE_RUNBOOK.md)
2. [CHALLENGER_MARKET_PACK.md](CHALLENGER_MARKET_PACK.md)
3. [VERTICAL_PACK_CYBER_INFRA.md](VERTICAL_PACK_CYBER_INFRA.md)
4. [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md)
