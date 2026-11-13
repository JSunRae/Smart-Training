import type { Metadata } from "next";

import { MarketingAnalytics } from "@/components/marketing-analytics";
import { UseCasePage, type UseCasePageData } from "@/components/use-case-page";

const data: UseCasePageData = {
  slug: "train-the-trainer",
  eyebrow: "Train-the-trainer and facilitators",
  title: "Rehearse the moment a learning session becomes difficult.",
  lead:
    "Prepare facilitators for resistance, unclear answers, awkward pauses, and the debrief that helps a group make sense of what happened.",
  audience: "Internal trainers, facilitators, enablement teams, and programme leads.",
  tension: "When a participant says, “This is not how the work really happens.”",
  example:
    "Practise acknowledging the challenge, asking for a concrete example, and bringing the group back to a useful learning question.",
  behaviours: [
    "Invite a specific example instead of defending the exercise",
    "Separate a useful challenge from a request to abandon the learning goal",
    "Keep the room engaged when the answer is not yet clear",
    "Close the exchange with a question the group can work on"
  ],
  notAClaim: "This is not a replacement for facilitator observation, rehearsal, or subject expertise."
};

export const metadata: Metadata = {
  title: "Train-the-trainer practice | Smart Training",
  description:
    "Rehearse difficult facilitation moments, participant resistance, and learning debriefs with Smart Training.",
  alternates: { canonical: "https://training.jasonrae.ai/use-cases/train-the-trainer" }
};

export default function TrainTheTrainerPage() {
  return (
    <>
      <MarketingAnalytics useCase={data.slug} />
      <UseCasePage data={data} />
    </>
  );
}
