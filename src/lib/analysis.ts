import { connectDB } from "@/lib/mongodb";
import UserPerformance from "@/models/UserPerformance";

type Trend = "Improving" | "Declining" | "Stable";

type TopicPerformance = {
  exam: string;
  subject: string;
  chapter: string;
  accuracy: number;
  trend: Trend;
  history?: number[];
};

type Recommendation = {
  title: string;
  description: string;
  action: string;
  type: "critical" | "warning";
};

export type InsightKind = "weak" | "strong" | "trend" | "recommendation";
export type Insight = {
  kind: InsightKind;
  message: string;
};

function calcStrength(accuracy: number): "Strong" | "Moderate" | "Weak" {
  if (accuracy > 75) return "Strong";
  if (accuracy >= 50) return "Moderate";
  return "Weak";
}

function calcTrend(history: number[]): Trend {
  if (!Array.isArray(history) || history.length < 2) return "Stable";
  const slice = history.slice(-3);
  const first = slice[0];
  const last = slice[slice.length - 1];
  if (last > first + 5) return "Improving";
  if (last < first - 5) return "Declining";
  return "Stable";
}

export function buildSmartGuidance(records: TopicPerformance[]) {
  const weakTopics = records.filter((r) => r.accuracy < 50).sort((a, b) => a.accuracy - b.accuracy);
  const strongTopics = records.filter((r) => r.accuracy > 75).sort((a, b) => b.accuracy - a.accuracy);
  const trendEvaluated = records.map((r) => ({
    ...r,
    computedTrend: Array.isArray(r.history) && r.history.length >= 3 ? calcTrend(r.history.slice(-3)) : r.trend,
  }));
  const decliningTopics = trendEvaluated
    .filter((r) => r.computedTrend === "Declining" && r.accuracy >= 50)
    .sort((a, b) => a.accuracy - b.accuracy);
  const improvingTopics = trendEvaluated
    .filter((r) => r.computedTrend === "Improving")
    .sort((a, b) => b.accuracy - a.accuracy);

  const insights: Insight[] = [];

  if (weakTopics.length > 0) {
    const weakestChapters = weakTopics.slice(0, 3).map((t) => t.chapter);
    if (weakestChapters.length >= 2) {
      const formatted = `${weakestChapters.slice(0, -1).join(", ")} and ${weakestChapters[weakestChapters.length - 1]}`;
      insights.push({
        kind: "weak",
        message: `You are consistently weak in ${formatted} (accuracy below 50%).`,
      });
    } else {
      insights.push({
        kind: "weak",
        message: `You are consistently weak in ${weakestChapters[0]} (accuracy below 50%).`,
      });
    }
  }

  if (records.length > 0) {
    const strongest = [...records].sort((a, b) => b.accuracy - a.accuracy)[0];
    insights.push({
      kind: "strong",
      message: `Your strongest area is ${strongest.chapter}.`,
    });
  }

  if (decliningTopics.length > 0) {
    insights.push({
      kind: "trend",
      message: `Your performance in ${decliningTopics[0].chapter} is declining.`,
    });
  } else if (improvingTopics.length > 0) {
    insights.push({
      kind: "trend",
      message: `You are improving in ${improvingTopics[0].chapter}.`,
    });
  }

  if (weakTopics.length > 0) {
    insights.push({
      kind: "recommendation",
      message: `Focus on revising ${weakTopics[0].chapter} before attempting new topics.`,
    });
  }

  const priorityQueue = [
    ...weakTopics.map((t) => ({ ...t, priority: 1 as const, reason: "weak" as const })),
    ...decliningTopics.map((t) => ({ ...t, priority: 2 as const, reason: "declining" as const })),
  ].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.accuracy - b.accuracy;
  });

  const recommendations: Recommendation[] = [];
  const seen = new Set<string>();

  for (const topic of priorityQueue) {
    if (recommendations.length >= 3) break;
    if (seen.has(topic.chapter)) continue;
    seen.add(topic.chapter);

    if (topic.reason === "weak") {
      recommendations.push({
        title: `Revise ${topic.chapter}`,
        description: `Accuracy is ${topic.accuracy.toFixed(0)}%. Revisit concepts and notes first.`,
        action: `/learn/${topic.exam}/${topic.subject}/${topic.chapter}`,
        type: "critical",
      });
    } else {
      recommendations.push({
        title: `Take quiz on ${topic.chapter}`,
        description: "Trend is declining. A quick quiz can help restore retention.",
        action: `/learn/${topic.exam}/${topic.subject}/${topic.chapter}`,
        type: "warning",
      });
    }
  }

  return {
    weakTopics,
    strongTopics,
    decliningTopics,
    improvingTopics,
    insights: insights.slice(0, 4),
    recommendations,
  };
}

export async function getExamAnalysis(userId: string) {
  await connectDB();
  const records = await UserPerformance.find({ userId }).lean();

  if (!records.length) return null;

  const byExam: Record<
    string,
    { totalAcc: number; count: number; subjects: Record<string, { totalAcc: number; count: number }> }
  > = {};

  for (const r of records) {
    if (!byExam[r.exam]) byExam[r.exam] = { totalAcc: 0, count: 0, subjects: {} };
    byExam[r.exam].totalAcc += r.accuracy;
    byExam[r.exam].count += 1;
    if (!byExam[r.exam].subjects[r.subject]) byExam[r.exam].subjects[r.subject] = { totalAcc: 0, count: 0 };
    byExam[r.exam].subjects[r.subject].totalAcc += r.accuracy;
    byExam[r.exam].subjects[r.subject].count += 1;
  }

  return Object.entries(byExam).map(([exam, data]) => {
    const overallAccuracy = data.totalAcc / data.count;
    const subjectAccuracies = Object.entries(data.subjects).map(([name, s]) => ({
      name,
      accuracy: s.totalAcc / s.count,
    }));
    const sorted = [...subjectAccuracies].sort((a, b) => b.accuracy - a.accuracy);

    return {
      exam,
      overallAccuracy,
      totalQuizzes: data.count,
      strength: calcStrength(overallAccuracy),
      strongestSubject: sorted[0]?.name ?? null,
      weakestSubject: sorted[sorted.length - 1]?.name ?? null,
      subjects: subjectAccuracies,
    };
  });
}

export async function getSubjectAnalysis(userId: string, subject: string) {
  await connectDB();
  const records = await UserPerformance.find({ userId, subject }).lean();

  if (!records.length) return null;

  const totalAcc = records.reduce((s, r) => s + r.accuracy, 0);
  const avgAccuracy = totalAcc / records.length;
  const totalAttempts = records.reduce((s, r) => s + r.attempts, 0);

  const strongChapters = records.filter((r) => r.accuracy > 75).map((r) => r.chapter);
  const weakChapters = records.filter((r) => r.accuracy < 50).map((r) => r.chapter);

  const chapters = records.map((r) => ({
    chapter: r.chapter,
    accuracy: r.accuracy,
    attempts: r.attempts,
    strength: calcStrength(r.accuracy),
    trend: calcTrend(Array.isArray(r.history) ? r.history : []),
  }));

  return {
    subject,
    avgAccuracy,
    totalAttempts,
    strength: calcStrength(avgAccuracy),
    strongChapters,
    weakChapters,
    chapters,
  };
}

export async function getChapterAnalysis(userId: string, chapter: string) {
  await connectDB();
  const record = (await UserPerformance.findOne({ userId, chapter }).lean()) as
    | {
        chapter: string;
        subject: string;
        exam: string;
        accuracy: number;
        attempts: number;
        lastScore?: number;
        history?: number[];
        lastAttempt?: Date;
      }
    | null;

  if (!record) return null;

  const history = Array.isArray(record.history) ? record.history : [];

  return {
    chapter: record.chapter,
    subject: record.subject,
    exam: record.exam,
    accuracy: record.accuracy,
    attempts: record.attempts,
    lastScore: record.lastScore ?? record.accuracy,
    history,
    trend: calcTrend(history),
    strength: calcStrength(record.accuracy),
    lastAttempt: record.lastAttempt,
  };
}
