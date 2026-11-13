import type { Metadata } from "next";
import Link from "next/link";

import { MarketingAnalytics } from "@/components/marketing-analytics";
import { PrintButton } from "@/components/print-button";

import styles from "./pilot-brief.module.css";

export const metadata: Metadata = {
  title: "Smart Training pilot brief",
  description:
    "A one-page outline for evaluating focused speaking practice with agreed behaviours and human review.",
  alternates: { canonical: "https://training.jasonrae.ai/pilot-brief" }
};

export default function PilotBriefPage() {
  return (
    <div className={styles.page}>
      <MarketingAnalytics />
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Smart Training home">
          <span className={styles.mark} aria-hidden="true">st</span>
          <span>Smart Training<small>Sales conversation practice</small></span>
        </Link>
        <Link className={styles.back} href="/">Back to home</Link>
      </header>
      <main className={styles.brief}>
        <p className={styles.eyebrow}>Working proposal</p>
        <h1>One difficult conversation. Four practice rounds. A clear decision about what to do next.</h1>
        <p className={styles.intro}>
          This brief describes a small evaluation of a text-first rehearsal and review workflow. It
          is a planning aid, not a proven programme or revenue guarantee.
        </p>

        <div className={styles.grid}>
          <section>
            <span className={styles.number}>01</span>
            <h2>Choose one conversation family</h2>
            <p>
              Agree the buyer, participant, or speaking situation that matters now. Use fictional
              inputs during early evaluation and keep the scope narrow enough to review honestly.
            </p>
          </section>
          <section>
            <span className={styles.number}>02</span>
            <h2>Agree the behaviours</h2>
            <p>
              Decide what a useful response would include before practice starts: a clarifying
              question, relevant explanation, response to the real concern, and a proportionate next step.
            </p>
          </section>
          <section>
            <span className={styles.number}>03</span>
            <h2>Practise and review</h2>
            <p>
              Run a baseline, two coached attempts, and a final comparable scenario. A human
              reviewer discusses the transcript and records what the participant will try next.
            </p>
          </section>
          <section>
            <span className={styles.number}>04</span>
            <h2>Make a stop/go decision</h2>
            <p>
              Review participation, effort, reviewer usefulness, and specific response changes. A
              positive result supports another evaluation or purchase discussion; it does not prove revenue impact.
            </p>
          </section>
        </div>

        <section className={styles.boundary}>
          <h2>What this pilot does not establish</h2>
          <ul>
            <li>It does not prove causal revenue uplift or improved win rates.</li>
            <li>It does not replace manager judgement, facilitation, or subject expertise.</li>
            <li>It does not require uploading real customer calls or confidential employee data.</li>
            <li>It does not assume public access, pricing, or a long-term subscription.</li>
          </ul>
        </section>

        <div className={styles.actions}>
          <Link className={styles.primary} href="/#pilot" data-track-event="cta_click" data-track-cta="pilot-brief">
            Discuss a focused pilot <span aria-hidden="true">↗</span>
          </Link>
          <a
            className={styles.secondary}
            href="/pilot-brief.txt"
            download
            data-track-event="brief_download"
            data-brief-format="txt"
          >
            Download this brief <span aria-hidden="true">↓</span>
          </a>
          <PrintButton />
        </div>
      </main>
      <footer className={styles.footer}>
        <span>Smart Training by JasonRAE.AI</span>
        <Link href="/privacy">Privacy</Link>
      </footer>
    </div>
  );
}
