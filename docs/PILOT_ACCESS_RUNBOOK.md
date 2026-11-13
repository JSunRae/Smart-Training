# Pilot Access Operator Runbook

Last updated: 2026-11-12

Use this runbook for synthetic local rehearsal and for named participants once the product's release and access gates are cleared. The CLI prints issued tokens for the operator to handle and deliver through an approved channel.

## Operating boundary

- Local development defaults to `workspace` access. To rehearse the pilot locally, set `PILOT_ACCESS_MODE=invite` on the isolated API and `SMART_TRAINING_SITE_MODE=pilot` on the isolated web app. Use a dedicated file such as `pilot-test.json` and set `SMART_TRAINING_DB_PATH` to that filename before starting the API. Stop the API while operating on its local file from a separate CLI process.
- The API defaults to closed in production. Use `PILOT_ACCESS_MODE=invite` for approved synthetic hosted acceptance and for an approved customer pilot. Deliver participant invitations after the hosted launch record passes and the owner approves access. The backend checks invitations even when someone calls it directly.
- No credentials or `.env` file are loaded by the CLI. Choose `--postgres` only when `DATABASE_URL` is intentionally present in the process environment and independently verified as the intended database. Choose `--file <synthetic-test.json>` only when `DATABASE_URL` is absent. The CLI refuses a file selection when `DATABASE_URL` is set and refuses a production file target.
- Never use synthetic file storage for participants or a hosted pilot. The API's file backend is local-only and does not provide shared multi-process production semantics.

## Verify identity and authority first

Before issuing an invite, verify the participant's email address through an owner-approved process and confirm the exact organisation from the approved cohort record. Use the authoritative organisation ID shown by `create-org` or the approved account record; do not infer membership from a name or email domain.

For a password reset, independently verify the requester using the approved support procedure before running the command. The required `--identity-verified` flag is an operator attestation, not an automated proof. Confirm the exact registered email and organisation ID. Do not reset access based only on possession of an inbound support message or a forwarded form notification.

`approve` enables an existing unapproved or suspended account. Confirm owner authorization and both account identifiers first. `suspend` denies subsequent authenticated requests and preserves stored data. Direct participants who need account deletion or transcript handling to support.

## Select the storage target

Run from the repository root with the API package filter. Keep target selection explicit for every invocation:

```powershell
pnpm --filter api pilot:access -- --file pilot-test.json create-org --name "Synthetic Example"
pnpm --filter api pilot:access -- --postgres create-org --name "Approved Pilot Organisation"
```

For local fixtures, select a dedicated, non-default `.json` filename under the API's `data` directory. For Postgres, verify the intended database independently before invoking the command and keep its connection string private.

## Operator commands

Create an organisation and record its returned ID in the approved internal cohort record:

```powershell
pnpm --filter api pilot:access -- --postgres create-org --name "Approved Pilot Organisation"
```

Issue an invitation. Role defaults to `SELLER`; use `ADMIN` only when explicitly authorized for a named participant. Invitations expire after 48 hours and are one-use:

```powershell
pnpm --filter api pilot:access -- --postgres invite --email participant@example.com --organization-id org_approved_id
pnpm --filter api pilot:access -- --postgres invite --email operator@example.com --organization-id org_approved_id --role ADMIN
```

Revoke the outstanding invitation for the normalized email address and exact organisation in the selected backend:

```powershell
pnpm --filter api pilot:access -- --postgres revoke-invite --email participant@example.com --organization-id org_approved_id
```

Issue a support-assisted password reset only after the verification above. The CLI passes both identifiers so the repository verifies the account and organisation in the same transaction as issuing the reset grant. The reset grant expires after 30 minutes and is one-use:

```powershell
pnpm --filter api pilot:access -- --postgres reset-password --email participant@example.com --organization-id org_approved_id --identity-verified
```

Suspend or re-enable an existing account using its authoritative email and organisation ID:

```powershell
pnpm --filter api pilot:access -- --postgres suspend --email participant@example.com --organization-id org_approved_id
pnpm --filter api pilot:access -- --postgres approve --email participant@example.com --organization-id org_approved_id
```

## Token handling and delivery

Invitation and reset tokens are printed only after the repository confirms issuance. Treat terminal output, scrollback, copied text and screenshots as credentials. Share a token only through a separately authorized, verified delivery channel to the approved recipient. This tool never sends email or messages, and invitation issuance alone does not authorize delivery. Do not put tokens in tickets, chat history, analytics, URLs, shell history, or logs. If output is exposed or delivered to the wrong person, revoke the invitation when applicable and follow the support incident process; issue a fresh token only after the exposure is addressed.

## Support and account/session behavior

Use the approved public support contact shown on `/privacy` for requests. Keep the initial response neutral about account existence. Confirm identity before recovery or access changes. A successful reset replaces the password and invalidates prior sessions. The participant signs in with the new password. Suspension denies subsequent authenticated requests, and reapproval requires a fresh sign-in. Sign-out revokes all sessions issued with the current account session version.

Support-assisted recovery is distinct from invitation acceptance: a reset token is not an invitation, and an invitation token cannot reset a password. Preserve transcripts according to the published retention policy and handle deletion requests through the documented privacy process, not by treating suspension as deletion.

## Hosted smoke

Hosted smoke uses a dedicated synthetic invitation supplied through `SMART_TRAINING_SMOKE_INVITATION_TOKEN` and `SMART_TRAINING_SMOKE_EMAIL`. Create it only in an explicitly isolated test environment, use the approved synthetic email, and never place the token in a command-line argument or committed file. Do not run smoke against a real participant database or live cohort unless the separate hosted-smoke authorization explicitly covers that target. Revoke or consume the synthetic grant and remove local fixture data under the owning task's retention rules after evidence is recorded.

## Audit notes

The CLI emits only the command outcome, identifiers needed for operations, and token output for successful grant creation. It suppresses raw repository/database exceptions, does not log passwords or connection strings, and shuts down the Postgres pool in a `finally` block. Record the operator, timestamp, approved cohort reference, target backend label, action result, and any separately authorized delivery evidence in the internal pilot record. Do not record the token itself.
