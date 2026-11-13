import type { Metadata } from "next";

import { MarketingAnalytics } from "@/components/marketing-analytics";
import { UseCasePage, type UseCasePageData } from "@/components/use-case-page";

const data: UseCasePageData = {
  slug: "consultants-and-teachers",
  eyebrow: "Consultants, teachers, and educators",
  title: "Practise explaining, questioning, and responding when the room pushes back.",
  lead:
    "Explore a focused speaking skill: making a complex idea clearer, asking a better question, giving feedback, or handling a difficult dialogue.",
  audience: "Consultants, teachers, coaches, educators, and subject-matter experts.",
  tension: "When someone says, “I still do not understand why this matters.”",
  example:
    "Practise moving from more explanation to a useful question that reveals what the person needs to understand next.",
  behaviours: [
    "Explain the idea in language suited to the person in front of you",
    "Ask a question that surfaces the real point of confusion",
    "Respond to challenge without becoming defensive or vague",
    "End with a clear check for understanding or next action"
  ],
  notAClaim: "This is not an automated assessment of teaching quality or professional competence."
};

export const metadata: Metadata = {
  title: "Speaking-skill practice for consultants and teachers | Smart Training",
  description:
    "Practise explanation, questioning, feedback, and difficult dialogue with a focused Smart Training rehearsal.",
  alternates: { canonical: "https://training.jasonrae.ai/use-cases/consultants-and-teachers" }
};

export default function ConsultantsAndTeachersPage() {
  return (
    <>
      <MarketingAnalytics useCase={data.slug} />
      <UseCasePage data={data} />
    </>
  );
}
