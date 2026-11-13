# Smart Training on Netlify

Updated 2026-11-13. Historical production facts below are anchored to the 26 September verification. **The conversion enquiry website is live at https://training.jasonrae.ai/** in the separate Netlify project `smart-training-992w` (project ID `ca2a4291-2b92-4cd1-82d0-06daa45563b2`), with https://smart-training-992w.netlify.app as its project address. The current production deploy was recorded as `6ab78c1684f6d6072a619a27`; canonical, form, pilot-brief, robots and sitemap checks passed. An authorized fictional non-PII enquiry was captured as normal submission `#5`; at the time, inbox notification/delivery had not been proven because the available Outlook integration could not search the connected personal mailbox.

**13 October delivery update:** A separate fictional marketing-form enquiry produced a Netlify notification that reached the intended Outlook inbox. See the [delivery verification](../../Website%20Coordination/docs/email-routing-2026-10-13/DELIVERY_VERIFICATION.md). This does not establish delivery for submission #5, outgoing alias sending, or hosted-application support and notification readiness. Do not repeat the verified marketing-form test.

No new domain registration, paid upgrade or API/database resource was created. This hosting direction supersedes the earlier Cloudflare Pages proposal; Render documents remain useful for API/database operations and the all-Render fallback.

## Recommendation and verified account facts

Use **training.jasonrae.ai** for enquiries. The first hosted pilot uses the same Next.js frontend in a dedicated Netlify project and the API and PostgreSQL on Render.

Netlify inspection confirmed the team `jasonrae.ai` / `jsunrae` (`69fc9d9eab868e9444e3cd8b`) is on **Free**, with **294.2 / 300 credits remaining before deployment** in the September 7–October 6 billing period. The existing `jasonrae-ai` site (`9532775a-a5d0-4404-9327-2e0d2d2f8290`) has primary URL `https://jasonrae.ai` and a ready deploy. Its build, environment, domain and files were not changed.

Cloudflare nameservers remain `cris.ns.cloudflare.com` and `anastasia.ns.cloudflare.com`. After the owner signed in, a DNS-only CNAME was added: `training` → `smart-training-992w.netlify.app`, Auto TTL. Public resolution and Netlify DNS verification passed. Existing apex, `www`, MX, SPF and DKIM records were preserved. Cloudflare remains the recorded registrar in the supplied handoff; registrar billing was not changed. The subdomain requires no separate registration fee.

The source handoff was read from `AI_Consulting/internal-docs/SMART_TRAINING_WEBSITE_HANDOFF.md`. Nothing from that private directory is included in the published output.

## What runs where

| Component | Prepared placement | Reason |
| --- | --- | --- |
| Branded website and privacy page | Netlify, `apps/web` | Next.js pages, CSS and self-hosted build fonts; no database needed for enquiries |
| Training frontend | Dedicated Netlify pilot project, `pilot` mode | Browser requests stay on same-origin `/api/...`; Next.js rewrites to the API |
| Auth, sessions, coaching and storage API | Render Node web service, `apps/api` | Preserves the tested long-running Node/`pg` implementation and operational scripts |
| PostgreSQL | Render managed PostgreSQL 16 beside the API | Accounts, transcripts and rate limits require durable shared storage |
| Local encrypted file store | Local demos only | Serverless local disk is not durable shared storage; production requires Postgres |
| Optional AI text / voice | Disabled | No model charges are required for the standard deterministic pilot |

Netlify supports Next.js through its automatically installed [OpenNext adapter](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), including server rendering and API routes. The API **could** run in Netlify Functions after adaptation; it is not inherently Render-only. Its Node crypto, password hashing, database connections, lazy schema initialisation and request durations must be checked under function concurrency and cold starts. The current module-global `pg` pool becomes one pool per function instance, so connection limits and pooling need a deliberate design.

Netlify now also offers [managed PostgreSQL](https://docs.netlify.com/build/data-and-storage/netlify-database/), with [compatible `pg` access](https://docs.netlify.com/build/data-and-storage/netlify-database/tooling/). An all-Netlify version is a legitimate later option, not implemented here. It requires database provisioning/migration, secret mapping, controlled bootstrap/seed, connection-budget tests, restore evidence and a measured credit estimate. Do not install its provisioning package merely to test the frontend; that would change the scope.

## Build configuration

The existing enquiry project uses the root [netlify.toml](../netlify.toml).

| Setting | Value |
| --- | --- |
| Repository | `JSunRae/Smart-Training` |
| Team | `jsunrae` |
| Project name / ID | `smart-training-992w` / `ca2a4291-2b92-4cd1-82d0-06daa45563b2` |
| Base directory | Repository root; leave UI field empty |
| Package directory | `apps/web` in the Netlify UI |
| Build command | `pnpm build:web` |
| Publish directory | `apps/web/.next`, relative to repository root |
| Build Node | `22.18.0`, matching `.node-version` and the supported Node 22 engine |
| pnpm | `9.12.0` |
| Next adapter | Automatic; launch used `@netlify/plugin-nextjs` 5.16.0 and `@netlify/build` 37.0.0 |
| Function runtime | `AWS_LAMBDA_JS_RUNTIME=nodejs22.x` set in the new project's environment and verified in generated functions |
| Initial site mode | `marketing` |

This is a Next.js build, not `site-dist`, a Python bundle, a plain `.next` drag-and-drop upload, or the Node 24 setup of JasonRAE.AI. Use the adapter's complete build/deploy pipeline. [Monorepo settings](https://docs.netlify.com/build/configure-builds/monorepos/) distinguish package directory from base directory. The root config is found by fallback from the package directory. [Function runtime overrides](https://docs.netlify.com/build/functions/configuration/) must be set through the UI/CLI/API, **not** `netlify.toml`.

Do not link this repo to the existing JasonRAE.AI site ID. The new site's local link is `apps/web/.netlify/state.json` and is ignored. Keep database URLs, encryption keys and session secrets on the API service; none belong in public frontend variables or the TOML.

For manual releases, use a Linux environment and the integrated adapter/deploy pipeline below. Native Windows packaging with the launch adapter generated invalid function paths; a separate `build` then `deploy --no-build` also selected raw `.next` instead of transformed assets. Both problems were caught on drafts. See the release record for the isolated WSL snapshot and source hashes.

```bash
netlify deploy --context deploy-preview --filter web --site ca2a4291-2b92-4cd1-82d0-06daa45563b2
# After the draft checks pass:
netlify deploy --prod --context production --filter web --site ca2a4291-2b92-4cd1-82d0-06daa45563b2
```

These are retained as historical how-to commands for the existing project, not commands to execute for the pilot. They do not authorize switching `training.jasonrae.ai` from the enquiry site to pilot mode. Deploy only to a separately approved pilot target/context unless that production-site change is explicitly authorized.

Git-based continuous deployment is not connected; a local source edit does not automatically update the public site.

### Netlify Forms contract

The marketing enquiry form is a Netlify Form named `smart-training-enquiry`. Form detection is enabled in the owning Netlify project. Keep `apps/web/public/__forms.html` as the static detection skeleton and keep its field names aligned with `apps/web/src/components/enquiry-form.tsx`; the Next.js runtime posts URL-encoded data to `/__forms.html` for the default hosted path. Do not route enquiry contents through the website analytics endpoint. The preview thank-you response is not delivery evidence: after an authorized production promotion, submit one fictional QA enquiry, verify the form record and notification path in Netlify, and record the result without retaining real personal data in test artifacts.

## Launch modes and backend connection

- `workspace`: existing local/Render behaviour, with registration at `/`. Default outside Netlify. Netlify builds reject this mode to catch accidental reuse of the old configuration.
- `marketing`: branded homepage and privacy; `/start`, `/dashboard`, session pages and voice lab return visitors home. `/api/*` has no proxy. No paid API or database is required. Ordinary deploy previews and branch deploys use this mode and prevent indexing. The Next.js configuration sets `noindex, nofollow`; Netlify's draft host can supply its own `X-Robots-Tag: noindex`.
- `pilot`: branded homepage plus sign-in and `/start`, with the training workspace enabled. This mode requires an explicit public HTTPS API origin on Netlify. It controls the frontend only. The API independently defaults to `PILOT_ACCESS_MODE=closed` in production and must be explicitly set to `invite` for an authorized synthetic hosted check or approved pilot. Invite mode accepts only a valid one-use operator invitation bound to its email and organisation; do not create customer invitations before the release gates and owner approval are complete.

The mode is fixed at build time. Change it and rebuild; a runtime toggle does not turn an already built marketing deployment into a pilot.

After backend provisioning and verification, set the approved pilot target's environment `INTERNAL_API_ORIGIN` to the actual public HTTPS Render API origin (build and function runtime scopes where selectable). Copy the actual service URL; do not use the placeholder or Render private hostname. Clear `INTERNAL_API_HOSTPORT` and `NEXT_PUBLIC_API_ORIGIN`. The build rejects missing, local, HTTP, credential-bearing and path-bearing origins. Do not put the Render private hostport or API/database secrets in Netlify.

### Select the dedicated pilot configuration

Once the target and synthetic test window are authorized, use a dedicated Netlify project on its own Netlify hostname. Keep `smart-training-992w` on the root enquiry configuration.

| Dedicated pilot project setting | Value |
| --- | --- |
| Repository and production branch | `JSunRae/Smart-Training` and the approved release branch at the recorded commit |
| Base directory | Repository root. Leave the field empty. |
| Package directory | `deploy/netlify-pilot` |
| Configuration file | [deploy/netlify-pilot/netlify.toml](../deploy/netlify-pilot/netlify.toml) |
| Build command and publish directory | `pnpm build:web` and `apps/web/.next` |
| Effective mode | `pilot` in the dedicated project's production context. Previews and other branches build in `marketing` mode. |
| Production environment | `INTERNAL_API_ORIGIN` set to the approved public HTTPS Render API origin. Leave the Render hostport and public fallback unset. |

Netlify looks in the package directory first and uses the repo root for the workspace build. The pilot file explicitly selects the OpenNext adapter because its package directory holds the config while `apps/web` holds the application. Verify the build log shows the nested config, the adapter, the intended commit, and the resolved publish directory. Run the hosted proxy and cookie checks against that deploy. The pilot build sends `X-Robots-Tag: noindex, nofollow`; verify it on the hosted pilot response. [Netlify monorepo configuration](https://docs.netlify.com/build/configure-builds/monorepos/)

Use `Jason_C_Rae@Outlook.com` for pilot support. The website contact alias follows the [website recovery and forwarding checks](WEBSITE_RELEASE_2026-09-19.md#recovery-follow-up).

For the approved pilot target, requests follow `browser → approved pilot web origin/api/... → public HTTPS Render API → private Render Postgres`. The existing enquiry origin `training.jasonrae.ai` remains in marketing mode unless a separate public release is approved. Cookies are HttpOnly, host-only, SameSite=Lax and Secure in production. The first authorized pilot deployment must prove `Set-Cookie` forwarding, login persistence, logout and deletion. CORS is not needed for this browser path. Do not add wildcard CORS or weaken cookies to make a failed test pass.

Use [deploy/render-backend.yaml](../deploy/render-backend.yaml) for the hybrid backend. It selects PostgreSQL 16 and manual API deploys. Select the exact approved revision and record the database major version and the API deploy ID. The root `render.yaml` defines the all-Render alternative. The prepared region is Virginia. [Render Blueprint reference](https://render.com/docs/blueprint-spec)

## Cost before provisioning

USD estimates checked September 19; excludes tax, labour, paid email, extra traffic/builds, backup exports and optional AI usage. The existing parent-domain renewal remains an existing cost, not a new Smart Training charge.

| Stage | Incremental recurring estimate | Conditions |
| --- | --- | --- |
| Enquiry website + local demos | **$0/month** | Existing subdomain and remaining shared Netlify Free allowance |
| Enquiry website with Netlify Personal | **$9/month** team subscription | Optional upgrade; not selected or purchased |
| Netlify frontend + paid Render API/Postgres | **about $17.50/month** | $7 API + $6 Postgres + conservative $4.50 for 15 GB storage; Netlify within Free allowance |
| Same hybrid plus Netlify Personal | **about $26.50/month** | $17.50 backend + $9 team subscription |

[Render pricing](https://render.com/pricing) was inspected in its live pricing interface: entry API compute $7/month, database compute $6/month and storage $0.30/GB/month. The page also advertises 1 GB included; charging all 15 GB above is conservative. Confirm the checkout estimate before provisioning. Storage autoscaling is enabled in the prepared Blueprint, so these figures are not a spending cap. The hybrid saves the separate $7/month Render frontend from the prior three-resource plan.

[Netlify pricing](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) currently gives Free 300 credits/month and Personal 1,000. Production deploys cost 15 credits, bandwidth 20 credits/GB, requests 2 credits/10,000 and function compute 10 credits/GB-hour. For example, four production deploys + 1 GB traffic + 10,000 requests consume 82 credits before function usage and the existing website's activity. Preview deploy events are unmetered, but serving previews can still consume resources.

**The allowance is shared across the team. All projects can pause if it is exhausted**, including JasonRAE.AI; see the [billing FAQ](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/). Account usage was checked before publication (294.2 credits remaining); this is a historical balance, not a current capacity claim. Review usage before further releases and leave room for both sites. Consider Personal for a customer pilot; it is not an unlimited-usage guarantee. No plan upgrade or notification preference was changed.

## DNS and release sequence

1. **Complete:** owner approved the enquiry website deployment; separate project `smart-training-992w` was created under `jsunrae`. Its ID differs from JasonRAE.AI.
2. **Complete:** Linux adapter draft passed route, font/style/script, contact, example/FAQ, desktop/mobile-width and preview-noindex checks. Build Node 22.18.0 and function runtime `nodejs22.x` were verified. Physical iPhone Safari remains untested.
3. **DNS, custom certificate and conversion promotion complete:** `training.jasonrae.ai` is assigned to the new project, with DNS-only CNAME to `smart-training-992w.netlify.app`. A browser recheck on 2026-09-26 loaded the host over valid HTTPS. Existing apex, `www`, MX/TXT and nameservers were preserved. Production deploy `6ab78c1684f6d6072a619a27` serves the conversion website.
4. **Production handoff partially complete:** the approved enquiry website, canonical/social metadata, required acknowledgement, downloadable brief and indexing routes are published and checked. A verified safe non-PII record is captured in Netlify's normal submissions collection; notification/delivery still requires confirmation in the configured Netlify destination or a supported mailbox integration. No real contact data or outreach was used.
5. When a hands-on trial is needed and the owner has approved spend and scope, follow the [hosted launch worksheet](HOSTED_LAUNCH_WORKSHEET.md) for the dedicated pilot project and Render backend. Record the deploys, database bootstrap and seed, health, smoke, QA, recovery and support results in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md).

For authorized hosted synthetic acceptance, set `SMART_TRAINING_SMOKE_EMAIL` and `SMART_TRAINING_SMOKE_INVITATION_TOKEN` in the smoke process environment. Never put the token in a command line, committed file, or retained log. Each invitation is one-use and the smoke deletes its account, so issue a fresh synthetic invitation for each run. Use the exact approved support email (currently `Jason_C_Rae@Outlook.com` for the pilot; the website `training@` alias has a separate conditional release gate). Follow the secure token-entry example in [PILOT_LAUNCH_RUNBOOK.md](PILOT_LAUNCH_RUNBOOK.md).

Run once against the API directly, then issue a separate fresh synthetic grant and run through the Netlify same-origin proxy:

```powershell
$apiUrl = Read-Host 'Enter the approved Render API origin'
$webUrl = Read-Host 'Enter the approved Netlify pilot web origin'
pnpm smoke:hosted -- --api $apiUrl --web $webUrl --support-email Jason_C_Rae@Outlook.com
pnpm smoke:hosted -- --api $webUrl --web $webUrl --support-email Jason_C_Rae@Outlook.com
```

`--api` selects the origin for all health, registration, session and deletion requests. `--web` only adds the `/privacy` check; a direct API smoke with `--web` does not exercise the proxy. In the second command set `--api` to the web origin to exercise Netlify's `/api/*` rewrite. Do not use the existing marketing site as `APPROVED-PILOT-WEB-ORIGIN` unless that production change was separately approved.

Follow both smoke runs with browser acceptance for cookie forwarding/login persistence, transcript reopen, tenant isolation, reset, all-device sign-out, deletion, and restart persistence; then run physical iPhone Safari checks and the backup-restore rehearsal. Record device model and iOS version and the outcomes. A desktop-width emulation is not an iPhone result. Record every result in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). A direct API smoke pass alone does not validate the frontend proxy or browser cookie handling. Use [the testing guide](TESTING_AND_IPHONE_GUIDE_2026-09-19.md) for the physical-device checklist.

## Local review and validation

Preview the website without a backend in a fresh PowerShell terminal:

```powershell
$env:SMART_TRAINING_SITE_MODE = 'marketing'
$env:NEXT_PUBLIC_SUPPORT_EMAIL = 'Jason_C_Rae@Outlook.com'
pnpm dev:web
```

Open the printed localhost address. Close that terminal when finished so the temporary environment does not affect local training demos. The isolated `pnpm demo:local` launcher continues to default to the workspace.

Historical validation on September 19 recorded a local release gate pass, one browser E2E and a production dependency audit. The current audit on September 26 independently passed root/web TypeScript, ESLint, 56 Vitest tests, both direct Next production builds, and live canonical route/browser checks. The configured Playwright gate remains blocked in this Windows environment by its pnpm web-server launcher and Chromium `spawn EPERM`; do not represent that as a fresh browser E2E pass. Desktop and 390 px browser layout and the expandable example were inspected earlier. The final icon is served and referenced; TOML parsing passes. The isolated demo passed again at 12:18:11 UTC, including transcript reopen, deletion and cleanup.

Evidence remains under ignored `test-results/`, including the older HTTP receipts and the current Playwright failure trace. The actual Linux Netlify adapter draft and production release passed public HTTP/asset checks; see [the release record](WEBSITE_RELEASE_2026-09-19.md). This is an uncommitted working-tree release of the enquiry website, not a tagged release or a hosted Postgres/training-platform/physical-iPhone pass.
