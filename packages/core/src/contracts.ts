export type UserRole = "ADMIN" | "TRAINER" | "SELLER";
export type SessionStatus = "ACTIVE" | "COMPLETED" | "ABANDONED";
export type MessageRole = "SYSTEM" | "USER" | "ASSISTANT" | "COACH";

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  transcriptConsentAt: string | null;
  organization: OrganizationSummary;
};

export type ScenarioSummary = {
  id: string;
  key: string;
  title: string;
  description: string;
  buyerCompany: string;
  buyerRole: string;
  buyerTone: string;
  challenge: string;
  goal: string;
};

export type SessionMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};

export type SessionSummary = {
  id: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  coachInterventionCount: number;
  messageCount: number;
  latestMessagePreview: string | null;
  scenario: ScenarioSummary;
};

export type SessionDetail = SessionSummary & {
  messages: SessionMessage[];
  contextSnippets: string[];
  nextRecommendedAction: string;
};

export type AuthResponse = {
  user: AuthUser;
};

export type DashboardResponse = {
  user: AuthUser;
  scenarios: ScenarioSummary[];
  sessions: SessionSummary[];
};

export type ScenariosResponse = {
  scenarios: ScenarioSummary[];
};

export type SessionsResponse = {
  sessions: SessionSummary[];
};

export type SessionResponse = {
  session: SessionDetail;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
  organizationName?: string;
  invitationToken?: string;
  acceptTranscriptConsent: boolean;
};

export type LoginRequest = {
  email: string;
  password: string;
  acceptTranscriptConsent?: boolean;
};

export type ResetPasswordRequest = {
  resetToken: string;
  password: string;
};

export type StartSessionRequest = {
  scenarioId: string;
};

export type MessageRequest = {
  content: string;
};

export type MessageResponse = {
  session: SessionDetail;
  reply: SessionMessage;
};

export type CoachResponse = {
  session: SessionDetail;
  reply: SessionMessage;
};

export type RealtimeCallRequest = {
  scenarioId: string;
  sdp: string;
};

export type RealtimeCallResponse = {
  answerSdp: string;
  callId: null | string;
};

export type HealthResponse = {
  status: "ok";
  storageBackend: "file" | "postgres";
  openAiApiConfigured: boolean;
  openAiTextEnabled: boolean;
  voiceLabEnabled: boolean;
};

export type ApiError = {
  error: string;
};
