"use client";

import type { DashboardResponse, RealtimeCallResponse } from "@core/contracts";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiClientError, apiGet, apiPost, toErrorMessage } from "@/lib/api";

import styles from "./voice-lab-shell.module.css";

type ViewState =
  | { status: "loading" }
  | { status: "ready"; dashboard: DashboardResponse }
  | { status: "error"; message: string };

type ConnectionState = "idle" | "connecting" | "connected" | "error";

type TranscriptEntry = {
  speaker: "BUYER" | "SYSTEM";
  text: string;
};

type RealtimeEvent = {
  delta?: string;
  error?: {
    message?: string;
  };
  transcript?: string;
  type?: string;
};

export function VoiceLabShell({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const liveTranscriptRef = useRef("");
  const [viewState, setViewState] = useState<ViewState>({ status: "loading" });
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);

  function teardownConnection() {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
  }

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const dashboard = await apiGet<DashboardResponse>("/api/dashboard");
        if (cancelled) {
          return;
        }

        setSelectedScenarioId(dashboard.scenarios[0]?.id ?? "");
        setViewState({ status: "ready", dashboard });
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          router.replace("/");
          return;
        }

        setViewState({
          status: "error",
          message: toErrorMessage(error, "Unable to load the voice lab.")
        });
      }
    })();

    return () => {
      cancelled = true;
      teardownConnection();
    };
  }, [enabled, router]);

  if (!enabled) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.panel}>
            <span className={styles.eyebrow}>Voice Lab Disabled</span>
            <h1>This deployment keeps the live voice path off by default.</h1>
            <p>
              The supported launch workflow is the persisted text roleplay path. Voice remains an
              experimental lab until it is explicitly enabled for this environment.
            </p>
            <div className={styles.actions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => router.push("/dashboard")}
              >
                Back to dashboard
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  async function handleStartVoice() {
    if (viewState.status !== "ready" || !selectedScenarioId) {
      return;
    }

    setConnectionState("connecting");
    setConnectionError(null);
    setEventLog([]);
    setLiveTranscript("");
    setTranscriptEntries([]);
    liveTranscriptRef.current = "";

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = localStream;

      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;
      peerConnection.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0] ?? null;
        }
      };

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      const dataChannel = peerConnection.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;
      dataChannel.addEventListener("open", () => {
        setConnectionState("connected");
        setEventLog((current) => [
          "Voice connection established.",
          ...current
        ]);
        dataChannel.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions:
                "Start the roleplay now with a concise spoken buyer opener. Keep it to one short turn."
            }
          })
        );
      });
      dataChannel.addEventListener("message", (event) => {
        handleRealtimeEvent(event.data);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const response = await apiPost<RealtimeCallResponse>("/api/realtime/call", {
        scenarioId: selectedScenarioId,
        sdp: offer.sdp
      });

      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: response.answerSdp
      });
    } catch (error) {
      teardownConnection();
      setConnectionState("error");
      setConnectionError(toErrorMessage(error, "Unable to start the live voice session."));
    }
  }

  function handleStopVoice() {
    teardownConnection();
    setConnectionState("idle");
    setConnectionError(null);
    setEventLog((current) => ["Voice session closed.", ...current]);
  }

  function handleRealtimeEvent(raw: string) {
    try {
      const event = JSON.parse(raw) as RealtimeEvent;
      if (!event.type) {
        return;
      }

      if (event.type === "response.audio_transcript.delta" && typeof event.delta === "string") {
        liveTranscriptRef.current += event.delta;
        setLiveTranscript(liveTranscriptRef.current);
        return;
      }

      if (event.type === "response.audio_transcript.done") {
        const finalText = (event.transcript || liveTranscriptRef.current).trim();
        if (finalText) {
          setTranscriptEntries((current) => [{ speaker: "BUYER", text: finalText }, ...current]);
        }
        liveTranscriptRef.current = "";
        setLiveTranscript("");
        return;
      }

      if (event.type === "error") {
        const message = event.error?.message || "Realtime voice returned an unknown error.";
        setConnectionError(message);
        setConnectionState("error");
        setTranscriptEntries((current) => [{ speaker: "SYSTEM", text: message }, ...current]);
        return;
      }

      setEventLog((current) => [event.type!, ...current].slice(0, 12));
    } catch {
      setEventLog((current) => ["Received a non-JSON realtime event.", ...current].slice(0, 12));
    }
  }

  if (viewState.status === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.panel}>
            <span className={styles.eyebrow}>Voice Lab</span>
            <h1>Loading live voice controls.</h1>
          </section>
        </div>
      </main>
    );
  }

  if (viewState.status === "error") {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.panel}>
            <span className={styles.eyebrow}>Voice Lab Error</span>
            <h1>{viewState.message}</h1>
            <div className={styles.actions}>
              <button className={styles.secondaryButton} type="button" onClick={() => router.push("/dashboard")}>
                Back to dashboard
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const selectedScenario =
    viewState.dashboard.scenarios.find((scenario) => scenario.id === selectedScenarioId) ??
    viewState.dashboard.scenarios[0] ??
    null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.panel}>
          <div className={styles.headerCopy}>
            <button className={styles.secondaryButton} type="button" onClick={() => router.push("/dashboard")}>
              Back to dashboard
            </button>
            <span className={styles.eyebrow}>Realtime Voice Lab</span>
            <h1>Test OpenAI live voice against a seeded buyer scenario.</h1>
            <p>
              This lab uses browser WebRTC plus the OpenAI Realtime API through the API server. It is
              intentionally isolated from the saved transcript workflow.
            </p>
          </div>

          <div className={styles.headerStats}>
            <div>
              <strong>{viewState.dashboard.scenarios.length}</strong>
              <span>voice-ready scenarios</span>
            </div>
            <div>
              <strong>{connectionState === "connected" ? "Live" : "Idle"}</strong>
              <span>connection state</span>
            </div>
          </div>
        </header>

        <div className={styles.grid}>
          <section className={styles.panel}>
            <span className={styles.eyebrow}>Scenario</span>
            <h2>Choose the buyer context for this call</h2>
            <label className={styles.field}>
              <span>Scenario</span>
              <select
                className={styles.select}
                disabled={connectionState === "connecting" || connectionState === "connected"}
                onChange={(event) => setSelectedScenarioId(event.target.value)}
                value={selectedScenarioId}
              >
                {viewState.dashboard.scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.title}
                  </option>
                ))}
              </select>
            </label>

            {selectedScenario ? (
              <div className={styles.scenarioCard}>
                <span className={styles.pill}>{selectedScenario.buyerCompany}</span>
                <h3>{selectedScenario.title}</h3>
                <p>{selectedScenario.description}</p>
                <dl className={styles.detailList}>
                  <div>
                    <dt>Challenge</dt>
                    <dd>{selectedScenario.challenge}</dd>
                  </div>
                  <div>
                    <dt>Rep goal</dt>
                    <dd>{selectedScenario.goal}</dd>
                  </div>
                  <div>
                    <dt>Buyer tone</dt>
                    <dd>{selectedScenario.buyerTone}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className={styles.helper}>No scenarios are available for the voice lab yet.</p>
            )}

            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                disabled={!selectedScenarioId || connectionState === "connecting" || connectionState === "connected"}
                type="button"
                onClick={() => void handleStartVoice()}
              >
                {connectionState === "connecting" ? "Connecting..." : "Start live voice"}
              </button>
              <button
                className={styles.secondaryButton}
                disabled={connectionState !== "connected" && connectionState !== "error"}
                type="button"
                onClick={handleStopVoice}
              >
                End voice session
              </button>
            </div>

            {connectionError ? <p className={styles.inlineError}>{connectionError}</p> : null}
            <p className={styles.helper}>
              Browser microphone permission is required. The API server stays in the call setup path and
              forwards the SDP offer to OpenAI over `POST /v1/realtime/calls`.
            </p>
            <audio autoPlay ref={audioRef} />
          </section>

          <section className={styles.panel}>
            <span className={styles.eyebrow}>Transcript</span>
            <h2>Live buyer transcript feed</h2>
            <div className={styles.transcriptList}>
              {liveTranscript ? (
                <article className={styles.transcriptCard}>
                  <strong>BUYER (live)</strong>
                  <p>{liveTranscript}</p>
                </article>
              ) : null}

              {transcriptEntries.map((entry, index) => (
                <article className={styles.transcriptCard} key={`${entry.speaker}-${index}`}>
                  <strong>{entry.speaker}</strong>
                  <p>{entry.text}</p>
                </article>
              ))}

              {!liveTranscript && transcriptEntries.length === 0 ? (
                <article className={styles.transcriptCard}>
                  <strong>Waiting</strong>
                  <p>The buyer transcript will appear here once the voice session starts responding.</p>
                </article>
              ) : null}
            </div>
          </section>

          <section className={styles.panel}>
            <span className={styles.eyebrow}>Realtime Events</span>
            <h2>Connection event stream</h2>
            <div className={styles.eventList}>
              {eventLog.length === 0 ? (
                <p className={styles.helper}>No events recorded yet.</p>
              ) : (
                eventLog.map((entry) => (
                  <div className={styles.eventRow} key={entry}>
                    {entry}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
