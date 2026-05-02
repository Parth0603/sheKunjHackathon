import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import UserPerformance from "@/models/UserPerformance";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { exam, subject, chapter, questions, userAnswers } = await req.json();

    if (!exam || !subject || !chapter || !questions || !userAnswers) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Evaluate answers
    let correctCount = 0;
    const totalQuestions = questions.length;

    questions.forEach((q: any, index: number) => {
      if (userAnswers[index] === q.correctAnswer) {
        correctCount++;
      }
    });

    const accuracy = (correctCount / totalQuestions) * 100;

    // Connect to DB and update performance
    await connectDB();

    // Using email as userId for simplicity, assuming it's unique
    const userId = session.user.email;

    const existingPerformance = await UserPerformance.findOne({ userId, exam, subject, chapter });

    if (existingPerformance) {
      // Deep Analysis: Trend Calculation
      const prevHistory = Array.isArray(existingPerformance.history) ? existingPerformance.history : [];
      const newHistory = [...prevHistory, accuracy].slice(-5);
      let trend: "Improving" | "Declining" | "Stable" = "Stable";
      
      if (newHistory.length >= 2) {
        const lastThree = newHistory.slice(-3);
        if (lastThree.length >= 2) {
          const first = lastThree[0];
          const last = lastThree[lastThree.length - 1];
          if (last > first + 5) trend = "Improving";
          else if (last < first - 5) trend = "Declining";
        }
      }

      const newAttempts = existingPerformance.attempts + 1;
      const newAccuracy = ((existingPerformance.accuracy * existingPerformance.attempts) + accuracy) / newAttempts;

      existingPerformance.attempts = newAttempts;
      existingPerformance.accuracy = newAccuracy;
      existingPerformance.lastScore = accuracy;
      existingPerformance.history = newHistory;
      existingPerformance.trend = trend;
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
      });
    }

    const strength = accuracy > 75 ? "Strong" : accuracy >= 50 ? "Moderate" : "Weak";

    return NextResponse.json({
      score: correctCount,
      total: totalQuestions,
      accuracy,
      strength,
      trend: existingPerformance?.trend || "Stable"
    });

  } catch (error: any) {
    console.error("Error evaluating quiz:", error.message || error);
    return NextResponse.json({ error: "Failed to evaluate quiz" }, { status: 500 });
  }
}
