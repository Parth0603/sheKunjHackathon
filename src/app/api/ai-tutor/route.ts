import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { geminiModel } from "@/lib/gemini";
import UserPerformance from "@/models/UserPerformance";
import MockExamResult from "@/models/MockExamResult";
import Note from "@/models/Note";
import TutorChat from "@/models/TutorChat";

type PerfRow = {
  exam: string;
  subject: string;
  chapter: string;
  accuracy: number;
  trend: "Improving" | "Declining" | "Stable";
  chapterMistakes?: Record<string, number>;
};

type Diagnostic = { title: string; desc: string; level: "weak" | "strong" | "trend" };

type FollowUp = string;

const TUTOR_SYSTEM_PROMPT = `You are a highly intelligent personal tutor helping a student prepare for competitive exams like GATE, JEE, NEET, UPSC.

Answer naturally like a human teacher.

Do NOT use templates.

Do NOT repeat the question.

Give clear, concise, and helpful explanations.

If the question is conceptual -> explain simply.

If the question is vague -> ask a clarifying question.

If the user says 'help in algorithm', respond like:
'Got it - which part of algorithms are you struggling with? Sorting, DP, graphs, or something else?'

Keep tone friendly and intelligent.`;

function topMistakes(rows: PerfRow[]): string[] {
  const bucket: Record<string, number> = {};
  for (const row of rows) {
    const mistakes = row.chapterMistakes || {};
    for (const [topic, count] of Object.entries(mistakes)) {
      bucket[topic] = (bucket[topic] ?? 0) + count;
    }
  }

  return Object.entries(bucket)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
}

function generateFollowUps(input: {
  chapter: string;
  weakTopics: string[];
  latestResponse: string;
}): FollowUp[] {
  const focus = input.weakTopics[0] || input.chapter;
  const options = [
    `Explain ${focus} with one practical example`,
    `Give me 5 practice questions on ${focus}`,
    `Revise basics of ${focus}`,
  ];

  if (/example/i.test(input.latestResponse)) {
    return [options[1], options[2], `Give a faster way to revise ${focus}`];
  }

  return options;
}

async function generateTutorReply(prompt: string) {
  const result = await geminiModel.generateContent(prompt);
  return result.response.text().trim();
}

async function generateTutorReplyWithRetry(prompt: string) {
  try {
    return await generateTutorReply(prompt);
  } catch {
    return await generateTutorReply(prompt);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    let exam = typeof body.exam === "string" ? body.exam.trim() : "";
    let subject = typeof body.subject === "string" ? body.subject.trim() : "";
    let chapter = typeof body.chapter === "string" ? body.chapter.trim() : "";

    await connectDB();

    const allRows = (await UserPerformance.find({ userId: session.user.email, type: "quiz" })
      .sort({ lastAttempt: -1 })
      .lean()) as PerfRow[];

    if (!exam || !subject || !chapter) {
      const fallback = [...allRows].sort((a, b) => a.accuracy - b.accuracy)[0] || allRows[0];
      exam = exam || fallback?.exam || "GATE";
      subject = subject || fallback?.subject || "Computer Science";
      chapter = chapter || fallback?.chapter || "Algorithms";
    }

    const scopedRows = allRows.filter((r) => r.exam === exam && r.subject === subject);
    const weakTopics = scopedRows.filter((r) => r.accuracy < 50).map((r) => r.chapter);
    const strongTopics = scopedRows.filter((r) => r.accuracy > 75).map((r) => r.chapter);
    const recentMistakes = topMistakes(scopedRows);
    const chapterRow = scopedRows.find((r) => r.chapter === chapter);
    const currentTrend = chapterRow?.trend || "Stable";

    const recentMock = await MockExamResult.find({ userId: session.user.email, exam })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const mockWeakTopics = Array.from(new Set(recentMock.flatMap((m) => m.weakAreas || []))).slice(0, 4);
    const mergedWeakTopics = Array.from(new Set([...weakTopics, ...mockWeakTopics]));

    const notes = await Note.find({ userId: session.user.email, exam, subject })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    const referenceAssets = [
      ...notes.map((n) => ({ title: n.title, type: "NOTE", meta: new Date(n.createdAt).toLocaleDateString() })),
      ...recentMistakes.slice(0, 3).map((m) => ({ title: `${m} - recent mistakes`, type: "MISTAKES", meta: "Quiz diagnostics" })),
      ...mockWeakTopics.slice(0, 2).map((m) => ({ title: `${m} - weak in recent mocks`, type: "MOCK", meta: "Mock exam analytics" })),
    ].slice(0, 8);

    const diagnostics: Diagnostic[] = [];
    if (mergedWeakTopics[0]) {
      diagnostics.push({ title: "Weak Area", desc: `Low accuracy in ${mergedWeakTopics[0]}.`, level: "weak" });
    }
    if (strongTopics[0]) {
      diagnostics.push({ title: "Strong Area", desc: `Strong performance in ${strongTopics[0]}.`, level: "strong" });
    }
    if (recentMistakes[0]) {
      diagnostics.push({ title: "Mistake Pattern", desc: `Frequent mistakes in ${recentMistakes[0]}.`, level: "trend" });
    }

    const suggestedQuestions = [
      mergedWeakTopics[0] ? `Can you explain ${mergedWeakTopics[0]} from basics?` : `Can you summarize ${chapter}?`,
      mergedWeakTopics[1] ? `Give me a quick quiz on ${mergedWeakTopics[1]}.` : `What are common mistakes in ${chapter}?`,
      `How should I revise ${chapter} if my trend is ${currentTrend.toLowerCase()}?`,
    ];

    const firstMessage = mergedWeakTopics[0]
      ? `You struggled with ${mergedWeakTopics[0]}. Want to revise it together?`
      : `Hi! I am here to help with ${chapter}. What do you want to focus on first?`;

    const existingChat = await TutorChat.findOne({ userId: session.user.email, exam, subject, chapter });

    if (!query) {
      return NextResponse.json({
        exam,
        subject,
        chapter,
        firstMessage,
        history: existingChat?.messages || [],
        diagnostics,
        diagnosticsMessage: diagnostics.length === 0 ? "Start learning to see insights" : "",
        suggestedQuestions,
        followUps: [],
        referenceAssets,
      });
    }

    const recentHistory = (existingChat?.messages || [])
      .slice(-8)
      .map((m: { role: "user" | "ai"; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const tutorPrompt = `${TUTOR_SYSTEM_PROMPT}

Student context:
- exam: ${exam}
- subject: ${subject}
- chapter: ${chapter}
- weakTopics: ${mergedWeakTopics.join(", ") || "None"}
- strongTopics: ${strongTopics.join(", ") || "None"}
- trend: ${currentTrend}

Conversation history:
${recentHistory || "No prior history"}

Student message:
${query}

Output rules:
- Use clean Markdown formatting.
- Keep it compact and readable.
- Use short headings when helpful (e.g., "### Core Idea", "### Key Points", "### Next Step").
- Use bullet points for lists.
- Use **bold** to emphasize important terms.
- Use fenced code blocks only for formulas, pseudocode, or syntax examples.
- Do not output JSON.
- Do not include any preface like "Sure" or "Here is the answer."`;

    console.info("[ai-tutor] input", { userId: session.user.email, exam, subject, chapter, query });
    console.info("[ai-tutor] prompt", tutorPrompt);

    let aiText = "";
    try {
      aiText = await generateTutorReplyWithRetry(tutorPrompt);
    } catch (error) {
      console.error("[ai-tutor] model failure", error);
      return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
    }

    console.info("[ai-tutor] raw-response", aiText);

    const cleanResponse = aiText.replace(/\n{3,}/g, "\n\n").trim();

    const followUps = generateFollowUps({
      chapter,
      weakTopics: mergedWeakTopics,
      latestResponse: cleanResponse,
    });

    const newMessages = [
      ...(existingChat?.messages || []),
      { role: "user" as const, content: query, createdAt: new Date() },
      { role: "ai" as const, content: cleanResponse, createdAt: new Date() },
    ].slice(-40);

    await TutorChat.findOneAndUpdate(
      { userId: session.user.email, exam, subject, chapter },
      { userId: session.user.email, exam, subject, chapter, messages: newMessages, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      exam,
      subject,
      chapter,
      response: { text: cleanResponse },
      diagnostics,
      diagnosticsMessage: diagnostics.length === 0 ? "Start learning to see insights" : "",
      suggestedQuestions,
      followUps,
      referenceAssets,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process query";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
