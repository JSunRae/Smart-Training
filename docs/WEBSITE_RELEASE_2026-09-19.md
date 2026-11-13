# Smart Training website release — 19 September 2026

Status: **production conversion enquiry website published**, with passing HTTPS checks at https://training.jasonrae.ai/ and the separate Netlify project https://smart-training-992w.netlify.app. The current production deploy is `6ab78c1684f6d6072a619a27`; one authorized fictional non-PII test is captured as a normal `smart-training-enquiry` submission. A separate 13 October fictional enquiry produced the exact Netlify notification and forwarded Outlook receipt, verified in [Website Coordination's delivery record](../../Website%20Coordination/docs/email-routing-2026-10-13/DELIVERY_VERIFICATION.md). This proves incoming notification delivery for that test only; it does not establish hosted application support or pilot readiness. The earlier email-only and preview-only statements below are historical entries from before the 26 September promotion. Paid API/database provisioning remains deferred.

This audit also corrected the working tree's homepage `use_case_view` instrumentation, form retry email link, environment guidance and operator handoff wording. Those post-promotion edits are not in production revision `6ab78c1684f6d6072a619a27`; no follow-up deployment was performed because the available Windows Netlify adapter path could not produce a safe Linux-compatible function bundle.

## Project and domain

- Netlify team: `jsunrae`, account `69fc9d9eab868e9444e3cd8b`.
- New project: `smart-training-992w`, ID `ca2a4291-2b92-4cd1-82d0-06daa45563b2`. The requested `smart-training` name was already taken; Netlify supplied this available name.
- Dashboard: https://app.netlify.com/projects/smart-training-992w
- Primary domain assigned in Netlify: `training.jasonrae.ai`.
- Cloudflare DNS: new `training` CNAME → `smart-training-992w.netlify.app`, DNS-only, Auto TTL. Saved and independently resolved through 1.1.1.1.
- Existing apex A `75.2.60.5`, `www` CNAME `jasonrae-ai.netlify.app`, three mail-routing MX records, SPF and DKIM preserved. The zone increased from seven to eight records.
- Existing JasonRAE.AI Netlify site: `9532775a-a5d0-4404-9327-2e0d2d2f8290`; no configuration or deployment changes made to it.
- Netlify Free balance before deployment: **294.2 / 300 credits**, billing period September 7–October 6. No payment card, plan upgrade, new registration or Render resources added.
- After publication, billing shows **279.1 / 300 credits remaining**, one production deployment costing 15 credits, and the plan still **$0.00 Free** with no payment card. Usage reporting can lag; this balance is a point-in-time observation.

## Build provenance and Windows limitation

The repository is still an uncommitted working tree based on `ddc337f0e5bba9bff2481c42fd124d6d415764d7`. The prior local release gate and demonstration evidence remain in the testing guide. There was no Git push or automatic Git deployment.

The official Netlify CLI detected `apps/web`, root `netlify.toml`, `pnpm build:web`, Next.js adapter `@netlify/plugin-nextjs` 5.16.0 and `@netlify/build` 37.0.0. Function runtime is pinned to `nodejs22.x` through the new project's environment settings.

The first Windows build completed, but draft `6aae88e41e08e1f15d9753cc` returned HTTP 502. The generated server handler embedded Windows backslashes in `/var/task/apps/web` imports and `process.chdir`, which cannot work on the Linux function runtime. This failed draft was not promoted. Do not repeat native Windows packaging with this adapter/version combination.

The replacement build uses the installed Ubuntu 24.04 WSL environment, official Node 22.18.0 Linux binaries verified against the published SHA-256 checksum, pnpm 9.12.0 and the frozen repository lockfile. Only 55 public application/config files were copied into an isolated build directory. No API data, `.env`, private documents or credential files were copied. The existing Netlify token is supplied to the Linux child process in memory, never printed or stored in the source snapshot.

The first Linux draft (`6aae8d73367fc00aa49b4f49`) fixed the server runtime but failed the static-asset checks. Running `netlify build` and then a separate `deploy --no-build` uploaded raw `.next` files instead of the adapter's transformed static output. This draft was not promoted either. Release commands must use the integrated `netlify deploy --context deploy-preview --filter web` and `netlify deploy --prod --context production --filter web` pipeline so the adapter's effective publish directory, headers and redirects reach the upload step.

Ignored local evidence and helpers:

- `test-results/netlify-linux-20260919/source-manifest.json`: SHA-256 per deployed source/config file.
- `test-results/netlify-linux-build.log`: Linux adapter build evidence.
- `test-results/netlify-draft-build.log` and `netlify-draft-deploy.json`: first Windows build/failure provenance.
- `test-results/check-marketing-live.mjs`: HTTP route/asset/contact/indexing checks.
- `test-results/netlify-linux-adapter-draft.log`: successful integrated draft deployment receipt.
- `test-results/netlify-preview-http.json`: passing live draft HTTP checks at 13:35:09 UTC.
- `test-results/prepare-netlify-linux.mjs`, `build-netlify-linux.sh`, `deploy-netlify-linux.sh`, `publish-netlify-linux.sh`, `run-netlify-linux.mjs`: this machine's isolated build/deploy helpers; contain no secret values.

For future repeatable releases, prefer a Linux build runner or Netlify's Git-based Linux build. Keep the checked working-tree snapshot and pinned source revision consistent; do not copy existing Windows `node_modules` or generated `.netlify` handlers to Linux. The website uses canonical and social metadata for the confirmed custom host. Marketing mode keeps the API proxy and training access disabled.

## Release evidence

- Passing Linux draft: `6aae8eed98b6c0f1e848d4fe`, https://6aae8eed98b6c0f1e848d4fe--smart-training-992w.netlify.app.
- Draft HTTP checks: homepage/privacy/icon 200; application routes redirect home; API health and registration 404; all referenced JS/CSS/font assets 200; expected business email and canonical metadata present; draft indexing disabled by Netlify.
- Hosted browser review: desktop and 390 px viewport (375 px content width, no horizontal overflow); expanded example and iPhone FAQ work; privacy navigation and contact destination verified. No email was sent.
- JasonRAE.AI project recheck: current deploy remains `6a12ecde87721600084f3a12`.

- Production deploy: `6aae9000367fc01b709b4f6f`, published at **13:39:04 UTC**, context `production`, state `ready`. Netlify confirms `nodejs22.x`, Next adapter 5.16.0, three redirect rules, one static header rule and one function.
- Production dashboard: https://app.netlify.com/projects/smart-training-992w/deploys/6aae9000367fc01b709b4f6f.
- Working production HTTPS address: https://smart-training-992w.netlify.app.
- Immutable production version: https://6aae9000367fc01b709b4f6f--smart-training-992w.netlify.app (Netlify applies noindex to this immutable hostname).
- `test-results/netlify-production-deploy.json`: production receipt; `test-results/netlify-production-http.json`: passing production routes, assets, canonical, support link and indexing checks at **13:40:19 UTC** on the default production hostname. The published homepage was also inspected in the browser; Netlify adds its provider badge.
- All 55 public source/config hashes still match the current application working tree. Documentation is outside that public snapshot. No Git commit or push was made.
- Existing https://jasonrae.ai still returns HTTP 200.

## Custom-domain completion

The DNS-only CNAME resolves through both 1.1.1.1 and 8.8.8.8; Netlify displays successful DNS verification. The free Let's Encrypt certificate was requested in the dashboard and through the supported Netlify certificate API after production publication. The API currently returns no issued certificate, and Netlify reports waiting for propagation. A normal TLS check still receives the default `*.netlify.app` certificate, which does not cover `training.jasonrae.ai`. Certificate verification was not bypassed.

Use the working Netlify HTTPS address until issuance completes. Recheck the custom hostname with the following command; it validates TLS normally and checks the entire public website:

```powershell
node test-results/check-marketing-live.mjs https://training.jasonrae.ai production
```

After it passes, verify HTTP redirects to HTTPS and open the custom address in the browser. Update this record and the linked guides with the result. Netlify's UI directs operators to its SSL troubleshooting guide if issuance takes longer than 24 hours. Do not change apex/mail DNS or turn off certificate validation to work around propagation.

Native iPhone, an actual sent enquiry/receipt, and hosted training-platform validation remain separate from this marketing launch. No email was sent; paid API/database resources, customer sign-in and generated AI/voice were not enabled.

## Follow-up recheck — 26 September 2026

- Browser navigation to `https://training.jasonrae.ai/` completed over valid HTTPS with the expected Smart Training title. The custom-domain certificate is therefore no longer the current URL blocker.
- The deployed page is still the September 19 email-only enquiry revision: it exposes the mailto CTA and does not expose the local conversion form, pilot brief download, sitemap or robots routes.
- `https://training.jasonrae.ai/robots.txt` returned the Next.js 404 page. The local source routes are present at `apps/web/src/app/sitemap.ts` and `apps/web/src/app/robots.ts` but have not been promoted.
- No enquiry was submitted. The current working tree now contains the acknowledgement and downloadable-brief source changes; release-gate, hosted handoff and delivery evidence remain open.

## Follow-up preview attempts — 26 September 2026

- The authorized local preview verification attempted four draft deployments: `6ab71a8010b8d68dbdd93d30`, `6ab71b83d74a19a28f6f9d9a`, `6ab71e47d00735caeec5c454` and `6ab72134c7e6dc9f53e6a2e6`.
- Each build completed, but the public draft runtime failed before rendering the homepage with `Cannot find package '\\var\\task\\apps\\web' imported from /var/task/___netlify-server-handler.mjs`. This is the same Windows local Netlify adapter path defect described above; none of these drafts was promoted.
- A generated-artifact normalization experiment was tested and removed after Netlify continued to rewrite the uploaded runtime path. The tracked deployment configuration remains the documented Linux/CI path, and no application route, claim or production environment was changed for this experiment.
- Production remains on the earlier email-only revision. The conversion preview, real enquiry delivery and complete public handoff remain open until a Linux or Netlify Git build can be verified end to end.

## Linux release candidate and form verification — 26 September 2026

- A clean isolated Linux build used Node 22.18.0, pnpm 9.12.0 and the frozen lockfile. No API workspace, environment file, private document or credential file was copied into the build directory.
- Integrated Netlify draft `6ab72ce16eda2811d92f5b18` is available at https://6ab72ce16eda2811d92f5b18--smart-training-992w.netlify.app. The build completed without the Windows path defect and the preview returned 200 for the homepage, privacy page, pilot brief, all three use-case routes, `/robots.txt` and `/sitemap.xml`; the sitemap contained six canonical locations.
- Netlify form detection was enabled for the `smart-training-992w` site. The registered `smart-training-enquiry` form contains the qualification fields, non-PII attribution fields, versioned acknowledgement and honeypot defined by the source contract.
- A browser submission using fictional QA data reached the in-page success state, and an encoded POST to the preview returned Netlify's thank-you response. The Forms API still reports zero persisted preview submissions, so this does not prove delivery or notification. Run the delivery check after authorized production promotion.
- Production remains on the earlier email-only revision. No production promotion, DNS change, outreach or real enquiry was performed. The Linux draft is a release candidate for owner review; the release handoff remains open until production delivery and accessibility evidence are recorded.

## Authorized production promotion and follow-up — 26 September 2026

- Integrated Linux production deployment `6ab78c1684f6d6072a619a27` is live at `https://training.jasonrae.ai/`; immutable URL: `https://6ab78c1684f6d6072a619a27--smart-training-992w.netlify.app`.
- The live homepage, canonical metadata, required enquiry acknowledgement, email fallback, pilot brief, `/robots.txt`, and six-entry `/sitemap.xml` passed read-only HTTP and browser checks. `/pilot-brief.txt` returned 200.
- The earlier approved `.invalid` production enquiry reached the success state and appeared in Netlify spam. A second authorized fictional non-PII test using `release-verification@example.com` reached HTTP 200 and was captured as normal submission `#5` with the expected qualification, attribution, acknowledgement and honeypot fields. No real contact data was used.
- The normal capture path and one incoming notification delivery are verified. The notification result is limited to the fictional test in the [13 October delivery receipt](../../Website%20Coordination/docs/email-routing-2026-10-13/DELIVERY_VERIFICATION.md); it does not prove hosted application monitoring, support operations, or pilot readiness. Do not repeat the submission solely to duplicate this evidence.
- Historical 26 September interpretation: Netlify's Forms behavior was consistent with the differing normal/spam capture outcomes, but inbox notification had not yet been verified at that time. The separate 13 October receipt now verifies one fictional test's notification delivery; see the release status and receipt above.
- The custom host remains the canonical marketing site. Product application access, API/database provisioning, authentication, transcripts, support operations and pilot launch gates remain separate and unchanged.
- Remaining owner action: keep hosted application notification/support operations separate and unverified until that application is deployed and tested. Keep analytics free of enquiry contents and personal data.

## Authorized deployment audit — 26 September 2026

- An MCP upload attempt created `6ab7a3c3adf258d6a6c2219e`, but it was a static Vite-style upload with no Next redirects/functions and served a Netlify 404. It was rolled back immediately through the owning site's rollback API; production returned to `6ab78c1684f6d6072a619a27`.
- The official Netlify CLI preview built the Next application successfully, then failed while publishing static content in `@netlify/plugin-nextjs` 5.16.0 on Windows. The generated function bundle contained Windows absolute paths and could not be treated as a production artifact.
- Two explicitly non-production normalized-artifact drafts (`6ab7a69dcdaaa0bda5c5f605` and `6ab7a705a04142dc671209d6`) were not promoted. The first failed on a rewritten Windows runtime path; the second reached the function but lacked the traced `next/dist/server/lib/start-server.js` runtime module.
- Post-audit direct validation passed: root, web and API TypeScript checks; ESLint for source/scripts; 56 Vitest tests; web and API production builds; and `git diff --check`. The exact repository `pnpm release:check` command was not claimable on this host because the available fallback is pnpm 11.19.0 while the repository pins pnpm 9.12.0; its non-interactive module reconciliation aborted before running the checks. The configured Playwright gate remains separately blocked by the Windows pnpm web-server launcher and Chromium `spawn EPERM` limitation recorded above.
- Result: production is healthy and unchanged after rollback; the local audit corrections remain unpromoted. A future follow-up release requires the documented Linux/Netlify Git build path, followed by the full release gate and hosted checks.

## 12 November release check

The read-only Netlify check confirmed `6ab78c1684f6d6072a619a27` is still the current ready production deploy. It lists a Next.js server handler. The deploy metadata provides neither a Git commit reference nor a source archive. The September rollback to this deploy succeeded, and Netlify can republish an available atomic deploy. Verify the target's retention after replacement and document a recovery or fix-forward path before releasing. The retained 42-file export verifies static bytes. Exact source and handler reproduction are still open. [Netlify deploy management and retention](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/#automatic-deploy-deletion)

The approved public contact is `training@jasonrae.ai` once forwarding ownership and monitoring are confirmed and the exact release passes acceptance. The 13 October receipt verifies one forwarded test. The contact change remains local. [Contact decision](tasks/archive/2026-11/2026-11-08-contact-alias-decision-codex.md) · [Owner release handoff](tasks/active/2026-11-11-svc-st-01-contact-release-readiness-codex.md)

### Recovery follow-up

The website agent checked the recorded locations for the September Linux source manifest and production export. Both files are absent at those paths. The retained 59-entry manifest identifies the later 1 November source snapshot. Provider metadata still shows the current ready deploy and provides no project retention setting or source archive. The October export receipt preserves the 42-file static comparison. [Export evidence](<../../Website Coordination/docs/smart-training-netlify-deploy-export-capabilities-2026-10-31.md>)

The release owner can prepare a recoverable replacement from reviewed source. Freeze and hash the exact source, lockfile and configuration. After the existing artifact isolation hold is cleared, reproduce the pinned Linux adapter build and verify the handler, effective redirects and headers, and the contact routes. Retain the tested package and confirm that the current deploy will stay available for recovery after replacement, or establish a tested fix-forward route. The inbox owner must confirm forwarding, access to the destination inbox and monitoring responsibility. [Netlify deployment retention](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/#automatic-deploy-deletion)
