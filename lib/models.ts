export type AgentModelId =
  | "gpt-4o"
  | "claude-3-5-sonnet"
  | "gemini-1.5-pro"
  | "gemini-2.0-flash";

export type AgentModelOption = {
  id: AgentModelId;
  label: string;
  provider: "openai" | "anthropic" | "google";
  apiModel: string;
};

export const AGENT_MODELS: AgentModelOption[] = [
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "openai",
    apiModel: "gpt-4o",
  },
  {
    id: "claude-3-5-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "anthropic",
    apiModel: "claude-3-5-sonnet-20241022",
  },
  {
    id: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    provider: "google",
    // Pro models have no free quota on this account; use the strongest working flash model.
    apiModel: "gemini-3.5-flash",
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    provider: "google",
    // gemini-2.0-flash has zero free-tier quota for new accounts; use the latest flash alias.
    apiModel: "gemini-flash-latest",
  },
];

export const DEFAULT_AGENT_MODEL: AgentModelId = "gemini-2.0-flash";

export function getModelOption(id: string | undefined): AgentModelOption {
  return (
    AGENT_MODELS.find((model) => model.id === id) ??
    AGENT_MODELS.find((model) => model.id === DEFAULT_AGENT_MODEL)!
  );
}

export function getModelLabel(id: string | undefined): string {
  return getModelOption(id).label;
}
