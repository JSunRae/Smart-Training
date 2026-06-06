# Smart Training LinkedIn Source Pack

Last updated: 2026-05-21

Scope: repo-first source pack for a future LinkedIn launch sequence about Smart Training.

Method:

- `Verified` means directly supported by repo docs, code, or tests.
- `Inference` means likely implied by surrounding site copy, seeded scenarios, or architecture notes, but not yet a clean launch claim.
- `Gap` means the repo does not currently provide meaningful support for the theme.

Important note on market statistics:

- `docs/CHALLENGER_MARKET_PACK.md` includes third-party market citations from Salesforce, HubSpot, McKinsey, Gartner, and LinkedIn.
- Those external citations were not independently revalidated in this pass.
- Treat them as candidate launch sources that must be checked before public posting.

## Coverage Map

| Theme | Coverage | Best repo sources | Notes |
|---|---|---|---|
| AI training | Strong | `README.md`, `docs/PRODUCT_OVERVIEW.md`, `docs/READINESS_AUDIT.md`, `apps/web/src/components/home-shell.tsx`, `apps/web/src/app/privacy/page.tsx` | Strong product and launch-posture coverage. |
| Analyst enablement | Weak / adjacent | `apps/api/data/seed-data.json` | Only adjacent mentions such as security-tool analyst handoffs. No real analyst-enablement motion. |
| AI champions | Gap | none found | No explicit champion program, champion persona, or AI rollout champion language. |
| Workflow-specific prompt/tool design | Strong | `docs/PRODUCT_OVERVIEW.md`, `docs/SYSTEM_ARCHITECTURE.md`, `packages/prompts/*`, `packages/core/src/simulator.ts`, `apps/api/src/lib/roleplay.ts` | Prompt-driven personas and retrieved context are explicit. |
| Enterprise adoption | Strong | `docs/CHALLENGER_MARKET_PACK.md`, `docs/PILOT_LAUNCH_RUNBOOK.md`, `docs/SECURITY_PRIVACY.md`, `docs/DECISIONS_REQUIRED.md`, `docs/VERTICAL_PACK_CYBER_INFRA.md` | Manager adoption, narrow pilots, privacy posture, and rollout discipline recur throughout the repo. |
| Commercial-team training | Very strong | `apps/web/src/app/layout.tsx`, `docs/HOSTED_DEMO_FLOW.md`, `docs/SHOWCASE_RUNBOOK.md`, `docs/CHALLENGER_MARKET_PACK.md`, `apps/api/data/seed-data.json` | The clearest current launch motion is commercial-team practice and coaching. |

## Verified Claims

1. `Verified`: Smart Training already ships a text-first roleplay MVP with account creation, org-scoped dashboard access, seeded scenario library, buyer simulation, coach intervention, transcript persistence, and optional Postgres-backed deployment.
   Sources: `README.md`, `docs/READINESS_AUDIT.md`, `apps/web/src/components/home-shell.tsx`, `apps/api/src/app/api/dashboard/route.ts`

2. `Verified`: The product is positioned as commercial-team training, not a generic horizontal AI workspace.
   Sources: `apps/web/src/app/layout.tsx`, `docs/HOSTED_DEMO_FLOW.md`, `docs/SHOWCASE_RUNBOOK.md`, `docs/CHALLENGER_MARKET_PACK.md`

3. `Verified`: The main launch workflow is deterministic by default, with OpenAI text generation optional and voice isolated as an experiment.
   Sources: `README.md`, `docs/DECISIONS_REQUIRED.md`, `docs/OPENAI_REALTIME_VOICE.md`, `apps/web/src/components/voice-lab-shell.tsx`

4. `Verified`: The repo explicitly supports a visible pause-for-coach workflow that creates a before/after coaching moment inside a live practice session.
   Sources: `docs/HOSTED_DEMO_FLOW.md`, `docs/SHOWCASE_RUNBOOK.md`, `apps/web/src/components/session-shell.tsx`, `apps/api/src/lib/roleplay.ts`

5. `Verified`: Transcript review and session history are core to the current launch path.
   Sources: `README.md`, `docs/HOSTED_DEMO_FLOW.md`, `apps/web/src/components/home-shell.tsx`, `apps/web/src/components/session-shell.tsx`

6. `Verified`: Privacy posture is already part of the launch story: transcript consent, 30-day retention by default, account deletion, optional OpenAI processing only when enabled, and deployment-specific support contact.
   Sources: `docs/SECURITY_PRIVACY.md`, `docs/PILOT_LAUNCH_RUNBOOK.md`, `apps/web/src/app/privacy/page.tsx`, `apps/api/src/app/api/auth/login/route.ts`, `apps/api/src/app/api/auth/account/route.ts`, `apps/api/src/lib/store.test.ts`

7. `Verified`: The current product is suitable for MVP and pilot validation, but not yet positioned as enterprise-complete on SSO, admin tooling, or advanced analytics.
   Sources: `docs/READINESS_AUDIT.md`, `docs/DECISIONS_REQUIRED.md`

8. `Verified`: The repo already includes seeded buyer scenarios for VP Sales, CRO, RevOps, Sales Enablement, procurement, CISO, infrastructure, service operations, and plant operations conversations.
   Sources: `apps/api/data/seed-data.json`, `docs/CHALLENGER_MARKET_PACK.md`, `docs/VERTICAL_PACK_CYBER_INFRA.md`, `docs/VERTICAL_PACK_INDUSTRIAL_FIELD.md`

9. `Verified`: Org isolation and deletion behavior are not just copy claims; they are covered in route tests.
   Sources: `apps/api/src/app/api/roleplay-flow.test.ts`, `apps/api/src/app/api/roleplay-flow.postgres.test.ts`

10. `Verified`: Retrieved context snippets are surfaced in the UI and are part of the actual product behavior, even though the current implementation is lightweight and deterministic.
    Sources: `docs/PRODUCT_OVERVIEW.md`, `docs/SYSTEM_ARCHITECTURE.md`, `packages/core/src/simulator.ts`, `apps/api/src/lib/roleplay.ts`, `apps/web/src/components/session-shell.tsx`

## Reusable Proof Points

### Product-safe proof points

- "Smart Training gives teams a controlled place to practice hard buyer conversations before risk hits live pipeline."
- "Managers can pause the roleplay, inject coaching, and keep the conversation moving."
- "Practice sessions persist as transcripts for review, follow-up, and repeat runs."
- "The launch path is text-first, privacy-conscious, and deployable without turning on third-party model processing."
- "OpenAI-backed text and voice are optional layers, not prerequisites for the core MVP."

Supporting sources:

- `README.md`
- `docs/HOSTED_DEMO_FLOW.md`
- `docs/SHOWCASE_RUNBOOK.md`
- `apps/web/src/components/home-shell.tsx`
- `apps/web/src/app/privacy/page.tsx`

### Messaging hooks already embedded in repo collateral

- "Most teams are still letting reps rehearse on live opportunities."
- "Managers coach too late and too unevenly."
- "Inspection tells you where risk is. Practice tells you how to stop creating it."
- "The problem is not missing content. It is inconsistent behavior under pressure."
- "Do not sell AI roleplay in the abstract. Sell behavior correction before live customer risk."

Supporting sources:

- `docs/CHALLENGER_MARKET_PACK.md`
- `docs/HOSTED_DEMO_FLOW.md`
- `docs/SHOWCASE_RUNBOOK.md`
- `packages/prompts/example_dialogue.md`
- `apps/api/data/seed-data.json`

### Pilot-design proof points already repeated across the repo

- Narrow pilot structure: two teams, 30 days, one manager workflow, one or two core behaviors.
- Measurement language: practice completion, manager feedback turnaround, objection-handling quality, next-step quality, stage progression, late-stage slippage.
- Adoption language: manager scorecards, short feedback loops, and operating rhythm reinforcement.

Supporting sources:

- `docs/CHALLENGER_MARKET_PACK.md`
- `docs/VERTICAL_PACK_CYBER_INFRA.md`
- `docs/VERTICAL_PACK_INDUSTRIAL_FIELD.md`
- `apps/api/data/seed-data.json`

Important launch caution:

- The repo repeats pilot scorecard and measurement language in docs and scenario notes.
- The repo also says advanced analytics are deferred.
- Safe launch wording is "pilot measurement framework" or "manager scorecard approach," not "built-in analytics suite."

## Likely Product Components

### Evidence-backed components

1. Org-scoped account and workspace model
   Sources: `packages/core/src/contracts.ts`, `apps/api/src/app/api/dashboard/route.ts`, `apps/api/src/lib/repository.ts`

2. Scenario library with seeded buyer contexts
   Sources: `apps/api/data/seed-data.json`, `apps/web/src/components/home-shell.tsx`

3. Text roleplay session player
   Sources: `apps/web/src/components/session-shell.tsx`, `apps/api/src/lib/roleplay.ts`

4. Buyer simulator
   Sources: `packages/prompts/buyer_system.txt`, `packages/core/src/simulator.ts`, `apps/api/src/lib/roleplay.ts`

5. On-demand coach intervention
   Sources: `packages/prompts/coach_system.txt`, `apps/web/src/components/session-shell.tsx`, `apps/api/src/lib/roleplay.ts`

6. Retrieved context snippets for scenario-specific guidance
   Sources: `docs/PRODUCT_OVERVIEW.md`, `packages/core/src/simulator.ts`, `apps/api/src/lib/roleplay.ts`, `apps/web/src/components/session-shell.tsx`

7. Transcript history and replay/review workflow
   Sources: `README.md`, `apps/web/src/components/home-shell.tsx`, `apps/web/src/components/session-shell.tsx`

8. Privacy, deletion, and support-contact surface
   Sources: `apps/web/src/app/privacy/page.tsx`, `docs/SECURITY_PRIVACY.md`

9. Storage and deployment layer
   Sources: `README.md`, `docs/PILOT_LAUNCH_RUNBOOK.md`, `docs/READINESS_AUDIT.md`, `render.yaml`

10. Experimental realtime voice lab
    Sources: `docs/OPENAI_REALTIME_VOICE.md`, `apps/web/src/components/voice-lab-shell.tsx`, `apps/api/src/app/api/realtime/call/route.ts`

### Inferred or ambiguous components

1. `Inference`: Customer-facing custom scenario authoring
   Why: `docs/CHALLENGER_MARKET_PACK.md` references custom customer-specific roleplays, and `docs/SYSTEM_ARCHITECTURE.md` mentions a scenario builder.
   Constraint: the current MVP docs and visible UI emphasize scenario selection, not a surfaced scenario-builder workflow.

2. `Inference`: Built-in pilot scorecards or analytics
   Why: many docs use scorecard language.
   Constraint: `docs/DECISIONS_REQUIRED.md` explicitly says advanced analytics are deferred.

3. `Inference`: Broader AI team training outside sales/commercial motions
   Why: some vertical packs expand into field service and operations narratives.
   Constraint: the clearest site and metadata language still centers commercial teams and seller practice.

4. `Inference`: Admin workflow for enterprise rollout owners
   Why: the data model includes roles and the docs mention trainer/admin concepts.
   Constraint: the repo says advanced admin workflows are not yet part of the current launch-ready MVP.

## Candidate Buyer Personas

### Verified primary launch personas

- VP of Sales
- Chief Revenue Officer
- VP of Revenue Operations
- Director of Sales Enablement

Supporting sources:

- `docs/CHALLENGER_MARKET_PACK.md`
- `docs/HOSTED_DEMO_FLOW.md`
- `apps/api/data/seed-data.json`

### Verified expansion or adjacent buyer personas

- Head of Procurement
- Chief Information Security Officer
- VP of Infrastructure
- VP of Service Operations
- Plant Operations Director

Supporting sources:

- `apps/api/data/seed-data.json`
- `docs/VERTICAL_PACK_CYBER_INFRA.md`
- `docs/VERTICAL_PACK_INDUSTRIAL_FIELD.md`

### Inferred internal champions

- `Inference`: sales enablement leader as rollout owner
- `Inference`: frontline manager leader as workflow champion
- `Inference`: RevOps lead as pilot measurement co-owner
- `Inference`: VP Sales or CRO as economic buyer

Why these are inferred:

- The repo strongly supports these roles through scenarios and demo flows.
- It does not explicitly define a formal "AI champion" program or named internal champion motion.

## Open Questions Before Writing Launch Posts

1. Is the launch about a sales/commercial training product, or a broader AI-training platform?
   The repo strongly supports the first and only weakly hints at the second.

2. Does "analyst enablement" belong in the launch scope at all?
   Current evidence is limited to adjacent security-workflow language about analyst handoffs, not a real analyst-training motion.

3. Who is the named internal champion in the launch story?
   The repo has likely champions, but no explicit AI-champion narrative.

4. Should launch posts say "AI-assisted" or "text-first with optional AI"?
   Both are defensible from the repo, but they create different expectations.

5. Is voice part of launch messaging?
   Current repo posture says no. Voice is experimental, isolated, and disabled by default.

6. Are custom customer-specific roleplays already self-serve, or are they currently manual or seeded?
   The collateral implies custom roleplays, but the visible MVP flow centers seeded scenarios.

7. Are pilot scorecards operational services artifacts or actual product UI?
   The docs use scorecard language, but advanced analytics are explicitly deferred.

8. Is enterprise readiness a talking point or a limitation to manage around?
   The repo is clear that SSO and advanced admin workflows are not yet part of the launch-ready MVP.

9. What measurable customer outcomes can be quoted publicly?
   The repo contains pilot metrics and measurement ideas, but no customer results or outcome data.

10. Which external market citations will be revalidated for public use?
    `docs/CHALLENGER_MARKET_PACK.md` is useful, but the linked third-party sources should be checked before posting.

## Claims To Avoid Until Confirmed

- "Built-in analytics" or "manager scorecards in product"
- "Enterprise-ready SSO and admin controls"
- "Supported voice training workflow"
- "AI champion program"
- "Analyst enablement platform"
- Any quantified customer outcomes not backed by customer data

## Primary Source Inventory

### Strongest positioning and launch assets

- `docs/CHALLENGER_MARKET_PACK.md`
- `docs/HOSTED_DEMO_FLOW.md`
- `docs/SHOWCASE_RUNBOOK.md`
- `docs/VERTICAL_PACK_CYBER_INFRA.md`
- `docs/VERTICAL_PACK_INDUSTRIAL_FIELD.md`

### Strongest product-scope and readiness assets

- `README.md`
- `docs/READINESS_AUDIT.md`
- `docs/DECISIONS_REQUIRED.md`
- `docs/PILOT_LAUNCH_RUNBOOK.md`
- `docs/SECURITY_PRIVACY.md`

### Strongest implementation and workflow assets

- `apps/web/src/components/home-shell.tsx`
- `apps/web/src/components/session-shell.tsx`
- `apps/web/src/components/voice-lab-shell.tsx`
- `apps/api/src/lib/roleplay.ts`
- `packages/core/src/simulator.ts`
- `apps/api/data/seed-data.json`

### Strongest prompt and training-design assets

- `packages/prompts/buyer_system.txt`
- `packages/prompts/coach_system.txt`
- `packages/prompts/example_dialogue.md`
- `docs/PRODUCT_OVERVIEW.md`
- `docs/SYSTEM_ARCHITECTURE.md`
