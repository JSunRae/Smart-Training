"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { trackMarketingEvent } from "@/lib/marketing-analytics";

import styles from "./enquiry-form.module.css";

const enquiryEndpoint = process.env.NEXT_PUBLIC_ENQUIRY_FORM_ENDPOINT?.trim() || "/__forms.html";
const isNetlifyForm = enquiryEndpoint === "/__forms.html";

type EnquiryFormProps = {
  sourcePage: string;
  sourceCta?: string;
  useCase?: string;
  compact?: boolean;
};

export function EnquiryForm({
  sourcePage,
  sourceCta = "Discuss a focused pilot",
  useCase = "sales-enablement",
  compact = false
}: EnquiryFormProps) {
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const enquiryStarted = useRef(false);
  const formId = sourcePage.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    trackMarketingEvent("enquiry_submit", { source_page: sourcePage, use_case: useCase });

    setState("submitting");
    try {
      const encodedData = new URLSearchParams();
      for (const [key, value] of formData.entries()) {
        encodedData.append(key, typeof value === "string" ? value : value.name);
      }
      const response = await fetch(enquiryEndpoint, {
        method: "POST",
        headers: isNetlifyForm
          ? {
              Accept: "application/json",
              "Content-Type": "application/x-www-form-urlencoded"
            }
          : { Accept: "application/json" },
        body: isNetlifyForm ? encodedData.toString() : formData
      });

      if (!response.ok) throw new Error("Enquiry submission failed.");
      trackMarketingEvent("enquiry_success", { source_page: sourcePage, use_case: useCase });
      form.reset();
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className={styles.confirmation} role="status">
        <span className={styles.confirmationMark} aria-hidden="true">
          ✓
        </span>
        <div>
          <h3>Thanks — your enquiry is through.</h3>
          <p>
            We’ll review the practice need you described and reply with the most useful next step.
            This is a conversation about fit, not a commitment to buy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      className={`${styles.form} ${compact ? styles.compact : ""}`}
      action={enquiryEndpoint}
      name="smart-training-enquiry"
      method="post"
      data-netlify="true"
      netlify-honeypot="website"
      encType="application/x-www-form-urlencoded"
      onSubmit={handleSubmit}
      onFocus={() => {
        if (enquiryStarted.current) return;
        enquiryStarted.current = true;
        trackMarketingEvent("enquiry_start", { source_page: sourcePage, use_case: useCase });
      }}
    >
      <input type="hidden" name="form-name" value="smart-training-enquiry" />
      <input type="hidden" name="source_page" value={sourcePage} />
      <input type="hidden" name="source_cta" value={sourceCta} />
      <input type="hidden" name="use_case" value={useCase} />
      <input type="hidden" name="consent_version" value="website-enquiry-response-v1" />
      <noscript>
        <p className={styles.noScript}>
          JavaScript is off, so use the visible email fallback instead: {" "}
          <a href="mailto:Jason_C_Rae@Outlook.com">Jason_C_Rae@Outlook.com</a>
        </p>
      </noscript>
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor={`${formId}-website`}>Leave this blank</label>
        <input id={`${formId}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={styles.fieldGrid}>
        <label>
          <span>Name</span>
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          <span>Work email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          <span>Organisation</span>
          <input name="organisation" autoComplete="organization" required />
        </label>
        <label>
          <span>Your role</span>
          <input name="role" autoComplete="organization-title" required />
        </label>
      </div>

      <label>
        <span>What would you like to practise?</span>
        <select name="practice_focus" defaultValue="" required>
          <option value="" disabled>
            Choose the closest fit
          </option>
          <option value="sales-conversation">A sales conversation or objection</option>
          <option value="facilitation">Facilitation or train-the-trainer</option>
          <option value="consulting">Consulting or advisory conversations</option>
          <option value="teaching">Teaching, coaching, or classroom dialogue</option>
          <option value="other-speaking-skill">Another speaking skill</option>
        </select>
      </label>

      <label>
        <span>Tell us about the conversation or skill</span>
        <textarea
          name="practice_focus_detail"
          rows={3}
          required
          placeholder="For example: handling price pressure, leading a difficult workshop, or giving clearer feedback."
        />
      </label>

      <label>
        <span>How do you handle this today?</span>
        <textarea
          name="current_approach"
          rows={3}
          required
          placeholder="A short description of the current training, coaching, or workaround is enough."
        />
      </label>

      <label>
        <span>What would be most useful next?</span>
        <select name="next_step" defaultValue="focused-pilot" required>
          <option value="focused-pilot">Discuss a focused pilot</option>
          <option value="walkthrough">Arrange a short walkthrough</option>
          <option value="fit-question">Ask a fit question first</option>
        </select>
      </label>

      <label className={styles.consent}>
        <input type="checkbox" name="enquiry_acknowledgement" value="accepted" required />
        <span>
          I agree that Smart Training may use these details to respond to this enquiry. Read the{" "}
          <Link href="/privacy">privacy notes</Link>.
        </span>
      </label>

      <div className={styles.formFooter}>
        <div>
          <button className={styles.submit} type="submit" disabled={state === "submitting"}>
            {state === "submitting" ? "Sending…" : "Send enquiry"}
            <span aria-hidden="true">↗</span>
          </button>
          <p className={styles.formNote}>
            Please use fictional examples rather than confidential customer or employee details.
          </p>
        </div>
        {state === "error" ? (
          <p className={styles.formError} role="alert">
            We couldn’t submit the form. Please email{" "}
            <a href="mailto:Jason_C_Rae@Outlook.com">Jason_C_Rae@Outlook.com</a> instead, or try
            again.
          </p>
        ) : null}
      </div>
    </form>
  );
}
