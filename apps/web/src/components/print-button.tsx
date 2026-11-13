"use client";

import styles from "./print-button.module.css";

import { trackMarketingEvent } from "@/lib/marketing-analytics";

export function PrintButton() {
  return (
    <button
      className={styles.print}
      type="button"
      onClick={() => {
        trackMarketingEvent("brief_download", { format: "print" });
        window.print();
      }}
    >
      Print or save as PDF
    </button>
  );
}
