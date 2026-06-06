# System Architecture

## Components

- Frontend (`apps/web`): Next.js UI for login, scenario builder, session player.
- Backend (`apps/api`): API routes, auth, orchestration, and DB access.
- Core logic (`packages/core`): prompt orchestration and simulation helpers.
- Prompt assets (`packages/prompts`): persona templates and flows.
- Deferred utilities (`scripts`): retrieval ingestion and usage-monitoring scaffolds that are not used by the current MVP launch path.

## Data Flow

1. User starts a roleplay session in web app.
2. Backend builds context from persona, scenario, and persisted session state.
3. Model generates buyer response; optional coach intervention on pause.
4. Session messages and telemetry are persisted.
