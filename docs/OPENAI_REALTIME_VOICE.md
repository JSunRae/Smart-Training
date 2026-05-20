# OpenAI Realtime Voice Notes

Last updated: 2026-05-15

## Official references

- [Realtime API with WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc)
- [Realtime API reference](https://platform.openai.com/docs/api-reference/realtime?api-mode=responses)

## What the repo implements

- The API server exposes `POST /api/realtime/call`.
- The browser creates a WebRTC SDP offer and sends it to the API server.
- The API server forwards that SDP plus session configuration to `POST /v1/realtime/calls`.
- The browser receives the SDP answer and completes the peer connection.

This follows the official **unified interface** flow from the WebRTC guide. The repo intentionally avoids exposing a standard OpenAI API key to the browser.

## Why this path was chosen

- It matches the current official WebRTC guide.
- It keeps session initialization server-side.
- It fits the existing `web` + `api` split in this monorepo.
- It keeps the core text workflow independent from the voice experiment.

## Current product posture

- `/voice-lab` is **experimental**.
- It does not replace the persisted text transcript workflow.
- It requires both `OPENAI_API_KEY` and `VOICE_LAB_ENABLED=true`.
- It defaults to `OPENAI_REALTIME_MODEL=gpt-realtime` and `OPENAI_REALTIME_VOICE=marin`.

## Next upgrade path

If voice becomes a supported product surface, the next logical steps are:

1. Persist voice-session metadata and transcript artifacts.
2. Add automated browser coverage for the voice lab.
3. Decide whether the voice path should share the same coaching/session objects as text sessions.
