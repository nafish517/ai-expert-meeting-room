import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { EXPERT_TONES, toneLabel } from "@/lib/customExperts";
import type { ExpertTone } from "@/lib/types";

type EnhanceRequest = {
  title?: string;
  description?: string;
  tone?: ExpertTone;
};

function isExpertTone(value: unknown): value is ExpertTone {
  return EXPERT_TONES.some((tone) => tone.id === value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EnhanceRequest;
    const title = body.title?.trim() ?? "";
    const description = body.description?.trim() ?? "";
    const tone = isExpertTone(body.tone) ? body.tone : "professional";

    if (!title && !description) {
      return NextResponse.json(
        { error: "Add a title or description first." },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "paste_your_key_here") {
      return NextResponse.json(
        {
          error:
            "Missing GEMINI_API_KEY. Add it to .env.local and restart the server.",
        },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 700,
      },
    });

    const prompt = `You help users define custom AI expert personas for a multi-expert meeting room.

Given a draft expert, rewrite a clear persona brief the user can paste as instructions.

Return ONLY valid JSON with this exact shape:
{"description":"...", "role":"...", "emoji":"..."}

Rules:
- description: 3-6 short sentences covering specialty, goals, boundaries, and how they should answer in a shared meeting. Include that they should use prior meeting context and match the user's language.
- role: a short subtitle under 6 words (specialty label).
- emoji: a single emoji that fits the expert.
- Tone/style to reflect: ${toneLabel(tone)}.
- Keep the same language as the draft (Bangla or English).
- Do not wrap the JSON in markdown.

Title: ${title || "(untitled)"}
Draft description:
${description || "(none — invent a strong starting brief from the title)"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonText = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: { description?: string; role?: string; emoji?: string };
    try {
      parsed = JSON.parse(jsonText) as {
        description?: string;
        role?: string;
        emoji?: string;
      };
    } catch {
      return NextResponse.json(
        { error: "Could not parse the enhanced persona. Try again." },
        { status: 502 },
      );
    }

    const enhancedDescription = parsed.description?.trim();
    if (!enhancedDescription) {
      return NextResponse.json(
        { error: "Enhancement returned an empty description." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      description: enhancedDescription,
      role: parsed.role?.trim() || undefined,
      emoji: parsed.emoji?.trim() || undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to enhance the expert persona.",
      },
      { status: 500 },
    );
  }
}
