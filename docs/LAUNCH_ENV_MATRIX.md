# Launch Environment Matrix

Last updated: 2026-11-13

September 19 Netlify addendum: follow [DEPLOYMENT_NETLIFY.md](DEPLOYMENT_NETLIFY.md) for the selected frontend host. `SMART_TRAINING_SITE_MODE=marketing` needs no backend; later `pilot` requires **public HTTPS** `INTERNAL_API_ORIGIN` at build and runtime. Clear `INTERNAL_API_HOSTPORT` and `NEXT_PUBLIC_API_ORIGIN` on Netlify. Use Node 22.18.0/pnpm 9.12.0 and set function runtime `nodejs22.x` in the new site's environment. API secrets remain on Render. The private-host preference in the table below applies only to the all-Render alternative.

Use this as the single source of truth for hosted launch configuration. It matches the current code in [apps/api/src/lib/env.ts](../apps/api/src/lib/env.ts), [apps/api/src/lib/database-config.ts](../apps/api/src/lib/database-config.ts), [apps/api/src/lib/realtime.ts](../apps/api/src/lib/realtime.ts), [apps/web/src/lib/api-origin.ts](../apps/web/src/lib/api-origin.ts), and [apps/web/src/app/privacy/page.tsx](../apps/web/src/app/privacy/page.tsx).

## First hosted pilot: truly mandatory

- Web: one API routing variable and one public support contact.
- API: `DATABASE_URL`, `APP_SESSION_SECRET`, and `DATA_ENCRYPTION_KEY`. For approved pilot access, set `PILOT_ACCESS_MODE=invite` and issue scoped invitations. [Pilot access runbook](PILOT_ACCESS_RUNBOOK.md)
- Runtime posture: keep `OPENAI_TEXT_ENABLED=false` and `VOICE_LAB_ENABLED=false`.

## Matrix

| Variable | Service | Required for first hosted pilot | Example value shape | Runtime effect | Pilot default expectation |
| --- | --- | --- | --- | --- | --- |
| `NODE_ENV` | web | No if platform sets it | `production` | Enables production Next.js behavior. | Render Blueprint sets `production`; verify only. |
| `INTERNAL_API_HOSTPORT` | web | Yes on Render unless `INTERNAL_API_ORIGIN` is set instead | `smart-training-api:10000` | Used for private API routing after `INTERNAL_API_ORIGIN`; avoids a public hop from web to api. | Preferred on Render because the Blueprint injects it automatically. |
| `INTERNAL_API_ORIGIN` | web | Yes outside private-network hosting if `INTERNAL_API_HOSTPORT` is unavailable | `https://api.your-domain.example` | Highest-priority API origin for server-side requests from the web app. | Leave unset on Render Blueprint; set it on hosts without private service discovery. |
| `NEXT_PUBLIC_API_ORIGIN` | web | No | `https://api.your-domain.example` | Public fallback API origin if neither internal variable is set. | Leave unset for the first pilot unless the browser must call a public API origin directly. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | web | Yes unless `NEXT_PUBLIC_SUPPORT_URL` is set instead | `Jason_C_Rae@Outlook.com` | Shows operator contact on `/privacy` and satisfies the hosted smoke support-contact check. | The pilot candidate keeps the approved Outlook contact. The conditional marketing-site alias release follows the [website release record](WEBSITE_RELEASE_2026-09-19.md). |
| `NEXT_PUBLIC_SUPPORT_URL` | web | Yes only if you choose it instead of `NEXT_PUBLIC_SUPPORT_EMAIL` | `https://support.example.com/privacy` | Alternate public support contact shown on `/privacy`. | Usually leave unset for the first pilot and use support email instead. |
| `NEXT_PUBLIC_SUPPORT_NAME` | web | No | `Smart Training Pilot Support` | Label shown next to the support email on `/privacy`. | Optional; code falls back to `Smart Training Pilot Support`, and the Blueprint sets that same value. |
| `NODE_ENV` | api | No if platform sets it | `production` | Production mode makes `APP_SESSION_SECRET` and `DATA_ENCRYPTION_KEY` mandatory. | Render Blueprint sets `production`; verify only. |
| `PILOT_ACCESS_MODE` | api | Yes for controlled access | `invite` | Requires operator-issued invitations and limits authenticated use to approved accounts. | Production defaults to closed. Use invite mode for approved synthetic hosted acceptance and for the approved pilot. |
| `DATABASE_URL` | api | Yes | `postgres://user:pass@host:5432/dbname` | Switches storage and rate-limit state to shared Postgres instead of local file storage. | Required for the first hosted pilot. Render injects it from the managed Postgres instance. |
| `APP_SESSION_SECRET` | api | Yes | high-entropy random string | Signs auth and session data; missing in production causes startup failure. | Required. Render Blueprint generates it automatically. |
| `DATA_ENCRYPTION_KEY` | api | Yes | 64-char hex key or base64url value that decodes to 32 bytes | Encrypts stored transcript content; missing in production causes startup failure. | Required. Render Blueprint generates it automatically. |
| `SESSION_RETENTION_DAYS` | api | No | `30` | Controls transcript retention window. `<=0` disables retention cleanup. | Leave at `30` for the first pilot; code defaults to `30`, and the Blueprint sets it explicitly. |
| `OPENAI_TEXT_ENABLED` | api | No | `false` or `true` | Enables OpenAI-generated buyer and coach text only when paired with `OPENAI_API_KEY`. If the key is missing, text stays inactive even when the flag is `true`. | Keep `false` for the first pilot. The Blueprint sets it explicitly. |
| `VOICE_LAB_ENABLED` | api | No | `false` or `true` | Exposes the experimental voice lab only when paired with `OPENAI_API_KEY`. If the key is missing, voice stays inactive even when the flag is `true`. | Keep `false` for the first pilot. The Blueprint sets it explicitly. |
| `OPENAI_API_KEY` | api | No | `sk-...` | Supplies credentials for optional OpenAI text and realtime voice features. By itself it does not enable those features; it only makes `/api/health` report `openAiApiConfigured=true`. | Leave unset for the first pilot. Add it only when intentionally enabling AI features, or preprovision it without changing the disabled pilot posture. |
| `OPENAI_API_BASE_URL` | api | No | `https://api.openai.com/v1` | Overrides the OpenAI API base URL used by optional text generation. | Leave unset for the first pilot. |
| `OPENAI_MODEL` | api | No | `gpt-4.1-mini` | Overrides the text-generation model used when OpenAI text is enabled. | Leave unset for the first pilot; code defaults to `gpt-4.1-mini`. |
| `OPENAI_REALTIME_MODEL` | api | No | `gpt-realtime` | Overrides the realtime model used by the optional voice lab. | Leave unset for the first pilot; code defaults to `gpt-realtime`. |
| `OPENAI_REALTIME_VOICE` | api | No | `marin` | Overrides the synthesized voice used by the optional voice lab. | Leave unset for the first pilot; code defaults to `marin`. |

## Notes that matter during launch

- Web API origin precedence is fixed in code: `INTERNAL_API_ORIGIN`, then `INTERNAL_API_HOSTPORT`, then `NEXT_PUBLIC_API_ORIGIN`, then `http://localhost:3001`.
- The privacy page requires a public support contact, not a support name. `NEXT_PUBLIC_SUPPORT_NAME` is optional because the code already falls back to `Smart Training Pilot Support`.
- `DATABASE_URL` is not globally required for local development, but it is required for the first hosted pilot because the supported launch shape is Postgres-backed.
- `OPENAI_API_KEY` is optional until you intentionally enable either text generation or the voice lab.
- `/api/health` distinguishes key presence from activation: `openAiApiConfigured` shows whether `OPENAI_API_KEY` is present, while `openAiTextEnabled` and `voiceLabEnabled` show whether the separate opt-in flags are enabled.
- Active behavior is explicit opt-in only: text requires `OPENAI_API_KEY` plus `OPENAI_TEXT_ENABLED=true`, and voice requires `OPENAI_API_KEY` plus `VOICE_LAB_ENABLED=true`.
