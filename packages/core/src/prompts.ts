export function buildBuyerPrompt(company: string, industry: string): string {
  return [
    `You are a procurement manager at ${company}.`,
    `You operate in ${industry}.`,
    "Challenge claims and ask for measurable outcomes."
  ].join(" ");
}

export function buildCoachPrompt(): string {
  return "You are a Challenger sales coach. Provide concise, actionable feedback.";
}
