import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { DEFAULT_AGENT_MODEL, getModelOption } from "@/lib/models";
import type { Source } from "@/lib/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  agentName?: string;
};

type ChatRequest = {
  systemPrompt?: string;
  agentName?: string;
  messages: ChatMessage[];
  enableSearch?: boolean;
  mode?: "chat" | "research" | "summary";
  urlContext?: string;
  fileContext?: string;
  model?: string;
};

type MeetingSummaryPayload = {
  goal: string;
  decisions: string[];
  openQuestions: string[];
  nextSteps: string[];
  summary: string;
};

const SUMMARY_SYSTEM_PROMPT = `You are a meeting notes assistant for ThinkRoom.
Read the full meeting transcript and extract a concise, accurate summary.
Do not role-play as an expert. Do not invent facts that were not discussed.
Reply with ONLY valid JSON (no markdown fences) using this exact shape:
{
  "goal": "one short sentence",
  "decisions": ["decision 1", "decision 2"],
  "openQuestions": ["question 1"],
  "nextSteps": ["step 1"],
  "summary": "2-5 sentence narrative of what was discussed"
}
Use empty strings or empty arrays when something was not discussed.
Match the primary language used in the meeting.`;

const MAX_URL_CHARS = 12_000;
const MAX_FILE_CONTEXT_CHARS = 40_000;

function extractSources(response: {
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      webSearchQueries?: string[];
    };
  }>;
}): Source[] {
  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: Source[] = [];

  for (const chunk of chunks) {
    const uri = chunk.web?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({
      title: chunk.web?.title?.trim() || new URL(uri).hostname,
      uri,
    });
  }

  return sources;
}

async function fetchUrlContext(rawUrl: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "ThinkRoomBot/1.0 (+https://localhost)",
        Accept: "text/html,text/plain,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/") &&
      !contentType.includes("json") &&
      !contentType.includes("xml")
    ) {
      return null;
    }

    const raw = await response.text();
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) return null;
    return text.slice(0, MAX_URL_CHARS);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildSystemInstruction(
  systemPrompt: string,
  agentName: string,
  researchInstruction: string,
  urlInstruction: string,
  fileInstruction: string,
) {
  return `${systemPrompt}

You are currently speaking as: ${agentName}.
Only respond as this expert. Do not role-play other experts.
Always reply in the same language the user last used.
${researchInstruction}
${urlInstruction}
${fileInstruction}`;
}

async function generateWithGemini(options: {
  apiModel: string;
  systemInstruction: string;
  messages: ChatMessage[];
  enableSearch: boolean;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "paste_your_key_here") {
    throw new Error(
      "Missing GEMINI_API_KEY. Add it to .env.local and restart the server.",
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: options.apiModel,
    systemInstruction: options.systemInstruction,
    ...(options.enableSearch
      ? { tools: [{ googleSearch: {} }] as never }
      : {}),
  });

  const history = options.messages.slice(0, -1).map((message) => {
    const prefix =
      message.role === "assistant" && message.agentName
        ? `[${message.agentName}] `
        : "";

    return {
      role: (message.role === "assistant" ? "model" : "user") as
        | "user"
        | "model",
      parts: [{ text: `${prefix}${message.content}` }],
    };
  });

  // Gemini requires the first history turn to be from the user.
  // Drop leading welcome/assistant messages (e.g. the room greeting).
  while (history.length > 0 && history[0].role === "model") {
    history.shift();
  }

  const latest = options.messages[options.messages.length - 1];
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(latest.content);
  const text = result.response.text();
  const sources = options.enableSearch ? extractSources(result.response) : [];
  const searchQueries =
    result.response.candidates?.[0]?.groundingMetadata?.webSearchQueries ?? [];

  return { text, sources, searchQueries };
}

function parseMeetingSummary(raw: string): MeetingSummaryPayload {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: Partial<MeetingSummaryPayload> = {};
  try {
    parsed = JSON.parse(cleaned) as Partial<MeetingSummaryPayload>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<MeetingSummaryPayload>;
    } else {
      return {
        goal: "",
        decisions: [],
        openQuestions: [],
        nextSteps: [],
        summary: cleaned,
      };
    }
  }

  const asList = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map((item) => String(item).trim())
          .filter(Boolean)
      : [];

  return {
    goal: typeof parsed.goal === "string" ? parsed.goal.trim() : "",
    decisions: asList(parsed.decisions),
    openQuestions: asList(parsed.openQuestions),
    nextSteps: asList(parsed.nextSteps),
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
  };
}

function formatSummaryText(payload: MeetingSummaryPayload): string {
  const lines: string[] = [];
  if (payload.summary) lines.push(payload.summary);
  if (payload.nextSteps.length) {
    lines.push("", "Next steps:");
    for (const step of payload.nextSteps) lines.push(`- ${step}`);
  }
  return lines.join("\n").trim();
}

async function generateWithOpenAI(options: {
  apiModel: string;
  systemInstruction: string;
  messages: ChatMessage[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "paste_your_key_here") {
    throw new Error(
      "Missing OPENAI_API_KEY. Add it to .env.local to use GPT models.",
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.apiModel,
      messages: [
        { role: "system", content: options.systemInstruction },
        ...options.messages.map((message) => ({
          role: message.role,
          content:
            message.role === "assistant" && message.agentName
              ? `[${message.agentName}] ${message.content}`
              : message.content,
        })),
      ],
    }),
  });

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI request failed.");
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned an empty reply.");
  return { text, sources: [] as Source[], searchQueries: [] as string[] };
}

async function generateWithAnthropic(options: {
  apiModel: string;
  systemInstruction: string;
  messages: ChatMessage[];
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "paste_your_key_here") {
    throw new Error(
      "Missing ANTHROPIC_API_KEY. Add it to .env.local to use Claude models.",
    );
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.apiModel,
      max_tokens: 2048,
      system: options.systemInstruction,
      messages: options.messages.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content:
          message.role === "assistant" && message.agentName
            ? `[${message.agentName}] ${message.content}`
            : message.content,
      })),
    }),
  });

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || "Anthropic request failed.");
  }

  const text = data.content
    ?.filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("Claude returned an empty reply.");
  return { text, sources: [] as Source[], searchQueries: [] as string[] };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const {
      systemPrompt,
      agentName,
      messages,
      enableSearch = false,
      mode = "chat",
      urlContext,
      fileContext,
      model: requestedModel = DEFAULT_AGENT_MODEL,
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages are required." },
        { status: 400 },
      );
    }

    const modelOption = getModelOption(requestedModel);
    // MVP: route every UI model choice through Gemini (only GEMINI_API_KEY is required).
    const apiModel =
      modelOption.provider === "google"
        ? modelOption.apiModel
        : "gemini-flash-latest";

    if (mode === "summary") {
      const transcript = messages
        .map((message) => {
          const who =
            message.role === "assistant"
              ? message.agentName || "Assistant"
              : "User";
          return `${who}: ${message.content}`;
        })
        .join("\n\n");

      const summaryMessages: ChatMessage[] = [
        {
          role: "user",
          content: `Meeting transcript:\n\n${transcript}\n\nProduce the JSON summary now.`,
        },
      ];

      const result = await generateWithGemini({
        apiModel,
        systemInstruction: SUMMARY_SYSTEM_PROMPT,
        messages: summaryMessages,
        enableSearch: false,
      });

      const memory = parseMeetingSummary(result.text);
      return NextResponse.json({
        text: formatSummaryText(memory) || result.text,
        memory,
        sources: [],
        usedSearch: false,
        mode,
        model: modelOption.id,
        searchQueries: [],
      });
    }

    if (!systemPrompt) {
      return NextResponse.json(
        { error: "systemPrompt and messages are required." },
        { status: 400 },
      );
    }

    const latest = messages[messages.length - 1];
    if (!latest || latest.role !== "user") {
      return NextResponse.json(
        { error: "The last message must be from the user." },
        { status: 400 },
      );
    }

    let pageContext: string | null = null;
    if (urlContext?.trim()) {
      pageContext = await fetchUrlContext(urlContext.trim());
      if (!pageContext) {
        return NextResponse.json(
          {
            error:
              "Could not load that URL. Check the link and try again (public http/https pages only).",
          },
          { status: 400 },
        );
      }
    }

    const researchInstruction =
      mode === "research"
        ? `
You are in RESEARCH BRIEF mode.
Search multiple angles of the user's topic when web search is available.
Structure your reply as:
1) Executive summary (3–5 sentences)
2) Key findings (bullets)
3) Risks / unknowns
4) Recommended next steps
Prefer current, verifiable facts. Mention when claims come from the live web.`
        : "";

    const urlInstruction = pageContext
      ? `
The user attached a source URL. Ground your answer in this page content when relevant.
URL: ${urlContext}
--- PAGE CONTENT START ---
${pageContext}
--- PAGE CONTENT END ---
If the page conflicts with general knowledge, prefer the page for page-specific questions and note the conflict.`
      : "";

    const trimmedFiles = fileContext?.trim().slice(0, MAX_FILE_CONTEXT_CHARS) ?? "";
    const fileInstruction = trimmedFiles
      ? `
The user attached file(s) as shared meeting context. Ground your answer in this material when relevant.
--- ATTACHED FILES START ---
${trimmedFiles}
--- ATTACHED FILES END ---
If the files conflict with general knowledge, prefer the files for file-specific questions and note the conflict.`
      : "";

    const systemInstruction = buildSystemInstruction(
      systemPrompt,
      agentName || "Expert",
      researchInstruction,
      urlInstruction,
      fileInstruction,
    );

    let useSearch = enableSearch;

    let result: Awaited<ReturnType<typeof generateWithGemini>>;
    try {
      result = await generateWithGemini({
        apiModel,
        systemInstruction,
        messages,
        enableSearch: useSearch,
      });
    } catch (error) {
      // Free-tier keys may have zero quota for search grounding while plain
      // generation still works. Retry once without search instead of failing.
      const message = error instanceof Error ? error.message : "";
      if (useSearch && message.includes("429")) {
        useSearch = false;
        result = await generateWithGemini({
          apiModel,
          systemInstruction,
          messages,
          enableSearch: false,
        });
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      text: result.text,
      sources: result.sources,
      usedSearch: useSearch,
      mode,
      model: modelOption.id,
      searchQueries: result.searchQueries,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate reply.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
