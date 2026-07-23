import type { AgentModelId } from "./models";

export type AgentInteractionMode = "talk" | "chat";

export type ExpertTone =
  | "professional"
  | "direct"
  | "friendly"
  | "analytical"
  | "encouraging";

export type Agent = {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  isCustom: boolean;
  model: AgentModelId;
  interactionMode: AgentInteractionMode;
  emoji?: string;
  tone?: ExpertTone;
};

export type Source = {
  title: string;
  uri: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentId?: string;
  agentName?: string;
  createdAt: string;
  sources?: Source[];
  usedSearch?: boolean;
  mode?: "chat" | "research";
  model?: AgentModelId;
};

export type MeetingMemory = {
  goal: string;
  decisions: string[];
  openQuestions: string[];
  summary: string;
};
