import { NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";

type GeneratedNotes = {
  title: string;
  summary: string;
  shouldGenerateImage: boolean;
  imagePrompt: string;
  diagram: string;
  sections: { heading: string; bulletPoints: string[] }[];
  keyConcepts: { concept: string; description: string }[];
};

const VISUAL_SUBJECTS = new Set(["biology", "geography"]);
const MERMAID_STARTERS = ["graph", "flowchart", "sequenceDiagram", "stateDiagram", "erDiagram", "gantt"];

function extractJsonObject(input: string): string {
  const cleaned = input.replace(/```json\n?|```\n?/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Model response did not contain valid JSON object");
  }
  return cleaned.slice(first, last + 1);
}

function normalizeNotes(raw: unknown, subject: string, chapter: string): GeneratedNotes {
  const data = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const normalizedSections = Array.isArray(data.sections)
    ? data.sections
        .map((s) => {
          const section = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
          const heading = typeof section.heading === "string" ? section.heading.trim() : "";
          const bulletPoints = Array.isArray(section.bulletPoints)
            ? section.bulletPoints.filter((bp): bp is string => typeof bp === "string" && bp.trim().length > 0).map((bp) => bp.trim())
            : [];
          if (!heading || bulletPoints.length === 0) return null;
          return { heading, bulletPoints };
        })
        .filter((s): s is { heading: string; bulletPoints: string[] } => s !== null)
    : [];

  const normalizedKeyConcepts = Array.isArray(data.keyConcepts)
    ? data.keyConcepts
        .map((k) => {
          const concept = (typeof k === "object" && k !== null ? k : {}) as Record<string, unknown>;
          const name = typeof concept.concept === "string" ? concept.concept.trim() : "";
          const description = typeof concept.description === "string" ? concept.description.trim() : "";
          if (!name || !description) return null;
          return { concept: name, description };
        })
        .filter((k): k is { concept: string; description: string } => k !== null)
    : [];

  const visualAllowed = VISUAL_SUBJECTS.has(subject.toLowerCase());
  const shouldGenerateImage = visualAllowed && data.shouldGenerateImage === true;
  let diagram = typeof data.diagram === "string" ? data.diagram.trim() : "";
  diagram = diagram.replace(/```mermaid\n?|```\n?/gi, "").trim();

  const hasValidMermaidStart = MERMAID_STARTERS.some((starter) => diagram.startsWith(starter));
  if (!hasValidMermaidStart) {
    const safeNodes = normalizedSections.slice(0, 3).map((s, idx) => `N${idx + 1}["${s.heading.replace(/"/g, "")}"]`);
    const safeEdges = normalizedSections.slice(0, 3).map((_, idx) => `A --> N${idx + 1}`);
    diagram = [`graph TD`, `A["${chapter.replace(/"/g, "")}"]`, ...safeNodes, ...safeEdges].join("\n");
  }

  return {
    title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : `${chapter} Notes`,
    summary:
      typeof data.summary === "string" && data.summary.trim()
        ? data.summary.trim()
        : `Quick revision notes for ${chapter} in ${subject}.`,
    shouldGenerateImage,
    imagePrompt: shouldGenerateImage && typeof data.imagePrompt === "string" ? data.imagePrompt.trim() : "",
    diagram,
    sections: normalizedSections,
    keyConcepts: normalizedKeyConcepts,
  };
}

export async function POST(req: Request) {
  try {
    const { exam, subject, chapter } = await req.json();

    if (!exam || !subject || !chapter) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = `Generate highly structured, visual, and intelligent revision notes for a student preparing for the ${exam} exam.
The subject is ${subject} and the chapter is ${chapter}.
Keep the response compact, clear, and exam-focused.
Return ONLY a valid JSON object with the following structure, no markdown formatting or backticks around it:
{
  "title": "Main topic title",
  "summary": "A highly concise 3-4 line summary of the chapter.",
  "shouldGenerateImage": true/false (Set to true ONLY if the topic is highly visual like biology or geography. Set to false for logic/math/code),
  "imagePrompt": "A highly descriptive, vivid prompt for an AI image generator to create a simple explanatory image (only if shouldGenerateImage is true)",
  "diagram": "A simple Mermaid JS graph TD syntax string showing the concept flow. Do not use markdown backticks in the string.",
  "sections": [
    {
      "heading": "Section Heading",
      "bulletPoints": ["Detailed point 1", "Detailed point 2"]
    }
  ],
  "keyConcepts": [
    {
      "concept": "Formula/Concept Name",
      "description": "Brief explanation"
    }
  ]
}
Rules:
- Use 3 to 5 sections only.
- Keep each section to 3 to 6 bullet points.
- Keep Mermaid diagram simple and valid graph TD syntax.
- Never return text outside the JSON object.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const parsed = JSON.parse(extractJsonObject(text));
    const normalized = normalizeNotes(parsed, subject, chapter);

    return NextResponse.json(normalized);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate notes";
    console.error("Error generating notes:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
