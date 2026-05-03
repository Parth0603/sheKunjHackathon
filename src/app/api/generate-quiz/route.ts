import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import UserPerformance from "@/models/UserPerformance";
import { geminiModel } from "@/lib/gemini";

function extractJsonObject(input: string): string {
  const cleaned = input.replace(/```json\n?|```\n?/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Model response did not contain valid JSON object");
  }
  return cleaned.slice(first, last + 1);
}

export async function POST(req: Request) {
  try {
    const { exam, subject, chapter } = await req.json();

    if (!exam || !subject || !chapter) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let weakChaptersContext = "";
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      await connectDB();
      const weakRows = await UserPerformance.find({
        userId: session.user.email,
        exam,
        subject,
        accuracy: { $lt: 60 },
      })
        .sort({ accuracy: 1 })
        .limit(3)
        .lean();
      if (weakRows.length > 0) {
        weakChaptersContext = weakRows.map((w) => w.chapter).join(", ");
      }
    }

    const prompt = `Generate a 5-question multiple choice quiz for a student preparing for the ${exam} exam. 
The subject is ${subject} and the chapter is ${chapter}. 
${weakChaptersContext ? `Adaptive focus: prioritize these weak chapters when possible: ${weakChaptersContext}.` : ""}
Mix difficulty across questions: include easy, medium, and hard questions.
Return ONLY a valid JSON object with the following structure, no markdown formatting or backticks around it:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact text of the correct option",
      "chapter": "Chapter name for this question",
      "difficulty": "easy|medium|hard"
    }
  ]
}
Rules:
- Exactly 5 questions.
- At least 1 easy, 2 medium, and 1 hard question.
- Keep question tags accurate (chapter and difficulty).`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const data = JSON.parse(extractJsonObject(text));
    if (!Array.isArray(data.questions)) {
      throw new Error("Invalid quiz payload");
    }

    const normalizedQuestions = data.questions.slice(0, 5).map((q: unknown) => {
      const question = (typeof q === "object" && q !== null ? q : {}) as Record<string, unknown>;
      const difficultyRaw = typeof question.difficulty === "string" ? question.difficulty.toLowerCase() : "medium";
      const difficulty = difficultyRaw === "easy" || difficultyRaw === "hard" ? difficultyRaw : "medium";
      return {
        question: typeof question.question === "string" ? question.question : "",
        options: Array.isArray(question.options) ? question.options.filter((o): o is string => typeof o === "string") : [],
        correctAnswer: typeof question.correctAnswer === "string" ? question.correctAnswer : "",
        chapter: typeof question.chapter === "string" && question.chapter.trim() ? question.chapter.trim() : chapter,
        difficulty,
      };
    });

    return NextResponse.json({ questions: normalizedQuestions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate quiz";
    console.error("Error generating quiz:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
