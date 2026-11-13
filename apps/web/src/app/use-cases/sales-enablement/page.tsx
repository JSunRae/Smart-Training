import type { Metadata } from "next";

import { MarketingAnalytics } from "@/components/marketing-analytics";
import { UseCasePage, type UseCasePageData } from "@/components/use-case-page";

const data: UseCasePageData = {
  slug: "sales-enablement",
  eyebrow: "Sales enablement and frontline managers",
  title: "Practise the buyer conversation before it reaches live pipeline.",
  lead:
    "Use a bounded rehearsal to explore objection handling, discovery, value framing, and the next question a seller should ask.",
  audience: "Sales enablement leads, frontline managers, and commercial leaders.",
  tension: "When a seller hears, “Your price is too high.”",
  example:
    "Practise the pause before defending the price: understand the comparison, consequence, and decision step the buyer actually has in mind.",
  behaviours: [
    "Ask one useful clarifying question",
    "Connect the issue to a buyer-relevant consequence without inventing facts",
    "Respond to the actual concern rather than repeating the pitch",
    "Agree a proportionate next step with an owner and timing"
  ],
  notAClaim: "This is not a promise of improved win rates or automatic team scoring."
};

export const metadata: Metadata = {
  title: "Sales enablement conversation practice | Smart Training",
  description:
    "Practise difficult buyer conversations with a text-first rehearsal and human review approach for sales enablement teams.",
  alternates: { canonical: "https://training.jasonrae.ai/use-cases/sales-enablement" }
};

export default function SalesEnablementPage() {
  return (
    <>
      <MarketingAnalytics useCase={data.slug} />
      <UseCasePage data={data} />
    </>
  );
}
