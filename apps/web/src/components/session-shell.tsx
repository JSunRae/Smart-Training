"use client";

import type { MessageResponse, SessionDetail, SessionResponse } from "@core/contracts";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiClientError, apiGet, apiPost, toErrorMessage } from "@/lib/api";

import styles from "./session-shell.module.css";

type ViewState =
  | { status: "loading" }
  | { status: "ready"; session: SessionDetail }
  | { status: "error"; message: string };

export function SessionShell({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const [viewState, setViewState] = useState<ViewState>({ status: "loading" });
  const [draft, setDraft] = useState("");
  const [busyAction, setBusyAction] = useState<"message" | "coach" | "complete" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadSession = useEffectEvent(async (nextSessionId: string) => {
    try {
      const response = await apiGet<SessionResponse>(`/api/sessions/${nextSessionId}`);
      setViewState({ status: "ready", session: response.session });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        router.replace("/");
        return;
      }

      setViewState({
        status: "error",
        message: toErrorMessage(error, "Unable to load the requested roleplay session.")
      });
    }
  });

  useEffect(() => {
    setViewState({ status: "loading" });
    void loadSession(sessionId);
  }, [sessionId]);

  const session = viewState.status === "ready" ? viewState.session : null;

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [session?.messages.length]);

  async function sendDraftMessage(content: string) {
    if (!session || session.status !== "ACTIVE") {
      return;
    }

    setBusyAction("message");
    setActionError(null);

    try {
      const response = await apiPost<MessageResponse>(`/api/sessions/${session.id}/message`, {
        content
      });
      setViewState({ status: "ready", session: response.session });
      setDraft("");
    } catch (error) {
      setActionError(toErrorMessage(error, "Unable to send the seller message."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();

    if (!content) {
      return;
    }

    await sendDraftMessage(content);
  }

  async function handleCoachPause() {
    if (!session || session.status !== "ACTIVE") {
      return;
    }

    setBusyAction("coach");
    setActionError(null);

    try {
      const response = await apiPost<MessageResponse>(`/api/sessions/${session.id}/coach`);
      setViewState({ status: "ready", session: response.session });
    } catch (error) {
      setActionError(toErrorMessage(error, "Unable to generate coach guidance."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCompleteSession() {
    if (!session) {
      return;
    }

    setBusyAction("complete");
    setActionError(null);

    try {
      const response = await apiPost<SessionResponse>(`/api/sessions/${session.id}/complete`);
      setViewState({ status: "ready", session: response.session });
    } catch (error) {
      setActionError(toErrorMessage(error, "Unable to complete the roleplay session."));
    } finally {
      setBusyAction(null);
    }
  }

  if (viewState.status === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.infoPanel}>
            <span className={styles.eyebrow}>Loading Session</span>
            <h1>Restoring transcript and buyer context.</h1>
          </section>
        </div>
      </main>
    );
  }

  if (viewState.status === "error") {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.infoPanel}>
            <span className={styles.eyebrow}>Session Error</span>
            <h1>{viewState.message}</h1>
            <div className={styles.headerActions}>
              <button className={styles.primaryButton} type="button" onClick={() => router.push("/")}>
                Return to dashboard
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const readySession = viewState.session;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <button className={styles.backButton} type="button" onClick={() => router.push("/dashboard")}>
              Back to dashboard
            </button>
            <span className={styles.eyebrow}>{formatStatus(readySession.status)}</span>
            <h1>{readySession.scenario.title}</h1>
            <p>
              {readySession.scenario.buyerCompany} • {readySession.scenario.buyerRole} •{" "}
              {readySession.scenario.buyerTone}
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.secondaryButton}
              disabled={busyAction === "coach" || readySession.status !== "ACTIVE"}
              type="button"
              onClick={() => void handleCoachPause()}
            >
              {busyAction === "coach" ? "Coach working..." : "Pause for coach"}
            </button>
            <button
              className={styles.ghostButton}
              disabled={busyAction === "complete" || readySession.status !== "ACTIVE"}
              type="button"
              onClick={() => void handleCompleteSession()}
            >
              {busyAction === "complete" ? "Ending..." : "End session"}
            </button>
          </div>
        </header>

        <div className={styles.mainGrid}>
          <section className={styles.transcriptPanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Transcript</span>
                <h2>Seller and buyer exchange</h2>
              </div>
              <div className={styles.panelMeta}>
                <span>{readySession.messageCount} messages</span>
                <span>{readySession.coachInterventionCount} coach pauses</span>
              </div>
            </div>

            <div className={styles.messageList}>
              {readySession.messages.map((message) => (
                <article
                  className={`${styles.messageCard} ${messageClassName(message.role)}`}
                  key={message.id}
                >
                  <div className={styles.messageMeta}>
                    <span>{message.role}</span>
                    <time>{formatTimestamp(message.createdAt)}</time>
                  </div>
                  <p>{message.content}</p>
                </article>
              ))}
              <div ref={transcriptEndRef} />
            </div>

            <form className={styles.composer} onSubmit={handleSendMessage}>
              <label className={styles.composerLabel}>
                <span>Your seller reply</span>
                <textarea
                  className={styles.textarea}
                  disabled={readySession.status !== "ACTIVE" || busyAction !== null}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      void sendDraftMessage(draft.trim());
                    }
                  }}
                  placeholder="Answer the buyer with evidence, commercial pressure, and a clear next question."
                  rows={5}
                  value={draft}
                />
              </label>

              {actionError ? <p className={styles.inlineError}>{actionError}</p> : null}

              <div className={styles.composerActions}>
                <p className={styles.helperCopy}>{readySession.nextRecommendedAction}</p>
                <button
                  className={styles.primaryButton}
                  disabled={
                    busyAction === "message" || readySession.status !== "ACTIVE" || !draft.trim()
                  }
                  type="submit"
                >
                  {busyAction === "message" ? "Sending..." : "Send seller turn"}
                </button>
              </div>
            </form>
          </section>

          <aside className={styles.sidebar}>
            <section className={styles.sidebarPanel}>
              <span className={styles.eyebrow}>Scenario Frame</span>
              <h2>What matters in this conversation</h2>
              <dl className={styles.definitionList}>
                <div>
                  <dt>Buyer challenge</dt>
                  <dd>{readySession.scenario.challenge}</dd>
                </div>
                <div>
                  <dt>Seller goal</dt>
                  <dd>{readySession.scenario.goal}</dd>
                </div>
                <div>
                  <dt>Current recommendation</dt>
                  <dd>{readySession.nextRecommendedAction}</dd>
                </div>
              </dl>
            </section>

            <section className={styles.sidebarPanel}>
              <span className={styles.eyebrow}>Context Snippets</span>
              <h2>Retrieved evidence in play</h2>
              <div className={styles.snippetList}>
                {readySession.contextSnippets.map((snippet) => (
                  <article className={styles.snippetCard} key={snippet}>
                    {snippet}
                  </article>
                ))}
                {readySession.contextSnippets.length === 0 ? (
                  <article className={styles.snippetCard}>
                    No extra scenario documents were matched for this turn yet.
                  </article>
                ) : null}
              </div>
            </section>

            <section className={styles.sidebarPanel}>
              <span className={styles.eyebrow}>Run State</span>
              <h2>Session details</h2>
              <div className={styles.stateList}>
                <div>
                  <span>Started</span>
                  <strong>{formatTimestamp(readySession.startedAt)}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{formatStatus(readySession.status)}</strong>
                </div>
                <div>
                  <span>Ended</span>
                  <strong>
                    {readySession.endedAt
                      ? formatTimestamp(readySession.endedAt)
                      : "Still active"}
                  </strong>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function messageClassName(role: string): string {
  switch (role) {
    case "USER":
      return styles.messageUser;
    case "COACH":
      return styles.messageCoach;
    default:
      return styles.messageAssistant;
  }
}
