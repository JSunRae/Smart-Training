# Security and Privacy Checklist

Last reviewed: 2026-05-15

- [x] Obtain explicit consent for recording/transcript capture.
  Consent is required during registration and can be provided during login if missing.
- [x] Provide transcript and account deletion flow.
  `DELETE /api/auth/account` removes the user and related session history.
- [x] Keep API keys and secrets out of source control.
  Environment files are ignored, and the local store file is ignored.
- [x] Encrypt sensitive data at rest and in transit.
  In production, `DATA_ENCRYPTION_KEY` is required for store access and HTTPS is required at the deployment edge.
- [x] Enforce tenant isolation on documents and sessions.
  Session, scenario, and user access is scoped by organization in the API layer.
- [x] Define retention policy for transcripts and logs.
  Transcript retention defaults to 30 days through `SESSION_RETENTION_DAYS`, account deletion removes stored session history immediately, and the customer-facing summary is published at `/privacy`.
- [x] Publish operator-facing privacy/support contact details.
  The `/privacy` page now renders deployment-specific support details through `NEXT_PUBLIC_SUPPORT_EMAIL` or `NEXT_PUBLIC_SUPPORT_URL`.
- [x] Document third-party processors and regions.
  Default launch mode uses no third-party processor. If `OPENAI_API_KEY` is configured, transcript turns are sent to the OpenAI API under the account and regional settings of that deployment.
- [x] Verify role-based authorization for org admins, trainers, and sellers.
  The current MVP authorizes all authenticated users for practice-session actions, scopes all access by organization, and reserves deeper role-specific controls for a later admin feature set.
