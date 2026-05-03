import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { geminiModel } from "@/lib/gemini";
import UserPerformance from "@/models/UserPerformance";
import { EXAM_CONFIGS, ExamId } from "@/lib/examConfig";

type Perf = { exam: string; subject: string; chapter: string; accuracy: number };

function extractJsonObject(input: string): string {
  const cleaned = input.replace(/```json\n?|```\n?/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) throw new Error("Invalid JSON response");
  return cleaned.slice(first, last + 1);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { exam } = await req.json();
    const examId = exam as ExamId;
    const config = EXAM_CONFIGS[examId];
    if (!config) return NextResponse.json({ error: "Invalid exam" }, { status: 400 });

    await connectDB();
    const perfRows = (await UserPerformance.find({ userId: session.user.email }).lean()) as Perf[];
    const weakTopics = perfRows
      .filter((r) => r.accuracy < 50 && config.subjects.includes(r.subject))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 6)
      .map((r) => `${r.subject}: ${r.chapter}`);

    const prompt = `Generate a realistic mock exam question set for ${examId}.
Exam configuration:
- Number of questions: ${config.numberOfQuestions}
- Subjects mix: ${config.subjects.join(", ")}
- Prioritize weak topics when possible: ${weakTopics.join(", ") || "None available"}
- Mix easy, medium, hard.

Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "...",
      "subject": "...",
      "chapter": "...",
      "difficulty": "easy|medium|hard",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "exact option text"
    }
  ]
}
Rules:
- Exactly ${config.numberOfQuestions} questions.
- Every question must have 4 options.
- Spread questions across subjects.
- Keep question text concise and exam-like.`;

    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(extractJsonObject(text));
    if (!Array.isArray(parsed.questions)) throw new Error("Invalid questions format");

    const questions = parsed.questions.slice(0, config.numberOfQuestions).map((q: unknown, idx: number) => {
      const row = (typeof q === "object" && q !== null ? q : {}) as Record<string, unknown>;
      const difficultyRaw = typeof row.difficulty === "string" ? row.difficulty.toLowerCase() : "medium";
      const difficulty = difficultyRaw === "easy" || difficultyRaw === "hard" ? difficultyRaw : "medium";
      return {
        id: idx + 1,
        question: typeof row.question === "string" ? row.question : "",
        subject: typeof row.subject === "string" ? row.subject : config.subjects[idx % config.subjects.length],
        chapter: typeof row.chapter === "string" ? row.chapter : "General",
        difficulty,
        options: Array.isArray(row.options) ? row.options.filter((o): o is string => typeof o === "string").slice(0, 4) : [],
        correctAnswer: typeof row.correctAnswer === "string" ? row.correctAnswer : "",
      };
    });

    return NextResponse.json({ exam: examId, config, questions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to start mock exam";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
