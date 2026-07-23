import { DEFAULT_AGENT_MODEL } from "./models";
import type { Agent, ExpertTone } from "./types";

export const CUSTOM_EXPERTS_STORAGE_KEY = "thinkroom-custom-experts";

export const EXPERT_TONES: Array<{ id: ExpertTone; label: string }> = [
  { id: "professional", label: "Professional" },
  { id: "direct", label: "Direct" },
  { id: "friendly", label: "Friendly" },
  { id: "analytical", label: "Analytical" },
  { id: "encouraging", label: "Encouraging" },
];

export const EXPERT_EMOJI_OPTIONS = [
  "🧠",
  "💡",
  "⚙️",
  "📐",
  "⚖️",
  "📈",
  "🩺",
  "🎯",
  "✍️",
  "🔬",
  "🧭",
  "💬",
  "🛠️",
  "📚",
  "🎨",
  "🚀",
] as const;

const TONE_GUIDANCE: Record<ExpertTone, string> = {
  professional:
    "Communicate in a polished, credible, businesslike tone. Avoid slang.",
  direct:
    "Be concise and candid. Lead with the answer, then support it briefly.",
  friendly:
    "Be warm and approachable while remaining useful and clear.",
  analytical:
    "Prioritize structured reasoning, trade-offs, and evidence-based conclusions.",
  encouraging:
    "Be supportive and motivating, while still giving practical next steps.",
};

export function toneLabel(tone: ExpertTone | undefined) {
  return EXPERT_TONES.find((item) => item.id === tone)?.label ?? "Professional";
}

export function buildCustomSystemPrompt(options: {
  name: string;
  description: string;
  tone?: ExpertTone;
}) {
  const tone = options.tone ?? "professional";
  const description = options.description.trim();
  return `You are ${options.name.trim()}, a custom AI expert in a shared meeting room.
Answer only from your specialist perspective described below.
Use the full meeting history so far — do not ask the user to repeat prior context.
Always reply in the same language the user is using.
Keep replies focused unless asked for more depth.

Communication style: ${toneLabel(tone)}. ${TONE_GUIDANCE[tone]}

Persona goals and instructions:
${description}`;
}

export function createCustomExpert(options: {
  id?: string;
  name: string;
  description: string;
  emoji: string;
  tone: ExpertTone;
  role?: string;
  model?: Agent["model"];
}): Agent {
  const name = options.name.trim();
  const description = options.description.trim();
  const roleBase = options.role?.trim() || toneLabel(options.tone);
  return {
    id: options.id ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    role: `${roleBase} · Custom`,
    systemPrompt: buildCustomSystemPrompt({
      name,
      description,
      tone: options.tone,
    }),
    isCustom: true,
    model: options.model ?? DEFAULT_AGENT_MODEL,
    interactionMode: "talk",
    emoji: options.emoji,
    tone: options.tone,
  };
}

function isExpertTone(value: unknown): value is ExpertTone {
  return (
    value === "professional" ||
    value === "direct" ||
    value === "friendly" ||
    value === "analytical" ||
    value === "encouraging"
  );
}

function isCustomAgent(value: unknown): value is Agent {
  if (!value || typeof value !== "object") return false;
  const agent = value as Partial<Agent>;
  return (
    typeof agent.id === "string" &&
    typeof agent.name === "string" &&
    typeof agent.role === "string" &&
    typeof agent.systemPrompt === "string" &&
    agent.isCustom === true &&
    typeof agent.model === "string" &&
    (agent.interactionMode === "talk" || agent.interactionMode === "chat")
  );
}

export function loadCustomExperts(): Agent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_EXPERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomAgent).map((agent) => ({
      ...agent,
      isCustom: true,
      emoji: typeof agent.emoji === "string" ? agent.emoji : "🧠",
      tone: isExpertTone(agent.tone) ? agent.tone : "professional",
    }));
  } catch {
    return [];
  }
}

export function saveCustomExperts(experts: Agent[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    CUSTOM_EXPERTS_STORAGE_KEY,
    JSON.stringify(experts.filter((agent) => agent.isCustom)),
  );
}

/** Best-effort extract of the user-authored description from a stored prompt. */
export function extractCustomDescription(systemPrompt: string) {
  const marker = "Persona goals and instructions:";
  const index = systemPrompt.indexOf(marker);
  if (index === -1) return systemPrompt.trim();
  return systemPrompt.slice(index + marker.length).trim();
}
