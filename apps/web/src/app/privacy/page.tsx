import type { Metadata } from "next";
import Link from "next/link";

import { readPublicSupportContact } from "@/lib/runtime";

import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy and Retention | Smart Training",
  description: "Customer-facing privacy, retention, and deletion notes for Smart Training."
};

const SECTIONS = [
  {
    title: "What we store",
    body:
      "Smart Training stores account details, organization membership, scenario selections, and roleplay transcripts so teams can review coaching sessions and resume practice."
  },
  {
    title: "Retention window",
    body:
      "Completed or abandoned transcript history defaults to a 30-day retention window. Deployments can shorten that window, but the launch posture does not retain non-active transcripts longer than 30 days by default. Active sessions are not pruned until they end."
  },
  {
    title: "Deletion controls",
    body:
      "Deleting an account removes the signed-in user immediately, clears the current session, and deletes that account's stored sessions and transcript messages right away. If that account is the last member of an organization, org-owned custom scenarios and documents are removed with it. Consent for transcript capture is collected during registration and can be refreshed during login if missing."
  },
  {
    title: "Third-party processing",
    body:
      "The default launch workflow runs without third-party model processing. If a deployment enables OpenAI-powered text or voice features, transcript turns sent to OpenAI are processed under that deployment account and regional settings."
  }
];

export default function PrivacyPage() {
  const support = readPublicSupportContact();

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>Privacy and Retention</span>
          <h1>Launch policy for transcripts, deletion, and optional AI processing.</h1>
          <p>
            This page is the customer-facing summary for the current Smart Training MVP launch
            posture.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryLink} href="/">
              Back to workspace
            </Link>
          </div>
        </header>

        <section className={styles.grid}>
          {SECTIONS.map((section) => (
            <article className={styles.card} key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </section>

        <section className={styles.note}>
          <h2>Support and privacy requests</h2>
          {support.email || support.url ? (
            <div className={styles.supportList}>
              <p>
                Contact the deployment operator for privacy, deletion, or pilot-support requests.
              </p>
              {support.email ? (
                <p>
                  <strong>{support.name} email:</strong>{" "}
                  <a className={styles.inlineLink} href={`mailto:${support.email}`}>
                    {support.email}
                  </a>
                </p>
              ) : null}
              {support.url ? (
                <p>
                  <strong>Support portal:</strong>{" "}
                  <a
                    className={styles.inlineLink}
                    href={support.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {support.url}
                  </a>
                </p>
              ) : null}
            </div>
          ) : (
            <p>
              This deployment has not configured a public support contact yet. {support.requirement}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
