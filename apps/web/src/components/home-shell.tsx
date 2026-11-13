"use client";

import type {
  DashboardResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  SessionResponse,
  SessionSummary
} from "@core/contracts";
import { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ApiClientError, apiDelete, apiGet, apiPost, toErrorMessage } from "@/lib/api";

import styles from "./home-shell.module.css";

type Mode = "register" | "login";

type ViewState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "ready"; dashboard: DashboardResponse }
  | { status: "error"; message: string };

type AuthFormState = {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  invitationToken: string;
  acceptTranscriptConsent: boolean;
};

const INITIAL_FORM: AuthFormState = {
  name: "",
  email: "",
  password: "",
  organizationName: "",
  invitationToken: "",
  acceptTranscriptConsent: false
};

const PRACTICE_POINTS = [
  "Challenger-style showcase scenarios are seeded locally, so the repo demos both end-user training and how Smart Training itself can be sold.",
  "Coach pauses generate immediate corrective guidance without ending the conversation.",
  "Transcript history persists per organization, giving the team a real MVP workflow to test."
];

async function readDashboardView(): Promise<ViewState> {
  try {
    const dashboard = await apiGet<DashboardResponse>("/api/dashboard");
    return { status: "ready", dashboard };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      return { status: "anonymous" };
    }

    return {
      status: "error",
      message: toErrorMessage(error, "Unable to load the Smart Training workspace.")
    };
  }
}

export function HomeShell({
  initialMode,
  voiceLabEnabled,
  inviteOnly = false
}: {
  initialMode: Mode;
  voiceLabEnabled: boolean;
  inviteOnly?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [viewState, setViewState] = useState<ViewState>({ status: "loading" });
  const [formData, setFormData] = useState<AuthFormState>(INITIAL_FORM);
  const [authError, setAuthError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const nextView = await readDashboardView();
      if (!cancelled) {
        setViewState(nextView);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dashboard = viewState.status === "ready" ? viewState.dashboard : null;
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredScenarios =
    dashboard?.scenarios.filter((scenario) => {
      if (!normalizedSearch) {
        return true;
      }

      return matchesSearch(
        normalizedSearch,
        scenario.title,
        scenario.description,
        scenario.challenge,
        scenario.goal,
        scenario.buyerCompany
      );
    }) ?? [];
  const filteredSessions =
    dashboard?.sessions.filter((session) => {
      if (!normalizedSearch) {
        return true;
      }

      return matchesSearch(
        normalizedSearch,
        session.scenario.title,
        session.scenario.buyerCompany,
        session.latestMessagePreview ?? "",
        session.status
      );
    }) ?? [];
  const activeSessions = dashboard?.sessions.filter((session) => session.status === "ACTIVE") ?? [];

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("auth");
    setAuthError(null);

    try {
      if (mode === "register") {
        const payload: RegisterRequest = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          ...(inviteOnly
            ? { invitationToken: formData.invitationToken }
            : { organizationName: formData.organizationName }),
          acceptTranscriptConsent: formData.acceptTranscriptConsent
        };
        await apiPost("/api/auth/register", payload);
      } else {
        const payload: LoginRequest = {
          email: formData.email,
          password: formData.password,
          acceptTranscriptConsent: formData.acceptTranscriptConsent
        };
        await apiPost("/api/auth/login", payload);
      }

      setFormData((current) => ({
        ...current,
        password: "",
        acceptTranscriptConsent: false
      }));
      setViewState(await readDashboardView());
    } catch (error) {
      setAuthError(toErrorMessage(error, "Unable to authenticate."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleResetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("reset");
    setResetError(null);
    setResetMessage(null);
    try {
      const payload: ResetPasswordRequest = { resetToken, password: resetPassword };
      await apiPost("/api/auth/reset-password", payload);
      setResetToken("");
      setResetPassword("");
      setShowReset(false);
      setMode("login");
      setResetMessage("Password updated. Sign in with your new password.");
    } catch (error) {
      setResetError(toErrorMessage(error, "Unable to reset the password."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleStartSession(scenarioId: string) {
    setBusyAction(`start:${scenarioId}`);

    try {
      const response = await apiPost<SessionResponse>("/api/sessions/start", { scenarioId });
      router.push(`/roleplay/${response.session.id}`);
    } catch (error) {
      setViewState({
        status: "error",
        message: toErrorMessage(error, "Unable to start the roleplay session.")
      });
      setBusyAction(null);
    }
  }

  async function handleLogout() {
    setBusyAction("logout");

    try {
      await apiPost("/api/auth/logout");
      setViewState({ status: "anonymous" });
      setAuthError(null);
      setSearch("");
    } catch (error) {
      setViewState({
        status: "error",
        message: toErrorMessage(error, "Unable to sign out.")
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Delete this account and its session history? This cannot be undone.")) {
      return;
    }

    setBusyAction("delete");

    try {
      await apiDelete("/api/auth/account");
      setViewState({ status: "anonymous" });
      setFormData(INITIAL_FORM);
      setSearch("");
    } catch (error) {
      setViewState({
        status: "error",
        message: toErrorMessage(error, "Unable to delete the account.")
      });
    } finally {
      setBusyAction(null);
    }
  }

  if (viewState.status === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.loadingCard}>
            <span className={styles.eyebrow}>Booting Workspace</span>
            <h1>Loading seeded scenarios, session history, and coaching state.</h1>
          </section>
        </div>
      </main>
    );
  }

  if (viewState.status === "error") {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.errorCard}>
            <span className={styles.eyebrow}>Workspace Error</span>
            <h1>{viewState.message}</h1>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => void (async () => {
                setViewState({ status: "loading" });
                setViewState(await readDashboardView());
              })()}
            >
              Retry
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (viewState.status === "anonymous") {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.splitLayout}>
            <section className={styles.heroCard}>
              <div className={styles.brandRow}>
                <div className={styles.brandMark}>ST</div>
                <span className={styles.brandLabel}>Smart Training</span>
              </div>

              <span className={styles.eyebrow}>Text-First Launch Slice</span>
              <h1 className={styles.headline}>
                Practice hard buyer conversations before the rep ever gets on a live call.
              </h1>
              <p className={styles.lead}>
                The repo now ships a usable MVP loop: create an account, pick a scenario,
                roleplay with an AI buyer, pause for coaching, and review the saved session
                transcript.
              </p>

              <div className={styles.metricStrip}>
                <div className={styles.metricCard}>
                  <strong>10</strong>
                  <span>seeded launch scenarios</span>
                </div>
                <div className={styles.metricCard}>
                  <strong>1</strong>
                  <span>session flow from login to transcript</span>
                </div>
                <div className={styles.metricCard}>
                  <strong>0</strong>
                  <span>required cloud services for local MVP use</span>
                </div>
              </div>

              <div className={styles.pointList}>
                {PRACTICE_POINTS.map((point) => (
                  <article className={styles.pointCard} key={point}>
                    {point}
                  </article>
                ))}
              </div>
            </section>

            <aside className={styles.authCard}>
              <div className={styles.tabRow}>
                <button
                  className={mode === "register" ? styles.tabActive : styles.tab}
                  type="button"
                  onClick={() => setMode("register")}
                >
                  {inviteOnly ? "Join pilot" : "Create workspace"}
                </button>
                <button
                  className={mode === "login" ? styles.tabActive : styles.tab}
                  type="button"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
              </div>

              <div className={styles.authIntro}>
                <span className={styles.eyebrow}>
                  {mode === "register"
                    ? inviteOnly
                      ? "Pilot invitation"
                      : "New Team"
                    : "Returning User"}
                </span>
                <h2>
                  {mode === "register"
                    ? inviteOnly
                      ? "Use your invitation to join the pilot workspace."
                      : "Create an organization and start a first roleplay."
                    : "Resume practice from your saved session history."}
                </h2>
              </div>

              <form className={styles.form} onSubmit={handleAuthSubmit}>
                {mode === "register" ? (
                  <>
                    <label className={styles.field}>
                      <span>Name</span>
                      <input
                        className={styles.input}
                        value={formData.name}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Jordan Reyes"
                        required
                      />
                    </label>

                    {inviteOnly ? (
                      <label className={styles.field}>
                        <span>Invitation code</span>
                        <input
                          className={styles.input}
                          type="password"
                          value={formData.invitationToken}
                          onChange={(event) =>
                            setFormData((current) => ({
                              ...current,
                              invitationToken: event.target.value
                            }))
                          }
                          autoComplete="off"
                          required
                        />
                      </label>
                    ) : (
                      <label className={styles.field}>
                        <span>Organization</span>
                        <input
                          className={styles.input}
                          value={formData.organizationName}
                          onChange={(event) =>
                            setFormData((current) => ({
                              ...current,
                              organizationName: event.target.value
                            }))
                          }
                          placeholder="Northwind Revenue Team"
                          required
                        />
                      </label>
                    )}
                  </>
                ) : null}

                <label className={styles.field}>
                  <span>Email</span>
                  <input
                    className={styles.input}
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="team@northwind.com"
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>Password</span>
                  <input
                    className={styles.input}
                    type="password"
                    value={formData.password}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Minimum 10 chars with mixed case and a number"
                    required
                  />
                </label>

                <label className={styles.checkboxRow}>
                  <input
                    checked={formData.acceptTranscriptConsent}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        acceptTranscriptConsent: event.target.checked
                      }))
                    }
                    type="checkbox"
                    required={mode === "register"}
                  />
                  <span>
                    I consent to transcript storage for coaching and session review inside this
                    workspace.{" "}
                    <Link className={styles.inlineLink} href="/privacy">
                      Review privacy and retention
                    </Link>
                    .
                  </span>
                </label>

                {authError ? (
                  <p className={styles.inlineError} role="alert">
                    {authError}
                  </p>
                ) : null}
                {resetMessage ? <p role="status">{resetMessage}</p> : null}

                <button
                  className={styles.primaryButton}
                  disabled={busyAction === "auth"}
                  type="submit"
                >
                  {busyAction === "auth"
                    ? "Working..."
                    : mode === "register"
                      ? inviteOnly
                        ? "Join pilot"
                        : "Create workspace"
                      : "Sign in"}
                </button>
              </form>
              {inviteOnly && mode === "login" ? (
                <div className={styles.resetPanel}>
                  <p>
                    Need a password reset? Contact support using the details on{" "}
                    <Link className={styles.inlineLink} href="/privacy">
                      /privacy
                    </Link>
                    . After verifying your identity, support will provide a reset code.
                  </p>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => {
                      setShowReset((shown) => !shown);
                      setResetError(null);
                    }}
                  >
                    I have a reset code
                  </button>
                  {showReset ? (
                    <form className={styles.form} onSubmit={handleResetSubmit}>
                      <label className={styles.field}>
                        <span>Reset code</span>
                        <input
                          className={styles.input}
                          type="password"
                          value={resetToken}
                          onChange={(event) => setResetToken(event.target.value)}
                          autoComplete="off"
                          required
                        />
                      </label>
                      <label className={styles.field}>
                        <span>New password</span>
                        <input
                          className={styles.input}
                          type="password"
                          value={resetPassword}
                          onChange={(event) => setResetPassword(event.target.value)}
                          autoComplete="new-password"
                          minLength={10}
                          required
                        />
                      </label>
                      {resetError ? (
                        <p className={styles.inlineError} role="alert">
                          {resetError}
                        </p>
                      ) : null}
                      <button
                        className={styles.primaryButton}
                        disabled={busyAction === "reset"}
                        type="submit"
                      >
                        {busyAction === "reset" ? "Updating..." : "Reset password"}
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </main>
    );
  }

  const readyDashboard = viewState.dashboard;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.workspace}>
          <header className={styles.workspaceHeader}>
            <div>
              <div className={styles.brandRow}>
                <div className={styles.brandMark}>ST</div>
                <span className={styles.brandLabel}>Smart Training</span>
              </div>
              <p className={styles.workspaceMeta}>
                {readyDashboard.user.organization.name} • {formatRole(readyDashboard.user.role)}
              </p>
            </div>

            <div className={styles.headerActions}>
              {voiceLabEnabled ? (
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => router.push("/voice-lab")}
                >
                  Voice lab
                </button>
              ) : null}
              <button
                className={styles.secondaryButton}
                disabled={busyAction === "logout"}
                type="button"
                onClick={() => void handleLogout()}
              >
                {busyAction === "logout" ? "Signing out..." : inviteOnly ? "Sign out on all devices" : "Sign out"}
              </button>
              <button
                className={styles.tertiaryButton}
                disabled={busyAction === "delete"}
                type="button"
                onClick={() => void handleDeleteAccount()}
              >
                {busyAction === "delete" ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </header>

          <section className={styles.workspaceHero}>
            <div>
              <span className={styles.eyebrow}>Launch Dashboard</span>
              <h1>Drive one complete practice loop from scenario selection to transcript review.</h1>
              <p>
                Pick a buyer scenario, open an active session, or review past turns. The launch
                path persists transcripts locally for development and supports a shared Postgres
                backend in hosted deployments.
              </p>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <strong>{readyDashboard.scenarios.length}</strong>
                <span>available scenarios</span>
              </div>
              <div className={styles.heroStat}>
                <strong>{activeSessions.length}</strong>
                <span>active sessions</span>
              </div>
              <div className={styles.heroStat}>
                <strong>{readyDashboard.sessions.length}</strong>
                <span>saved transcripts</span>
              </div>
            </div>
          </section>

          <section className={styles.toolbar}>
            <label className={styles.searchField}>
              <span>Search scenarios or sessions</span>
              <input
                className={styles.searchInput}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by buyer, challenge, or transcript preview"
              />
            </label>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.eyebrow}>Scenarios</span>
                <h2>Start a new practice run</h2>
              </div>
            </div>

            <div className={styles.cardGrid}>
              {filteredScenarios.map((scenario) => (
                <article className={styles.scenarioCard} key={scenario.id}>
                  <div className={styles.cardHeader}>
                    <span className={styles.pill}>{scenario.buyerCompany}</span>
                    <span className={styles.mutedLabel}>{scenario.buyerRole}</span>
                  </div>
                  <h3>{scenario.title}</h3>
                  <p>{scenario.description}</p>
                  <dl className={styles.detailGrid}>
                    <div>
                      <dt>Tension</dt>
                      <dd>{scenario.challenge}</dd>
                    </div>
                    <div>
                      <dt>Rep goal</dt>
                      <dd>{scenario.goal}</dd>
                    </div>
                    <div>
                      <dt>Buyer tone</dt>
                      <dd>{scenario.buyerTone}</dd>
                    </div>
                  </dl>
                  <button
                    className={styles.primaryButton}
                    disabled={busyAction === `start:${scenario.id}`}
                    type="button"
                    onClick={() => void handleStartSession(scenario.id)}
                  >
                    {busyAction === `start:${scenario.id}` ? "Starting..." : "Start session"}
                  </button>
                </article>
              ))}

              {filteredScenarios.length === 0 ? (
                <div className={styles.emptyCard}>No scenarios match the current search.</div>
              ) : null}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.eyebrow}>Sessions</span>
                <h2>Continue or review transcripts</h2>
              </div>
            </div>

            <div className={styles.sessionList}>
              {filteredSessions.map((session) => (
                <SessionCard key={session.id} router={router} session={session} />
              ))}

              {filteredSessions.length === 0 ? (
                <div className={styles.emptyCard}>No sessions match the current search.</div>
              ) : null}
            </div>
          </section>

          <footer className={styles.workspaceFooter}>
            <span>Transcript retention defaults to 30 days with immediate account-driven deletion.</span>
            <Link className={styles.inlineLink} href="/privacy">
              Privacy and retention
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}

function SessionCard({
  router,
  session
}: {
  router: ReturnType<typeof useRouter>;
  session: SessionSummary;
}) {
  return (
    <article className={styles.sessionCard}>
      <div className={styles.cardHeader}>
        <span className={styles.pill}>{formatStatus(session.status)}</span>
        <span className={styles.mutedLabel}>
          {session.coachInterventionCount} coach pause
          {session.coachInterventionCount === 1 ? "" : "s"}
        </span>
      </div>

      <h3>{session.scenario.title}</h3>
      <p>{session.latestMessagePreview ?? "Session created and ready for a first seller turn."}</p>

      <div className={styles.sessionMeta}>
        <span>{session.messageCount} messages</span>
        <span>Started {formatTimestamp(session.startedAt)}</span>
        {session.endedAt ? <span>Ended {formatTimestamp(session.endedAt)}</span> : null}
      </div>

      <button
        className={styles.secondaryButton}
        type="button"
        onClick={() => router.push(`/roleplay/${session.id}`)}
      >
        {session.status === "ACTIVE" ? "Resume session" : "Review transcript"}
      </button>
    </article>
  );
}

function formatRole(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function formatStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function matchesSearch(query: string, ...values: string[]): boolean {
  return values.join(" ").toLowerCase().includes(query);
}
