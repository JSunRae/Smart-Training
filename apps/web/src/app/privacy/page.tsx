import type { Metadata } from "next";
import Link from "next/link";

import { readPublicSupportContact } from "@/lib/runtime";
import { readSiteMode } from "@/lib/site-mode";

import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy and Retention | Smart Training",
  alternates: { canonical: "https://training.jasonrae.ai/privacy" },
  description: "Customer-facing privacy, retention, and deletion notes for Smart Training."
};

const SECTIONS = [
  {
    title: "What we store",
    body: "Smart Training stores account details, organization membership, scenario selections, and roleplay transcripts so teams can review coaching sessions and resume practice."
  },
  {
    title: "Retention window",
    body: "Completed or abandoned transcript history defaults to a 30-day retention window. Deployments can shorten that window, but the launch posture does not retain non-active transcripts longer than 30 days by default. Active sessions are not pruned until they end."
  },
  {
    title: "Deletion controls",
    body: "Deleting an account removes the signed-in user immediately, clears the current session, and deletes that account's stored sessions and transcript messages right away. If that account is the last member of an organization, org-owned custom scenarios and documents are removed with it. Consent for transcript capture is collected during registration and can be refreshed during login if missing."
  },
  {
    title: "Third-party processing",
    body: "The default launch workflow runs without third-party model processing. If a deployment enables OpenAI-powered text or voice features, transcript turns sent to OpenAI are processed under that deployment account and regional settings."
  }
];

export default function PrivacyPage() {
  const support = readPublicSupportContact();
  const marketing = readSiteMode() === "marketing";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>Privacy and Retention</span>
          <h1>
            {marketing
              ? "Website enquiries and training privacy."
              : "Launch policy for transcripts, deletion, and optional AI processing."}
          </h1>
          <p>
            {marketing
              ? "This website introduces Smart Training. Training accounts and sessions are not enabled on this deployment. The training policy below describes the proposed pilot."
              : "This page is the customer-facing summary for the current Smart Training MVP launch posture."}
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryLink} href="/">
              {marketing ? "Back to Smart Training" : "Back to workspace"}
            </Link>
          </div>
        </header>

        <section className={styles.grid}>
          {marketing ? (
            <article className={styles.card}>
              <h2>Website enquiries</h2>
              <p>
                This site has no newsletter form. The enquiry form asks for your name, work email,
                organisation, role, practice focus, current approach, and desired next step so we
                can assess whether a focused pilot conversation is useful. When configured, form
                submissions are handled by the approved external form processor; if no endpoint is
                configured, the form opens an email draft instead. Messages you send are handled
                through our business email provider to respond to your enquiry. The website hosting
                provider may process technical request information to deliver and secure the site.
                Before submission, the form asks you to acknowledge that these details may be used
                to respond to the enquiry. The acknowledgement and its version are sent with the
                enquiry for record keeping; this is not a newsletter subscription.
                The site may emit non-personal interaction events such as CTA clicks and form
                completion to an analytics provider when one is configured; form contents are not
                sent as analytics events. Contact us below with a privacy or deletion request. Avoid
                sending confidential customer data.
              </p>
            </article>
          ) : null}
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
