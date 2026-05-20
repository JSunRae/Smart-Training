# web

Frontend for the Smart Training MVP.

## Responsibilities

- landing and authentication UI
- dashboard with scenarios and session history
- live roleplay transcript view
- experimental `/voice-lab` WebRTC shell for OpenAI Realtime voice sessions
- proxying `/api/*` requests to the local API service

## Local run

```powershell
pnpm --filter web dev
```

The web app expects the API service to be running on `http://localhost:3001`.

For production, set `INTERNAL_API_ORIGIN` to the deployed API origin before running
`pnpm --filter web start`.
If your host exposes the API only on a private network, `INTERNAL_API_HOSTPORT` can be used
instead.
`NEXT_PUBLIC_API_ORIGIN` is optional for the current MVP and is only needed if you want the public
API origin surfaced explicitly in the frontend environment.
