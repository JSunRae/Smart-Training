# System Architecture

## Components

- Frontend (`apps/web`): Next.js UI for login, scenario builder, session player.
- Backend (`apps/api`): API routes, auth, orchestration, and DB access.
- Core logic (`packages/core`): prompt orchestration, retrieval helpers.
- Prompt assets (`packages/prompts`): persona templates and flows.
- Data pipeline (`scripts`): ingestion and usage monitoring.

## Data Flow

1. User starts a roleplay session in web app.
2. Backend builds context (persona + scenario + retrieved knowledge chunks).
3. Model generates buyer response; optional coach intervention on pause.
4. Session messages and telemetry are persisted.
