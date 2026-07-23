import type { MeetingMemory, Message } from "./types";
import { getModelLabel } from "./models";

type ExportNotesInput = {
  roomCode: string;
  takeAiNotes: boolean;
  memory: MeetingMemory;
  messages: Message[];
  participants: Array<{ name: string; role: string; model: string }>;
};

function wrapLine(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

/**
 * Zero-dependency multi-page PDF exporter for meeting notes.
 */
export function downloadMeetingNotesPdf(input: ExportNotesInput) {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 54;
  const maxChars = 88;
  const lineHeight = 14;

  type Line = { text: string; size: number; bold?: boolean };
  const lines: Line[] = [];

  const push = (text: string, size = 11, bold = false) => {
    for (const part of text.split("\n")) {
      for (const row of wrapLine(part || " ", maxChars)) {
        lines.push({ text: row, size, bold });
      }
    }
  };

  const stamp = new Date().toLocaleString();
  push("ThinkRoom Meeting Notes", 18, true);
  push(`Room ${input.roomCode} | Exported ${stamp}`, 10);
  push(
    input.takeAiNotes
      ? "AI notes were enabled for this session."
      : "Exported from the full meeting transcript.",
    10,
  );
  push("");

  push("Participants", 13, true);
  for (const person of input.participants) {
    push(
      `- ${person.name} — ${person.role} (${getModelLabel(person.model)})`,
    );
  }
  push("");

  push("AI Summary", 13, true);
  push(`Goal: ${input.memory.goal || "Not captured yet."}`);
  push("");
  push("Decisions:", 11, true);
  if (input.memory.decisions.length === 0) push("- None yet");
  else input.memory.decisions.forEach((item) => push(`- ${item}`));
  push("");
  push("Open questions:", 11, true);
  if (input.memory.openQuestions.length === 0) push("- None yet");
  else input.memory.openQuestions.forEach((item) => push(`- ${item}`));
  push("");
  if (input.memory.summary.trim()) {
    push("Running summary:", 11, true);
    push(input.memory.summary);
    push("");
  }

  push("Conversation", 13, true);
  for (const message of input.messages) {
    const who = message.role === "user" ? "You" : message.agentName || "Assistant";
    const modelNote =
      message.model && message.role === "assistant"
        ? ` | ${getModelLabel(message.model)}`
        : "";
    push(`${who}${modelNote}`, 11, true);
    push(message.content);
    push("");
  }

  const contentHeight = pageHeight - margin * 2;
  const pages: Line[][] = [];
  let currentPage: Line[] = [];
  let used = 0;

  for (const line of lines) {
    const needed = lineHeight + (line.size >= 13 ? 4 : 0);
    if (used + needed > contentHeight && currentPage.length) {
      pages.push(currentPage);
      currentPage = [];
      used = 0;
    }
    currentPage.push(line);
    used += needed;
  }
  if (currentPage.length) pages.push(currentPage);
  if (pages.length === 0) pages.push([{ text: "No notes yet.", size: 11 }]);

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontRegular = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  );
  const fontBold = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  );

  const pageObjectIds: number[] = [];

  for (const pageLines of pages) {
    let stream = "BT\n";
    let cursorY = pageHeight - margin;
    for (const line of pageLines) {
      const fontRef = line.bold ? "F2" : "F1";
      stream += `/${fontRef} ${line.size} Tf\n`;
      stream += `1 0 0 1 ${margin} ${cursorY} Tm\n`;
      stream += `(${escapePdfText(line.text)}) Tj\n`;
      cursorY -= lineHeight + (line.size >= 13 ? 4 : 0);
    }
    stream += "ET";

    const contentId = addObject(
      `<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
    const pageId = addObject(
      `<< /Type /Page /Parent PLACEHOLDER /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageObjectIds.push(pageId);
  }

  const pagesId = addObject(
    `<< /Type /Pages /Kids [${pageObjectIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] /Count ${pageObjectIds.length} >>`,
  );

  for (const pageId of pageObjectIds) {
    objects[pageId - 1] = objects[pageId - 1].replace(
      "/Parent PLACEHOLDER",
      `/Parent ${pagesId} 0 R`,
    );
  }

  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `thinkroom-notes-${input.roomCode || "meeting"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
