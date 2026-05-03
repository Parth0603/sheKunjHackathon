import { connectDB } from "@/lib/mongodb";
import UserPerformance from "@/models/UserPerformance";

type Trend = "Improving" | "Declining" | "Stable";

type TopicPerformance = {
  exam: string;
  subject: string;
  chapter: string;
  accuracy: number;
  attempts: number;
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

// ── Structured output types for getUserInsights ──────────────────────────────

export type WeakArea = {
  subject: string;
  chapter: string;
  exam: string;
  accuracy: number;
  attempts: number;
  reason: string;
};

export type StrongArea = {
  subject: string;
  chapter: string;
  exam: string;
  accuracy: number;
  attempts: number;
};

export type TrendInsight = {
  subject: string;
  chapter: string;
  direction: "improving" | "declining";
  change: number;
};

export type UserInsightsResult = {
  weakAreas: WeakArea[];
  strongAreas: StrongArea[];
  trends: TrendInsight[];
  hasData: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcStrength(accuracy: number): "Strong" | "Moderate" | "Weak" {
  if (accuracy > 75) return "Strong";
  if (accuracy >= 50) return "Moderate";
  return "Weak";
}

function calcVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}

function calcRecentAccuracy(history: number[], n = 3): number | null {
  if (!Array.isArray(history) || history.length === 0) return null;
  const recent = history.slice(-n);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

function calcHistoricalAccuracy(history: number[], n = 3): number | null {
  if (!Array.isArray(history) || history.length <= n) return null;
  const historical = history.slice(0, -n);
  return historical.reduce((a, b) => a + b, 0) / historical.length;
}

function calcTrend(history: number[]): Trend {
  if (!Array.isArray(history) || history.length < 2) return "Stable";
  const recentAcc = calcRecentAccuracy(history, 3);
  const historicalAcc = calcHistoricalAccuracy(history, 3);
  if (recentAcc !== null && historicalAcc !== null) {
    if (recentAcc > historicalAcc + 5) return "Improving";
    if (recentAcc < historicalAcc - 5) return "Declining";
    return "Stable";
  }
  // fallback: compare last vs first
  const first = history[0];
  const last = history[history.length - 1];
  if (last > first + 5) return "Improving";
  if (last < first - 5) return "Declining";
  return "Stable";
}

// ── getUserInsights – single source of truth for AI Insights panel ───────────

export async function getUserInsights(userId: string): Promise<UserInsightsResult> {
  await connectDB();
  const records = await UserPerformance.find({ userId, type: "quiz" }).lean();

  if (!records.length) {
    return { weakAreas: [], strongAreas: [], trends: [], hasData: false };
  }

  const weakAreas: WeakArea[] = [];
  const strongAreas: StrongArea[] = [];
  const trends: TrendInsight[] = [];
  const weakKeys = new Set<string>();

  // ── WEAK: accuracy < 60% AND attempts >= 2 AND not improving ──
  for (const r of records) {
    const history = Array.isArray(r.history) ? r.history : [];
    const recentAcc = calcRecentAccuracy(history, 3);
    const historicalAcc = calcHistoricalAccuracy(history, 3);
    const isImproving =
      recentAcc !== null && historicalAcc !== null && recentAcc > historicalAcc + 5;

    if (r.accuracy < 60 && (r.attempts ?? 1) >= 2 && !isImproving) {
      const key = `${r.subject}::${r.chapter}`;
      weakAreas.push({
        subject: r.subject,
        chapter: r.chapter,
        exam: r.exam,
        accuracy: r.accuracy,
        attempts: r.attempts ?? 1,
        reason: `Your accuracy in ${r.chapter} is ${r.accuracy.toFixed(0)}%. You have attempted this ${r.attempts ?? 1} time(s) with no improvement trend.`,
      });
      weakKeys.add(key);
    }
  }

  weakAreas.sort((a, b) => a.accuracy - b.accuracy);

  // ── STRONG: accuracy > 75% AND attempts >= 3 AND low variance AND no overlap with weak ──
  for (const r of records) {
    const key = `${r.subject}::${r.chapter}`;
    if (weakKeys.has(key)) continue; // prevent contradictions

    const history = Array.isArray(r.history) ? r.history : [];
    const variance = calcVariance(history);

    if (r.accuracy > 75 && (r.attempts ?? 1) >= 3 && variance < 200) {
      strongAreas.push({
        subject: r.subject,
        chapter: r.chapter,
        exam: r.exam,
        accuracy: r.accuracy,
        attempts: r.attempts ?? 1,
      });
    }
  }

  strongAreas.sort((a, b) => b.accuracy - a.accuracy);

  // ── TRENDS: compare recentAccuracy vs historicalAccuracy ──
  for (const r of records) {
    const history = Array.isArray(r.history) ? r.history : [];
    const recentAcc = calcRecentAccuracy(history, 3);
    const historicalAcc = calcHistoricalAccuracy(history, 3);

    if (recentAcc === null || historicalAcc === null) continue;

    const delta = recentAcc - historicalAcc;
    if (Math.abs(delta) > 5) {
      trends.push({
        subject: r.subject,
        chapter: r.chapter,
        direction: delta > 0 ? "improving" : "declining",
        change: Math.round(Math.abs(delta)),
      });
    }
  }

  trends.sort((a, b) => b.change - a.change);

  return {
    weakAreas: weakAreas.slice(0, 2),   // max 2 weak
    strongAreas: strongAreas.slice(0, 1), // max 1 strong
    trends: trends.slice(0, 1),           // max 1 trend
    hasData: true,
  };
}

// ── buildSmartGuidance – used for recommendations & study plan text ──────────

export function buildSmartGuidance(records: TopicPerformance[]) {
  // Enrich records with computed trend & improvement flag
  const enriched = records.map((r) => {
    const history = Array.isArray(r.history) ? r.history : [];
    const recentAcc = calcRecentAccuracy(history, 3);
    const historicalAcc = calcHistoricalAccuracy(history, 3);
    const isImproving =
      recentAcc !== null && historicalAcc !== null && recentAcc > historicalAcc + 5;
    const computedTrend: Trend =
      recentAcc !== null && historicalAcc !== null
        ? recentAcc > historicalAcc + 5
          ? "Improving"
          : recentAcc < historicalAcc - 5
          ? "Declining"
          : "Stable"
        : r.trend;
    return { ...r, recentAcc, historicalAcc, isImproving, computedTrend };
  });

  // WEAK: accuracy < 60% AND attempts >= 2 AND not improving
  const weakTopics = enriched
    .filter((r) => r.accuracy < 60 && (r.attempts ?? 1) >= 2 && !r.isImproving)
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakKeys = new Set(weakTopics.map((t) => `${t.subject}::${t.chapter}`));

  // STRONG: accuracy > 75% AND no overlap with weak
  const strongTopics = enriched
    .filter((r) => r.accuracy > 75 && !weakKeys.has(`${r.subject}::${r.chapter}`))
    .sort((a, b) => b.accuracy - a.accuracy);

  const decliningTopics = enriched
    .filter((r) => r.computedTrend === "Declining" && r.accuracy >= 50)
    .sort((a, b) => a.accuracy - b.accuracy);

  const improvingTopics = enriched
    .filter((r) => r.computedTrend === "Improving")
    .sort((a, b) => b.accuracy - a.accuracy);

  const insights: Insight[] = [];

  // Up to 2 weak insights
  for (const t of weakTopics.slice(0, 2)) {
    insights.push({
      kind: "weak",
      message: `Your accuracy in ${t.chapter} is ${t.accuracy.toFixed(0)}%. You've attempted this ${t.attempts ?? 1} time(s) with no improvement.`,
    });
  }

  // 1 strong insight (contradictions blocked by weakKeys)
  if (strongTopics.length > 0) {
    const s = strongTopics[0];
    insights.push({
      kind: "strong",
      message: `You are consistently performing well in ${s.chapter} with ${s.accuracy.toFixed(0)}% accuracy.`,
    });
  }

  // 1 trend insight
  if (decliningTopics.length > 0) {
    const d = decliningTopics[0];
    insights.push({
      kind: "trend",
      message: `Your performance in ${d.chapter} is declining. A quick review is recommended.`,
    });
  } else if (improvingTopics.length > 0) {
    const imp = improvingTopics[0];
    const delta =
      imp.recentAcc !== null && imp.historicalAcc !== null
        ? Math.round(imp.recentAcc - imp.historicalAcc)
        : null;
    insights.push({
      kind: "trend",
      message: delta
        ? `Your recent performance in ${imp.subject} is improving by ${delta}%.`
        : `You are improving in ${imp.chapter}.`,
    });
  }

  // Recommendations
  const priorityQueue = [
    ...weakTopics.map((t) => ({ ...t, priority: 1 as const, reason: "weak" as const })),
    ...decliningTopics.map((t) => ({ ...t, priority: 2 as const, reason: "declining" as const })),
  ].sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : a.accuracy - b.accuracy));

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
        description: `Trend is declining at ${topic.accuracy.toFixed(0)}%. A quick quiz can restore retention.`,
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

// ── Drill-down analysis functions ────────────────────────────────────────────

export async function getExamAnalysis(userId: string) {
  await connectDB();
  const records = await UserPerformance.find({ userId, type: "quiz" }).lean();

  if (!records.length) return null;

  const byExam: Record<
    string,
    { totalAcc: number; count: number; subjects: Record<string, { totalAcc: number; count: number }> }
  > = {};

  for (const r of records) {
    if (!byExam[r.exam]) byExam[r.exam] = { totalAcc: 0, count: 0, subjects: {} };
    byExam[r.exam].totalAcc += r.accuracy;
    byExam[r.exam].count += 1;
    if (!byExam[r.exam].subjects[r.subject])
      byExam[r.exam].subjects[r.subject] = { totalAcc: 0, count: 0 };
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
  const records = await UserPerformance.find({ userId, subject, type: "quiz" }).lean();

  if (!records.length) return null;

  const totalAcc = records.reduce((s, r) => s + r.accuracy, 0);
  const avgAccuracy = totalAcc / records.length;
  const totalAttempts = records.reduce((s, r) => s + r.attempts, 0);

  const strongChapters = records.filter((r) => r.accuracy > 75).map((r) => r.chapter);
  const weakChapters = records.filter((r) => r.accuracy < 60).map((r) => r.chapter);

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
  const record = (await UserPerformance.findOne({ userId, chapter, type: "quiz" }).lean()) as
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
