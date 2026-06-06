# api

Next.js App Router API service for the Smart Training MVP.

## Runtime model

- Postgres persistence when `DATABASE_URL` is configured
- Encrypted file-backed fallback at `apps/api/data/<filename>` when `DATABASE_URL` is unset
- Cookie-based auth scoped per organization
- Shared Postgres-backed rate limiting when `DATABASE_URL` is configured
- Production-required session signing and data-at-rest encryption env vars
- Seeded scenario and document library for local evaluation
- Experimental OpenAI Realtime voice call setup at `POST /api/realtime/call`

## Scripts

- `pnpm --filter api dev`
- `pnpm --filter api build`
- `pnpm --filter api start`
- `pnpm --filter api db:bootstrap`
- `pnpm --filter api db:seed`

`pnpm --filter api db:migrate` remains available as a compatibility alias, but the current API service does not use Prisma migrations. Both commands run the same bootstrap script that creates missing tables and indexes directly in Postgres.
