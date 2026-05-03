import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { geminiModel } from "@/lib/gemini";
import UserPerformance from "@/models/UserPerformance";
import FlashcardSet from "@/models/FlashcardSet";

type RawCard = {
  question?: string;
  answer?: string;
  explanation?: string | string[];
  example?: string;
  difficulty?: "easy" | "medium" | "hard";
  tip?: string;
  subject?: string;
  topic?: string;
};

function extractJsonArray(text: string): string {
  const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end < 0 || end <= start) throw new Error("Invalid flashcards JSON");
  return cleaned.slice(start, end + 1);
}

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const exam = String(body?.exam || "").trim();
    const subject = String(body?.subject || "").trim();
    const chapter = String(body?.chapter || "").trim();
    const topic = String(body?.topic || "").trim();
    const count = Math.max(1, Math.min(50, Number(body?.count || 10)));
    const inputWeakAreas = Array.isArray(body?.userWeakAreas)
      ? body.userWeakAreas.map((v: unknown) => String(v || "").trim()).filter(Boolean)
      : [];

    if (!exam || !subject || !chapter) {
      return NextResponse.json({ error: "exam, subject, chapter are required" }, { status: 400 });
    }

    await connectDB();

    const weakRows = await UserPerformance.find({
      userId: session.user.email,
      exam,
      subject,
      type: "quiz",
      accuracy: { $lt: 50 },
    })
      .sort({ accuracy: 1 })
      .limit(5)
      .lean();

    const userWeakAreas = Array.from(new Set([...inputWeakAreas, ...weakRows.map((r) => r.chapter)]));

    const sourceKey = [norm(exam), norm(subject), norm(chapter), norm(topic || "all"), count].join("::");

    const cached = await FlashcardSet.findOne({ userId: session.user.email, sourceKey }).lean();
    if (cached) {
      return NextResponse.json({
        setId: String(cached._id),
        exam: cached.exam,
        subject: cached.subject,
        chapter: cached.chapter,
        topic: cached.topic,
        count: cached.count,
        cards: cached.cards,
        cached: true,
      });
    }

    const prompt = `You are an expert exam tutor.

Generate high-quality flashcards for quick revision.

Rules:
- Return ONLY valid JSON array. No markdown. No prose outside JSON.
- Each flashcard must contain:
  - question
  - answer (short and clear, max 2 lines)
  - explanation (bullet-style short points)
  - example (real exam-style mini example)
  - tip (one quick recall tip)
  - difficulty (easy | medium | hard)
  - subject
  - topic
- Focus on:
  - core concepts
  - formulas
  - tricky points
  - common mistakes
- Keep answers concise
- Avoid generic definitions
- Make them exam-oriented
- Mix difficulty (easy + medium + tricky)

Context:
- exam: ${exam}
- subject: ${subject}
- chapter: ${chapter}
- topic: ${topic || "general chapter coverage"}
- userWeakAreas: ${userWeakAreas.join(", ") || "None"}
- number of cards: ${count}

Return ONLY JSON array:
[
  {
    "question": "...",
    "answer": "...",
    "explanation": "...",
    "example": "...",
    "subject": "${subject}",
    "topic": "${topic || chapter}",
    "difficulty": "easy | medium | hard",
    "tip": "one quick tip"
  }
]`;

    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(extractJsonArray(text)) as RawCard[];

    const cards = parsed
      .filter((c) => c.question && c.answer)
      .slice(0, count)
      .map((card) => ({
        cardId: crypto.randomUUID(),
        question: String(card.question).trim(),
        answer: String(card.answer).trim(),
        explanation: Array.isArray(card.explanation)
          ? card.explanation.map((x) => String(x).trim()).filter(Boolean).join("\n")
          : String(card.explanation || "").trim(),
        example: String(card.example || "").trim(),
        subject: String(card.subject || subject).trim(),
        topic: String(card.topic || topic || chapter).trim(),
        difficulty: card.difficulty === "hard" || card.difficulty === "easy" ? card.difficulty : "medium",
        tip: card.tip ? String(card.tip).trim() : undefined,
      }));

    if (cards.length === 0) {
      return NextResponse.json({ error: "Could not generate flashcards" }, { status: 500 });
    }

    const savedSet = await FlashcardSet.findOneAndUpdate(
      { userId: session.user.email, sourceKey },
      {
        userId: session.user.email,
        exam,
        subject,
        chapter,
        topic,
        count: cards.length,
        sourceKey,
        cards,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      setId: String(savedSet._id),
      exam,
      subject,
      chapter,
      topic,
      count: cards.length,
      userWeakAreas,
      cards,
      sourceKey,
      cached: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate flashcards";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
