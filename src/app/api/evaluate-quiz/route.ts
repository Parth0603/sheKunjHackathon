import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { geminiModel } from "@/lib/gemini";
import UserPerformance from "@/models/UserPerformance";
import StudyPlan from "@/models/StudyPlan";
import QuizAnalysis from "@/models/QuizAnalysis";
import { generateAdaptiveWeeklyPlan } from "@/lib/studyPlan";
import { syncUserRewards } from "@/lib/rewards";

type Difficulty = "easy" | "medium" | "hard";
type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  chapter?: string;
  difficulty?: Difficulty;
  concept?: string;
};

type AnalysisResult = {
  level: "Weak" | "Moderate" | "Strong";
  coreIssue: string;
  weakAreas: string[];
  strengths: string[];
  mistakePattern: string;
  timeInsight: string;
  actionPlan: string[];
};

function extractJsonObject(input: string): string {
  const cleaned = input.replace(/```json\n?|```\n?/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last < 0 || last <= first) throw new Error("Invalid AI analysis JSON");
  return cleaned.slice(first, last + 1);
}

function normalizeAnalysis(raw: unknown, accuracy: number): AnalysisResult {
  const data = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const level =
    data.level === "Strong" || data.level === "Moderate" || data.level === "Weak"
      ? data.level
      : accuracy >= 75
      ? "Strong"
      : accuracy >= 50
      ? "Moderate"
      : "Weak";
  return {
    level,
    coreIssue: String(data.coreIssue || "Mixed"),
    weakAreas: Array.isArray(data.weakAreas) ? data.weakAreas.map((x) => String(x)).slice(0, 3) : [],
    strengths:
      accuracy < 30
        ? []
        : Array.isArray(data.strengths)
        ? data.strengths.map((x) => String(x)).slice(0, 2)
        : [],
    mistakePattern: String(data.mistakePattern || "Review incorrect answers for patterns."),
    timeInsight: String(data.timeInsight || "Monitor time per question."),
    actionPlan: Array.isArray(data.actionPlan) ? data.actionPlan.map((x) => String(x)).slice(0, 3) : [],
  };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { exam, subject, chapter, questions, userAnswers, timeTaken, questionTimings } = await req.json();
    if (!exam || !subject || !chapter || !Array.isArray(questions) || !userAnswers) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const qs = questions as QuizQuestion[];
    const totalQuestions = qs.length;
    let correctCount = 0;
    const chapterMistakesInQuiz: Record<string, number> = {};
    const difficultyInQuiz: Record<Difficulty, { attempted: number; correct: number }> = {
      easy: { attempted: 0, correct: 0 },
      medium: { attempted: 0, correct: 0 },
      hard: { attempted: 0, correct: 0 },
    };
    const perQuestion = qs.map((q, index) => {
      const difficulty: Difficulty = q.difficulty === "easy" || q.difficulty === "hard" ? q.difficulty : "medium";
      const isCorrect = userAnswers[index] === q.correctAnswer;
      const topic = q.chapter || chapter;
      const concept = q.concept || topic;
      const timeSpent = Number(questionTimings?.[index] || 0);
      difficultyInQuiz[difficulty].attempted += 1;
      if (isCorrect) {
        correctCount += 1;
        difficultyInQuiz[difficulty].correct += 1;
      } else {
        chapterMistakesInQuiz[topic] = (chapterMistakesInQuiz[topic] ?? 0) + 1;
      }
      return { question: q.question, topic, difficulty, isCorrect, timeSpent, concept };
    });

    const wrongCount = totalQuestions - correctCount;
    const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    const attemptPayload = {
      exam,
      subject,
      chapter,
      totalQuestions,
      correct: correctCount,
      wrong: wrongCount,
      accuracy,
      timeTaken: Number(timeTaken || 0),
      questions: perQuestion,
    };
    const attemptKey = crypto
      .createHash("sha256")
      .update(`${session.user.email}:${JSON.stringify(attemptPayload)}`)
      .digest("hex");

    await connectDB();
    const cached = await QuizAnalysis.findOne({ userId: session.user.email, attemptKey }).lean();

    const userId = session.user.email;
    const existingPerformance = await UserPerformance.findOne({ userId, exam, subject, chapter, type: "quiz" });
    if (existingPerformance) {
      const prevHistory = Array.isArray(existingPerformance.history) ? existingPerformance.history : [];
      const newHistory = [...prevHistory, accuracy].slice(-5);
      let trend: "Improving" | "Declining" | "Stable" = "Stable";
      if (newHistory.length >= 2) {
        const first = newHistory[Math.max(0, newHistory.length - 3)];
        const last = newHistory[newHistory.length - 1];
        if (last > first + 5) trend = "Improving";
        else if (last < first - 5) trend = "Declining";
      }
      const newAttempts = existingPerformance.attempts + 1;
      const newAccuracy = ((existingPerformance.accuracy * existingPerformance.attempts) + accuracy) / newAttempts;
      const storedMistakes = (existingPerformance.chapterMistakes ?? {}) as Record<string, number>;
      const mergedMistakes = { ...storedMistakes };
      for (const [ch, count] of Object.entries(chapterMistakesInQuiz)) mergedMistakes[ch] = (mergedMistakes[ch] ?? 0) + count;
      const existingDifficulty = existingPerformance.difficultyStats ?? {
        easy: { attempted: 0, correct: 0 },
        medium: { attempted: 0, correct: 0 },
        hard: { attempted: 0, correct: 0 },
      };
      existingPerformance.attempts = newAttempts;
      existingPerformance.accuracy = newAccuracy;
      existingPerformance.lastScore = accuracy;
      existingPerformance.history = newHistory;
      existingPerformance.trend = trend;
      existingPerformance.type = "quiz";
      existingPerformance.chapterMistakes = mergedMistakes;
      existingPerformance.difficultyStats = {
        easy: {
          attempted: (existingDifficulty.easy?.attempted ?? 0) + difficultyInQuiz.easy.attempted,
          correct: (existingDifficulty.easy?.correct ?? 0) + difficultyInQuiz.easy.correct,
        },
        medium: {
          attempted: (existingDifficulty.medium?.attempted ?? 0) + difficultyInQuiz.medium.attempted,
          correct: (existingDifficulty.medium?.correct ?? 0) + difficultyInQuiz.medium.correct,
        },
        hard: {
          attempted: (existingDifficulty.hard?.attempted ?? 0) + difficultyInQuiz.hard.attempted,
          correct: (existingDifficulty.hard?.correct ?? 0) + difficultyInQuiz.hard.correct,
        },
      };
      existingPerformance.lastAttempt = new Date();
      await existingPerformance.save();
    } else {
      await UserPerformance.create({
        userId,
        exam,
        subject,
        chapter,
        accuracy,
        attempts: 1,
        lastScore: accuracy,
        history: [accuracy],
        trend: "Stable",
        type: "quiz",
        chapterMistakes: chapterMistakesInQuiz,
        difficultyStats: difficultyInQuiz,
      });
    }

    const regenerated = await generateAdaptiveWeeklyPlan(userId);
    await StudyPlan.findOneAndUpdate(
      { userId },
      { userId, weeklyPlan: regenerated.weeklyPlan, insights: regenerated.insights, lastUpdated: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await syncUserRewards(userId, "Quiz completed");

    if (cached) {
      return NextResponse.json({
        score: correctCount,
        total: totalQuestions,
        accuracy,
        analysis: cached.analysis,
        cached: true,
      });
    }

    const isLowScore = accuracy < 30;
    const prompt = `You are a strict exam coach. Analyze this quiz attempt. Return ONLY valid JSON — no extra text.

Quiz data: ${JSON.stringify(attemptPayload)}

Return EXACTLY this JSON structure:
{
  "level": "Weak" | "Moderate" | "Strong",
  "coreIssue": "Concept gap" | "Careless mistakes" | "Time issue" | "Mixed",
  "weakAreas": ["Topic \u2192 specific issue"],
  "strengths": ["Topic \u2192 reason"],
  "mistakePattern": "one line only",
  "timeInsight": "one line only",
  "actionPlan": ["Verb + action"]
}

Strict rules:
- weakAreas: max 3 items. Format: "Topic \u2192 issue" (e.g. "OSI Model \u2192 Layer confusion")
- strengths: max 2. ${isLowScore ? "Return [] because score is very low." : "Short phrases only."}
- mistakePattern: one sentence. No \"This indicates...\"
- timeInsight: one sentence about pacing or time distribution
- actionPlan: max 3 steps. Start each with a verb (Revise/Practice/Take/Focus)
- NO paragraphs. NO long explanations. SHORT phrases only.`;

    const aiText = (await geminiModel.generateContent(prompt)).response.text();
    const analysis = normalizeAnalysis(JSON.parse(extractJsonObject(aiText)), accuracy);

    await QuizAnalysis.create({
      userId,
      attemptKey,
      exam,
      subject,
      chapter,
      totalQuestions,
      correct: correctCount,
      wrong: wrongCount,
      accuracy,
      timeTaken: Number(timeTaken || 0),
      analysis,
    });

    return NextResponse.json({
      score: correctCount,
      total: totalQuestions,
      accuracy,
      analysis,
      cached: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to evaluate quiz";
    console.error("Error evaluating quiz:", message);
    return NextResponse.json({ error: "Failed to evaluate quiz" }, { status: 500 });
  }
}

