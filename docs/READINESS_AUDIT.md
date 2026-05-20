# Readiness Audit (2026-05-16)

## Verdict

The repository is **publish-ready for a Postgres-backed text-first MVP deployment**.

It is ready for:

- local and cloud-hosted deployments using either the encrypted file fallback or a managed Postgres database
- internal dogfooding and early external evaluation
- release gating through CI without manual exceptions
- experimental live voice evaluation through `/voice-lab` when `VOICE_LAB_ENABLED=true`

It is not yet optimized for:

- enterprise SSO or advanced admin workflows
- turning the voice lab into a fully supported, persisted training workflow
- strict compliance programs that require deeper policy and processor review

## Scorecard

| Pillar | Score | Evidence |
|---|---:|---|
| Product completeness | 4.5/5 | Auth, dashboard, scenario selection, session flow, coach intervention, transcript persistence, history review, and account deletion are implemented end to end. |
| Technical readiness | 5/5 | Shared contracts, seed data, Postgres support, shared rate limits, no-store responses, production-required secrets, at-rest encryption, fixed Node runtime, and green builds are in place. |
| Test readiness | 5/5 | Route-level integration tests, store hardening tests, browser E2E, and manual QA all passed. |
| Operational readiness | 4/5 | Deployment path, retention defaults, encryption requirements, and release gates are documented. Provisioning and productizing the voice lab still sit outside the repo itself. |

**Overall readiness estimate**: **ready to publish and deploy the MVP with Postgres, with voice remaining experimental**.

## Verified Gates

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm audit --prod`
- Manual browser verification on May 15, 2026

## What Is Shipping

- Web app with branded landing/auth flows, dashboard search, scenario selection, and transcript review
- API routes for register, login, logout, account deletion, dashboard, scenarios, full session lifecycle, and realtime voice call setup
- Postgres-backed persistence with encrypted file fallback, retention enforcement, seed data, and shared rate limits
- CI validation for static checks, tests, build, browser E2E, and dependency audit
- Render Blueprint infrastructure in `render.yaml` for the recommended hosted pilot path
- Optional OpenAI text enhancement path plus an experimental `/voice-lab` backed by the Realtime API

## Remaining External Launch Tasks

1. Sync the included Render Blueprint or translate it to your chosen provider.
2. Configure the public pilot support contact on `/privacy`.
3. Run `pnpm smoke:hosted` against the deployed API and hosted web origin before exposing the product externally.
4. Record operational ownership, deploy ids, and rollback targets in `docs/PILOT_LAUNCH_RECORD.md`.
5. Only if desired later, opt into `OPENAI_TEXT_ENABLED=true` or `VOICE_LAB_ENABLED=true` for specific environments.
