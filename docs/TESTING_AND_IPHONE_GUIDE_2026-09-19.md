# Testing Smart Training and the iPhone path

Checked 19 September 2026. Read with [the website and brand plan](WEBSITE_BRAND_PLAN_2026-09-19.md).

Updated after the real Netlify draft passed: [DEPLOYMENT_NETLIFY.md](DEPLOYMENT_NETLIFY.md) covers the website and later hosted proxy checks; [the release record](WEBSITE_RELEASE_2026-09-19.md) contains production/domain evidence. The launcher includes tracked and non-ignored new app source, so the new website imports are exercised. Hosted Postgres, customer-platform access and physical iPhone Safari remain untested.

## What works now

Smart Training has a Next.js web app and API. It implements registration/sign-in, scenario selection, text roleplay, pause-for-coach guidance, session completion, transcript history and account deletion. The current default demonstration is deterministic and text-first; it does not use generated AI or voice.

There is no native iPhone project in this repository. Searches found no Swift files, Xcode project, Expo/React Native app or Capacitor wrapper. No web app manifest or service worker was found either. The decision register explicitly places iOS/native delivery outside the present pilot scope. An App Store app belonging to another company with a similar name would not establish that we have an app.

## Fresh verification

| Check | Result on 19 September | What it establishes |
| --- | --- | --- |
| `pnpm test` | PASS: 56 tests across 15 files; latest repeat 14:15 Europe/Berlin | Unit/API coverage and Netlify deployment-mode validation pass |
| `node scripts/demo-local-qa.mjs --web-port 4370 --api-port 4371` | PASS: latest 12:18:11 UTC / 14:18:11 Europe/Berlin | Fresh isolated Chrome workflow, transcript reopening, 390 px layout, support contact, synthetic deletion and cleanup |
| ESLint + Prettier on adjusted demo tooling | PASS | Local runner changes pass lint and formatting |
| Full `pnpm release:check` | PASS, approximately 14:06–14:08 Europe/Berlin | Typecheck, lint, 56 tests, both Next builds, browser E2E and production dependency audit |
| Netlify-mode marketing build and routes | PASS; final build repeated after icon/reduced-motion changes | Website needs no backend; app routes redirect; API routes unavailable; preview noindex |
| Website desktop/390 px layout and example | PASS in browser | Responsive layout and expandable illustration; no physical-iPhone claim |
| Actual Netlify Linux adapter draft | PASS at 13:35 UTC; desktop/mobile-width UI reviewed | Hosted pages, fonts/styles/scripts, disabled application/API paths and preview noindex work |
| Production enquiry website | PASS at https://smart-training-992w.netlify.app; custom hostname valid HTTPS rechecked 2026-09-26 | Published baseline routes/assets/contact/canonical metadata work; the current production page predates the local conversion source |
| Hosted Postgres / training proxy / restore | NOT tested in this task | Public training-platform readiness remains unestablished |
| Physical iPhone Safari and Home Screen launch | NOT tested in this task | 390 px desktop Chrome is not an iPhone compatibility result |
| Generated AI and voice quality | NOT tested; disabled | Local success does not establish these optional features work |

The browser runner initially completed the app workflow but failed when immediately checking that its ports were free. A bounded wait of up to ten seconds per owned port was added after shutdown in `scripts/demo-local-qa.mjs`. It still fails if a port remains occupied and does not stop an unrelated service. The subsequent complete run exited 0. An earlier sandbox attempt could not read installed Next.js dependencies; the successful check ran outside that filesystem restriction.

Evidence: ignored `test-results/client-demo-qa/result.json`, its screenshots, `test-results/netlify-marketing-http.json` and `test-results/netlify-preview-http.json`. Latest successful demo source copy: `test-results/local-demo-VJSVKq`. Base revision: `ddc337f0e5bba9bff2481c42fd124d6d415764d7`; the launcher copied tracked and non-ignored new application files, skipping deleted files. Website and demo tooling changes are uncommitted. The icon, reduced-motion rule and launcher refinement received targeted follow-up checks after the full release run. Canonical/social metadata received scoped lint and a fresh Linux adapter build. Do not describe this as a clean release tag or a hosted training-platform launch gate.

## Try it yourself in about ten minutes

On this Windows PC, open PowerShell in the project and run:

```powershell
Set-Location 'C:\Users\Pilot\Documents\Vs Code Projects\Smart_Training'
& 'C:\Program Files\nodejs\node.exe' scripts/demo-local.mjs
```

Wait for the printed **Synthetic local demo** address, normally `http://127.0.0.1:4310`, then open that address in Chrome. Keep the terminal open. Node 22.18+ within Node 22 and the installed dependencies are required. No AI API key or cloud account is needed for this demonstration.

1. Create a synthetic workspace using a made-up name, organisation, email and password.
2. Start a seeded scenario, such as **Change Management Adoption**.
3. Send a seller reply. Confirm that a buyer response appears.
4. Select **Pause for coach**. Confirm guidance appears, then continue the conversation.
5. Select **End session**. Return to the dashboard and **Review transcript**. Confirm your earlier response is present.
6. Check `/privacy` for the support contact. Delete only the synthetic account and confirm you are signed out.
7. Stop the terminal with **Ctrl+C**. This isolated demo uses fresh temporary data that is removed on normal shutdown.

If the default ports are busy, use a free pair, for example:

```powershell
node scripts/demo-local.mjs --web-port 4350 --api-port 4351
```

Use the URL actually printed. Do not terminate another service to free its port. This launcher is loopback-only: its address works on this PC, not on an iPhone. Do not enter customer information or expose this demo publicly.

## Repeatable technical checks

From the repository root:

```powershell
pnpm test
pnpm demo:check
```

`demo:check` starts and stops its own isolated environment and uses installed Chrome. If its ports 4330/4331 are busy, invoke the verified alternative directly:

```powershell
node scripts/demo-local-qa.mjs --web-port 4370 --api-port 4371
```

Before a release, run the full gate on the intended revision in a clean test environment:

```powershell
$env:CI = 'true'
pnpm release:check
```

The gate includes typecheck, lint, unit/API tests, builds, browser E2E and production dependency audit. CI mode avoids silently reusing a server already running on ports 3000/3001. Use a dedicated test shell/environment with no production database or provider credentials; do not point tests at customer data. Exit that shell afterwards so the CI setting does not carry into unrelated work.

## Testing a hosted platform

After a budgeted trial deployment exists, substitute the real URLs below:

```powershell
pnpm smoke:hosted -- --api https://YOUR-API-HOST --web https://YOUR-WEB-HOST --support-email Jason_C_Rae@Outlook.com
```

This creates and deletes a synthetic account. Follow with [HOSTED_QA_CHECKLIST.md](HOSTED_QA_CHECKLIST.md) for visible UI and transcript reopening, and record live facts in [PILOT_LAUNCH_RECORD.md](PILOT_LAUNCH_RECORD.md). Verify persistence after a service restart, organisation isolation, failure messages, monitoring and a demonstrated backup restore. The existing launch record includes the authoritative evidence requirements.

Do not enable a public “Start training” link just because the marketing website loads. Customer access needs passing hosted checks and an agreed trial scope. The separate site can accept enquiries before this.

## Does the training help people?

Software checks prove the workflow works. They do not prove that coaching is useful or that sales improve.

Run the evaluation proposed in [SALES_STRATEGY_2026-09-13.md](SALES_STRATEGY_2026-09-13.md): about five volunteers, one fictional conversation family, four short rounds over two weeks, and an agreed human reviewer. Compare an uncoached baseline with a different but comparable final scenario.

Review four observable behaviours: asks a useful clarifying question, relates the issue to a buyer-relevant consequence without inventing facts, answers the actual concern, and agrees a proportionate next step. Record failed attempts and drop-outs as well as completions. Track time, confusing screens, relevance of guidance and whether people choose to practise again. Agree useful/stop criteria before starting; treat results as small-pilot feedback rather than a proven revenue effect.

## iPhone recommendation

1. **First: mobile web.** Once hosted, test the same full journey on a physical iPhone in Safari. Cover the smallest supported screen, keyboard covering the reply box, long transcripts, portrait/landscape, refresh, background/resume, lost connection, sign-out and deletion. Record device and iOS version.
2. **Next: Home Screen experience.** Add a proper icon and manifest, check standalone navigation/login, and provide an honest offline message. Session data and authenticated API responses should not be put in an offline cache. Offline roleplay, push notifications and background sync are not existing features.
3. **Later: native app, if justified.** Scope a separate iOS or cross-platform project only if pilots demonstrate a need that browser delivery cannot meet. Allow for mobile auth, privacy, release maintenance, Apple review, TestFlight and device testing. Apple lists [Developer Program membership at US$99/year](https://developer.apple.com/programs/whats-included/), excluding development and any required Apple hardware/build services. A wrapper alone is not a completed App Store product.

After the hosted app passes iPhone testing, users can open it in Safari, use **Share → Add to Home Screen**, enable **Open as Web App** when offered, and add it. [Apple's instructions](https://support.apple.com/en-mo/guide/iphone/iphea86e5236/ios) describe the current flow. This launches the website from an icon; it does not mean we have shipped a native App Store app. Browser Home Screen support does not itself guarantee offline operation or notifications.
