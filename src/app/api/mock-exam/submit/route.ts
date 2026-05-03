import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import ExamAttempt from "@/models/ExamAttempt";
import MockExamResult from "@/models/MockExamResult";
import { EXAM_CONFIGS, ExamId } from "@/lib/examConfig";
import { syncUserRewards } from "@/lib/rewards";

type Question = {
  id: number;
  question: string;
  subject: string;
  chapter: string;
  difficulty: "easy" | "medium" | "hard";
  options: string[];
  correctAnswer: string;
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { exam, questions, answers, timeTaken } = await req.json();
    const examId = exam as ExamId;
    const config = EXAM_CONFIGS[examId];
    if (!config || !Array.isArray(questions) || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const qs = questions as Question[];
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    const topicStats: Record<string, { correct: number; attempted: number }> = {};

    qs.forEach((q, idx) => {
      const selected = answers[idx];
      const chapter = q.chapter || "General";
      if (!topicStats[chapter]) topicStats[chapter] = { correct: 0, attempted: 0 };

      if (selected === null || selected === undefined) {
        skipped++;
        return;
      }

      topicStats[chapter].attempted += 1;
      if (selected === q.correctAnswer) {
        correct++;
        topicStats[chapter].correct += 1;
      } else {
        wrong++;
      }
    });

    const negativeApplied = wrong * config.marking.negative;
    const totalScore = correct * config.marking.correct - negativeApplied;
    const totalMarks = qs.length * config.marking.correct;
    const accuracy = qs.length > 0 ? (correct / qs.length) * 100 : 0;

    const topicAccuracy = Object.entries(topicStats).map(([chapter, s]) => ({
      chapter,
      accuracy: s.attempted ? (s.correct / s.attempted) * 100 : 0,
      correct: s.correct,
      attempted: s.attempted,
    }));

    const weakAreas = topicAccuracy.filter((t) => t.attempted > 0 && t.accuracy < 50).sort((a, b) => a.accuracy - b.accuracy).map((t) => t.chapter).slice(0, 4);
    const strongAreas = topicAccuracy.filter((t) => t.attempted > 0 && t.accuracy > 75).sort((a, b) => b.accuracy - a.accuracy).map((t) => t.chapter).slice(0, 4);

    await connectDB();
    await ExamAttempt.create({
      userId: session.user.email,
      exam: examId,
      score: totalScore,
      correct,
      wrong,
      skipped,
      negativeApplied,
      topicAccuracy,
      weakAreas,
      strongAreas,
      topics: topicAccuracy.map((t) => t.chapter),
      createdAt: new Date(),
    });

    await MockExamResult.create({
      userId: session.user.email,
      exam: examId,
      score: totalScore,
      totalMarks,
      correctAnswers: correct,
      wrongAnswers: wrong,
      accuracy,
      topics: topicAccuracy.map((t) => ({
        topic: t.chapter,
        accuracy: t.accuracy,
        correct: t.correct,
        attempted: t.attempted,
      })),
      timeTaken: typeof timeTaken === "number" && timeTaken >= 0 ? timeTaken : config.durationMinutes * 60,
      createdAt: new Date(),
    });
    await syncUserRewards(session.user.email, "Mock exam completed");

    return NextResponse.json({
      score: totalScore,
      totalMarks,
      accuracy,
      correct,
      wrong,
      skipped,
      negativeApplied,
      topicAccuracy,
      weakAreas,
      strongAreas,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit mock exam";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
