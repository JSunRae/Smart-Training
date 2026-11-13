import Link from "next/link";

import { EnquiryForm } from "@/components/enquiry-form";

import styles from "./use-case-page.module.css";

export type UseCasePageData = {
  slug: string;
  eyebrow: string;
  title: string;
  lead: string;
  audience: string;
  tension: string;
  example: string;
  behaviours: string[];
  notAClaim: string;
};

export function UseCasePage({ data }: { data: UseCasePageData }) {
  return (
    <div className={styles.page} data-use-case={data.slug}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Smart Training home">
          <span className={styles.mark} aria-hidden="true">
            st
          </span>
          <span>
            Smart Training<small>Sales conversation practice</small>
          </span>
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#who-it-is-for">Who it is for</Link>
          <Link className={styles.navCta} href="#enquiry" data-track-event="cta_click" data-track-cta="use-case-header" data-use-case={data.slug}>
            Discuss a pilot <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="page-title">
          <div>
            <p className={styles.eyebrow}>{data.eyebrow}</p>
            <h1 id="page-title">{data.title}</h1>
            <p className={styles.audience}>{data.audience}</p>
            <p className={styles.lead}>{data.lead}</p>
            <div className={styles.actions}>
              <Link
                className={styles.primary}
                href="#enquiry"
                data-track-event="cta_click"
                data-track-cta="use-case-hero"
                data-use-case={data.slug}
              >
                Discuss a focused pilot <span aria-hidden="true">↗</span>
              </Link>
              <Link className={styles.textLink} href="/">
                Back to Smart Training <span aria-hidden="true">←</span>
              </Link>
            </div>
          </div>
          <aside className={styles.heroCard} aria-label="Practice focus">
            <span className={styles.cardLabel}>A useful starting point</span>
            <h2>{data.tension}</h2>
            <p>{data.example}</p>
            <span className={styles.cardCaption}>Illustrative practice brief, not a customer claim.</span>
          </aside>
        </section>

        <section className={styles.section} aria-labelledby="workflow-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>A focused rehearsal loop</p>
            <h2 id="workflow-title">Turn a difficult moment into something you can practise.</h2>
          </div>
          <div className={styles.workflow}>
            <article>
              <span>01</span>
              <h3>Agree the moment</h3>
              <p>Choose one conversation, audience, or speaking behaviour that matters now.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Try a response</h3>
              <p>Work through a text-first scenario and pause when another perspective would help.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Review the attempt</h3>
              <p>Bring the transcript to a human review conversation and decide what to try next.</p>
            </article>
          </div>
        </section>

        <section className={styles.behaviours} aria-labelledby="behaviours-title">
          <div>
            <p className={styles.eyebrow}>What a pilot can explore</p>
            <h2 id="behaviours-title">Agree the behaviour before you judge the tool.</h2>
            <p>
              A small evaluation should test whether the rehearsal is useful for your context. It
              should not pretend to prove revenue impact, teaching quality, or universal speaking
              improvement.
            </p>
          </div>
          <ul>
            {data.behaviours.map((behaviour) => (
              <li key={behaviour}>{behaviour}</li>
            ))}
          </ul>
        </section>

        <section className={styles.boundary} aria-labelledby="boundary-title">
          <p className={styles.eyebrow}>A clear boundary</p>
          <h2 id="boundary-title">{data.notAClaim}</h2>
          <p>
            The current public posture is text-first, deterministic by default, and supported by
            human review. Any custom scenario, wider content library, or different evaluation design
            is agreed as part of the conversation.
          </p>
        </section>

        <section className={styles.enquiry} id="enquiry" aria-labelledby="enquiry-title">
          <div>
            <p className={styles.eyebrow}>Start with the specific problem</p>
            <h2 id="enquiry-title">Tell us what needs practising.</h2>
            <p>
              A few details help us decide whether a focused pilot is useful. Fictional examples are
              welcome; please do not include confidential customer or employee information.
            </p>
            <p className={styles.emailNote}>
              Prefer email? <a href="mailto:Jason_C_Rae@Outlook.com">Jason_C_Rae@Outlook.com</a>
            </p>
          </div>
          <EnquiryForm sourcePage={`/use-cases/${data.slug}`} useCase={data.slug} />
        </section>
      </main>
      <footer className={styles.footer}>
        <div>
          <strong>Smart Training</strong>
          <p>Sales conversation practice by <a href="https://jasonrae.ai">JasonRAE.AI</a></p>
        </div>
        <div className={styles.footerLinks}>
          <Link href="/pilot-brief">Pilot brief</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/">Home</Link>
        </div>
      </footer>
    </div>
  );
}
