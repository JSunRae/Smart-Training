import Image from "next/image";
import Link from "next/link";

import { EnquiryForm } from "@/components/enquiry-form";
import { MarketingAnalytics } from "@/components/marketing-analytics";
import { readPublicSupportContact } from "@/lib/runtime";

import styles from "./marketing-home.module.css";

export function MarketingHome({ pilotEnabled = false }: { pilotEnabled?: boolean }) {
  const support = readPublicSupportContact();
  const email = support.email || "Jason_C_Rae@Outlook.com";

  return (
    <div className={styles.page} data-use-case="sales-enablement">
      <MarketingAnalytics useCase="sales-enablement" />
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
          <a href="#how-it-works">How it works</a>
          <a href="#who-it-is-for">Who it is for</a>
          <a href="#example">Example</a>
          <a
            className={styles.navCta}
            href="#pilot"
            data-track-event="cta_click"
            data-track-cta="header"
            data-use-case="sales-enablement"
          >
            Discuss a pilot <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>For sales enablement leads and frontline managers</p>
            <h1 id="hero-title">
              Rehearse the conversation
              <br />
              <em>before it matters.</em>
            </h1>
            <p className={styles.lead}>
              Smart Training helps commercial teams practise one difficult buyer conversation,
              pause for guidance, and review what to try next.
            </p>
            <div className={styles.actions}>
              <a
                className={styles.primary}
                href="#pilot"
                data-track-event="cta_click"
                data-track-cta="hero"
                data-use-case="sales-enablement"
              >
                Discuss a focused pilot <span aria-hidden="true">↗</span>
              </a>
              <a className={styles.textLink} href="#example">
                See a practice example <span aria-hidden="true">↓</span>
              </a>
              {pilotEnabled ? (
                <>
                  <Link className={styles.textLink} href="/start">Use an invitation</Link>
                  <Link className={styles.textLink} href="/dashboard">Sign in</Link>
                </>
              ) : null}
            </div>
            <p className={styles.endorsement}>
              A product by <a href="https://jasonrae.ai">JasonRAE.AI</a>
            </p>
          </div>
          <aside className={styles.heroProof} aria-label="What a practice loop includes">
            <div className={styles.proofHeader}>
              <span className={styles.eyebrow}>A useful practice loop</span>
              <span className={styles.number}>TEXT-FIRST / HUMAN REVIEW</span>
            </div>
            <div className={styles.proofRow}>
              <span>01</span>
              <div>
                <strong>Choose the moment</strong>
                <p>Start with the buyer situation or speaking skill that needs attention.</p>
              </div>
            </div>
            <div className={styles.proofRow}>
              <span>02</span>
              <div>
                <strong>Try a response</strong>
                <p>Work through a scenario and pause when another perspective would help.</p>
              </div>
            </div>
            <div className={styles.proofRow}>
              <span>03</span>
              <div>
                <strong>Review what happened</strong>
                <p>Bring the transcript to a manager, coach, or facilitator for reflection.</p>
              </div>
            </div>
          </aside>
        </section>

        <section className={styles.exampleSection} id="example" aria-labelledby="example-title">
          <div className={styles.exampleCopy}>
            <p className={styles.eyebrow}>An illustrative practice moment</p>
            <h2 id="example-title">When the buyer says, “It costs too much.”</h2>
            <p>
              Practise the useful pause before defending the price. The aim is to understand what the
              buyer is comparing the investment with and what would make it worthwhile.
            </p>
            <p className={styles.caption}>
              Fictional dialogue, written for this example. It is not a customer transcript or a
              performance claim.
            </p>
          </div>
          <div className={styles.example}>
            <div className={styles.exampleTop}>
              <span className={styles.eyebrow}>Pricing objection</span>
              <span className={styles.number}>01 / PRACTISE</span>
            </div>
            <div className={styles.buyer}>
              <span className={styles.speaker}>Buyer</span>
              <p>“We like the idea, but your price is higher than we expected.”</p>
            </div>
            <div className={styles.coach}>
              <span className={styles.speaker}>Pause for thought</span>
              <p>Before defending the price, find out what the buyer is comparing it with.</p>
            </div>
            <details
              className={styles.response}
              data-track-event="example_expand"
              data-example="pricing-objection"
            >
              <summary>
                Explore a question to try <span aria-hidden="true">+</span>
              </summary>
              <p>“What are you comparing the investment with, and which result would make it worthwhile?”</p>
            </details>
          </div>
        </section>

        <section className={styles.process} id="how-it-works" aria-labelledby="process-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>From rehearsal to reflection</p>
            <h2 id="process-title">One conversation. One useful behaviour to work on.</h2>
            <p>
              Use a short, bounded exercise to make practice discussable before you need the skill
              in a live setting.
            </p>
          </div>
          <div className={styles.steps}>
            <article>
              <span className={styles.stepNumber}>01</span>
              <h3>Choose a situation</h3>
              <p>Start with a buyer conversation or speaking moment that gives the practice a clear focus.</p>
            </article>
            <article>
              <span className={styles.stepNumber}>02</span>
              <h3>Try a response</h3>
              <p>Work through a text scenario, with a pause for guidance when you want another perspective.</p>
            </article>
            <article>
              <span className={styles.stepNumber}>03</span>
              <h3>Review and repeat</h3>
              <p>Revisit the transcript with a human reviewer and decide what to try in the next attempt.</p>
            </article>
          </div>
        </section>

        <section className={styles.audience} id="who-it-is-for" aria-labelledby="audience-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>The same rehearsal pattern, different moments</p>
            <h2 id="audience-title">Start with the conversation your people need to handle better.</h2>
            <p>
              Sales is the first focused use case. The same practice-and-review approach can be
              scoped around other facilitated speaking skills.
            </p>
          </div>
          <div className={styles.audienceGrid}>
            <Link className={styles.audienceCard} href="/use-cases/sales-enablement">
              <span>01 / Primary use case</span>
              <h3>Sales enablement and managers</h3>
              <p>Practise objections, discovery, value framing, and proportionate next steps.</p>
              <strong>Explore this use case ↗</strong>
            </Link>
            <Link className={styles.audienceCard} href="/use-cases/train-the-trainer">
              <span>02 / Facilitated practice</span>
              <h3>Train-the-trainer and facilitators</h3>
              <p>Rehearse how to introduce a difficult exercise, handle resistance, and debrief clearly.</p>
              <strong>Explore this use case ↗</strong>
            </Link>
            <Link className={styles.audienceCard} href="/use-cases/consultants-and-teachers">
              <span>03 / Speaking skills</span>
              <h3>Consultants, teachers, and educators</h3>
              <p>Explore practice around explanation, questioning, feedback, and difficult dialogue.</p>
              <strong>Explore this use case ↗</strong>
            </Link>
          </div>
        </section>

        <section className={styles.productProof} aria-labelledby="product-proof-title">
          <div className={styles.productImageWrap}>
            <Image
              src="/product-scenario-selection.jpg"
              alt="Synthetic Smart Training dashboard showing scenario selection and transcript review"
              width={1290}
              height={1932}
              sizes="(max-width: 760px) 100vw, 50vw"
            />
          </div>
          <div className={styles.productProofCopy}>
            <p className={styles.eyebrow}>What exists today</p>
            <h2 id="product-proof-title">A visible attempt is more useful than a completion tick.</h2>
            <p>
              The current product supports a text-first practice flow: choose a scenario, exchange
              turns, pause for coaching, and revisit the transcript.
            </p>
            <ul className={styles.checkList}>
              <li>Synthetic examples for early evaluation</li>
              <li>Human review remains part of the proposed pilot</li>
              <li>No claim of automatic scoring or revenue uplift</li>
            </ul>
            <p className={styles.caption}>Synthetic product capture. No customer data shown.</p>
          </div>
        </section>

        <section className={styles.pilot} id="pilot" aria-labelledby="pilot-title">
          <div>
            <p className={styles.eyebrow}>Start with a focused pilot conversation</p>
            <h2 id="pilot-title">What does your team need to practise?</h2>
            <p>
              Tell us about one recurring challenge, the people involved, and how you would decide
              whether the rehearsal is useful.
            </p>
            <p className={styles.boundaryNote}>
              No price, outcome guarantee, or open product access is assumed. Scope and access are
              agreed individually.
            </p>
            <p className={styles.emailNote}>
              Prefer email? <a href={`mailto:${email}`}>{email}</a>
            </p>
          </div>
          <EnquiryForm sourcePage="/" useCase="sales-enablement" />
        </section>

        <section className={styles.brief} aria-labelledby="brief-title">
          <div>
            <p className={styles.eyebrow}>A practical next step</p>
            <h2 id="brief-title">Read the one-page pilot brief.</h2>
          </div>
          <div>
            <p>
              See the proposed evaluation design, human review role, evidence boundaries, and the
              questions to settle before inviting a team.
            </p>
            <Link
              className={styles.textLink}
              href="/pilot-brief"
              data-track-event="brief_download"
              data-brief-format="web"
            >
              Open the pilot brief <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>

        <section className={styles.faq} aria-labelledby="faq-title">
          <div>
            <p className={styles.eyebrow}>A few useful details</p>
            <h2 id="faq-title">Before you begin.</h2>
          </div>
          <div className={styles.questions}>
            <details>
              <summary>What can I try today?</summary>
              <p>
                We can walk you through the text practice workflow and discuss a suitable pilot. Contact us to arrange a demonstration and confirm access.
              </p>
            </details>
            <details>
              <summary>Is this an AI voice coach?</summary>
              <p>
                The current pilot is text based, with scripted buyer and coaching responses by default. Optional AI text generation and experimental voice features are outside the standard pilot.
              </p>
            </details>
            <details>
              <summary>Can this be used beyond sales?</summary>
              <p>
                The public example is sales-led, but the rehearsal pattern can be scoped around other speaking skills such as facilitation, consulting, teaching, and feedback. The relevant scenario and review method are agreed before a pilot.
              </p>
            </details>
            <details>
              <summary>How are practice conversations handled?</summary>
              <p>
                Transcripts support session review. The pilot has a default 30-day retention window for completed or abandoned sessions, plus account deletion controls. Read the <Link href="/privacy">privacy information</Link> and use fictional customer details during evaluation.
              </p>
            </details>
          </div>
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
          <a href={`mailto:${email}`}>Contact</a>
          <a href="https://jasonrae.ai">Visit JasonRAE.AI <span aria-hidden="true">↗</span></a>
        </div>
      </footer>
    </div>
  );
}
