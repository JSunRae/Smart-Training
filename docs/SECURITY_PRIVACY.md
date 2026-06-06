# Security and Privacy Checklist

Last reviewed: 2026-05-29

- [x] Obtain explicit consent for recording/transcript capture.
  Consent is required during registration and can be provided during login if missing.
- [x] Provide transcript and account deletion flow.
  `DELETE /api/auth/account` removes the authenticated user immediately, clears the session cookie, and deletes that user's stored sessions and transcript messages. If that user was the last member of the organization, the org record plus org-owned custom scenarios and documents are removed too. Shared seeded scenarios and shared documents are not deleted by another account's removal.
- [x] Keep API keys and secrets out of source control.
  Environment files are ignored, and the local store file is ignored.
- [x] Encrypt sensitive data at rest and in transit.
  In production, `DATA_ENCRYPTION_KEY` is required for store access and HTTPS is required at the deployment edge.
- [x] Enforce tenant isolation on documents and sessions.
  Session, scenario, and user access is scoped by organization in the API layer.
- [x] Define retention policy for transcripts and logs.
  Transcript retention defaults to 30 days through `SESSION_RETENTION_DAYS` and applies only to non-active session history, including completed and abandoned sessions, keyed off `endedAt` or `updatedAt`. Active sessions are not pruned by retention until they end. Account deletion bypasses that window and removes the deleted account's stored session history immediately. The customer-facing summary is published at `/privacy`.
- [x] Publish operator-facing privacy/support contact details.
  Hosted launch requires `/privacy` to show at least one operator-facing support contact. Configure `NEXT_PUBLIC_SUPPORT_EMAIL` or `NEXT_PUBLIC_SUPPORT_URL`; otherwise the page falls back to a missing-contact warning. `NEXT_PUBLIC_SUPPORT_NAME` only changes the label and defaults to `Smart Training Pilot Support`.
- [x] Document third-party processors and regions.
  Default launch mode uses no third-party processor. `OPENAI_API_KEY` alone does not change runtime behavior. Transcript turns are sent to the OpenAI API only when a deployment both configures `OPENAI_API_KEY` and explicitly enables `OPENAI_TEXT_ENABLED=true` or `VOICE_LAB_ENABLED=true`, under the account and regional settings of that deployment. The first hosted pilot keeps `OPENAI_TEXT_ENABLED=false` and `VOICE_LAB_ENABLED=false`, so it stays text-first, deterministic by default, and voice-disabled.
- [x] Verify role-based authorization for org admins, trainers, and sellers.
  The current MVP authorizes all authenticated users for practice-session actions, scopes all access by organization, and reserves deeper role-specific controls for a later admin feature set.
