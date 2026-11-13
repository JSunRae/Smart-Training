# Enquiry-first launch

Updated September 13, 2026. This is the current operating plan. It supersedes instructions to provision Render before finding an interested client.

## Decisions

- Keep JasonRAE.AI as the marketing and enquiry entry point. The product page asks to **Discuss Smart Training**, not to register or join a waiting list.
- Keep the application local for screen-shared demonstrations with synthetic information.
- Keep the existing Render **Hobby** workspace. Do not upgrade to Pro or create compute/database services now.
- Hobby's USD 0 workspace fee does not make the existing paid Blueprint free. Compute, storage and excess usage require a later explicit spending decision.
- Keep website analytics provider-neutral and non-PII, and keep any newsletter signup separate from the product enquiry form. Do not treat enquiry capture as open pilot access.
- Product support contact: `Jason_C_Rae@Outlook.com`. No product price, service-level promise, trial start date or customer outcome is approved.

## Ready assets

- [Website review draft](https://6aa6869cd51fa81ebf46ebe8--jasonrae-ai.netlify.app/smart-training/): actual synthetic screenshot and prelaunch conversation CTA.
- [Client discovery playbook](CLIENT_DISCOVERY_PLAYBOOK.md): intake, discovery questions, a short local walkthrough, reply drafts and trial decision criteria.
- [Evidence-led sales strategy](SALES_STRATEGY_2026-09-13.md) and [research ledger](SALES_EVIDENCE_2026-09-13.md): buyer rationale, selling frameworks, evaluation design and evidence limits. New website example/planner additions are local and are not in the earlier hosted review draft.
- `pnpm demo:local`: fresh isolated local application, loopback-only, no inherited provider credentials, no generated AI or voice.
- `pnpm demo:check`: repeatable Chrome rehearsal including transcript reopening and synthetic account deletion.
- [Launch record](PILOT_LAUNCH_RECORD.md): hosted gates retained for the later client trial; a local demo is not hosted evidence.

The website draft is reviewable, not promoted production. Do not send a client a guessed app URL or describe the application as publicly available.

## Verification on September 13

- `pnpm test`: 53 tests passed, including five isolated-demo configuration/port/cancellation tests.
- `pnpm lint` and `pnpm typecheck`: passed.
- Separate startup interruption check: aborting after 1.5 seconds passed and left both owned ports free. Final tooling formatting check passed.
- `pnpm demo:check`: passed at 15:36 Europe/Berlin using installed Chrome. Covered registration, seeded buyer response, coach pause, completion, transcript reopening, 390px layout, approved support contact, synthetic account deletion, stopped servers and removed demo store.
- Desktop and individual mobile panel screenshots were visually inspected. A full-page Chrome capture omitted off-screen panels; viewport captures confirmed that those panels render correctly. No application styling was changed for this check.
- Evidence: ignored `test-results/client-demo-qa/result.json` and the PNGs in that directory. The demo copies current tracked application files; the manifest records the base revision `ddc337f`. The new launcher, tests and documentation are uncommitted working-tree changes, not a new tagged release or hosted gate result.

The demo servers are stopped after verification. Start the launcher below when preparing for a call.

## Local demonstration

From the repository root, using Node 22.18 or newer within Node 22:

```powershell
& 'C:\Program Files\nodejs\node.exe' scripts/demo-local.mjs
```

The launcher prints the local URL, normally `http://127.0.0.1:4310`. Wait for that message before opening it in Chrome. Keep the terminal running during the call and stop it with Ctrl+C afterward. It creates a new ignored source/data folder per run, links existing installed dependencies, uses fresh in-memory encryption/session keys, and removes the demo account/transcript store on normal shutdown. The original application store and existing servers are not reused or stopped.

If a port is occupied, choose another pair; do not stop the unrelated listener:

```powershell
& 'C:\Program Files\nodejs\node.exe' scripts/demo-local.mjs --web-port 4350 --api-port 4351
```

If dependencies are missing, use the repository's Node 22 / pnpm 9.12 toolchain to install its frozen lockfile first. No provider API key is required. Do not expose the demo through a tunnel, bind it to a public interface, or enter customer information. A forced machine shutdown can prevent cleanup; remaining run folders are under ignored `test-results/local-demo-*` and are not client records or backups.

## When hosting becomes necessary

Reopen hosted rollout only when a prospect requests independent hands-on access and agrees the purpose, participants, scenario, duration and data-handling approach of a trial. Before provisioning:

1. Confirm the provider and actual compute/storage budget. Hobby remains the selected Render workspace plan if Render is used.
2. Recheck current provider requirements, dependency security and the exact source revision.
3. For a paid database on Hobby, record the actual **three-day** PITR window, not the old seven-day Pro assumption. Maintain the planned pre-pilot export and weekly logical exports; verify restore ownership and artifacts. Free database compute does not satisfy the existing recovery requirement. [Render recovery documentation](https://render.com/docs/postgresql-backups)
4. Complete hosted health, support visibility, smoke, transcript/deletion QA, monitoring and recovery evidence before granting access.

No hosting expense or public access is required merely to conduct an initial conversation or local walkthrough.

## Remaining owner inputs

- Review the specific website draft for presentation approval.
- Jason confirmed there is no newsletter service. Select a low-cost delivery/list provider and then verify subscriber confirmation, unsubscribe/removal handling and actual retention. Recommendation and current limits are in the website repo's `internal-docs/NEWSLETTER_LOW_COST_2026-09-13.md`. No newsletter service has been activated; Formspree notification delivery alone is not a newsletter system.
- Confirm the website processor/account arrangements and enquiry/newsletter retention match the notice. Do not mark these checks complete from repository code alone.

Netlify ticket #1109761 remains an external runtime blocker. The scoped mailbox check found only the September 11 acknowledgement and Jason's existing triage confirmation. Do not repeatedly trigger the same failed draft run or use production as a diagnostic workaround. Re-test after a relevant provider response or runtime change.
