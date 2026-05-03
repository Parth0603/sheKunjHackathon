import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import UserPerformance from "@/models/UserPerformance";
import MockExamResult from "@/models/MockExamResult";
import { computeRewardContext, computeCredits, syncUserRewards } from "@/lib/rewards";

type LeaderboardRow = {
  userId: string;
  name: string;
  image?: string;
  score: number;
  rank: number;
  percentile: number;
  streak: number;
  quizAccuracy: number;
  quizAttempts: number;
  mockAttempts: number;
  credits: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeNeuralScore(input: {
  quizAccuracy: number;
  mockAvgScorePct: number;
  streakDays: number;
}): number {
  const score = input.quizAccuracy * 0.4 + input.mockAvgScorePct * 0.4 + input.streakDays * 0.2;
  return round2(score);
}

export async function getLeaderboardData() {
  await connectDB();

  const [users, quizUserIds, mockUserIds] = await Promise.all([
    User.find({}).lean(),
    UserPerformance.distinct("userId", { type: "quiz" }),
    MockExamResult.distinct("userId", {}),
  ]);

  const allUserIds = Array.from(new Set<string>([
    ...users.map((u) => String(u.email || u.userId || "")).filter(Boolean),
    ...quizUserIds.map(String),
    ...mockUserIds.map(String),
  ]));

  const rows: LeaderboardRow[] = [];

  for (const userId of allUserIds) {
    const baseUser = users.find((u) => String(u.email) === userId);
    const { ctx, credits } = await syncUserRewards(userId);

    const score = computeNeuralScore({
      quizAccuracy: ctx.quizAccuracy,
      mockAvgScorePct: ctx.mockAvgScorePct,
      streakDays: ctx.streakDays,
    });

    if (ctx.quizAttempts === 0 && ctx.mockAttempts === 0) {
      continue;
    }

    rows.push({
      userId,
      name: (baseUser?.name as string) || userId.split("@")[0],
      image: baseUser?.image as string | undefined,
      score,
      rank: 0,
      percentile: 0,
      streak: ctx.streakDays,
      quizAccuracy: round2(ctx.quizAccuracy),
      quizAttempts: ctx.quizAttempts,
      mockAttempts: ctx.mockAttempts,
      credits,
    });
  }

  rows.sort((a, b) => b.score - a.score || b.quizAttempts - a.quizAttempts || a.name.localeCompare(b.name));

  const total = rows.length;
  rows.forEach((row, idx) => {
    row.rank = idx + 1;
    row.percentile = total > 0 ? round2(((total - idx) / total) * 100) : 0;
  });

  return rows;
}

export async function getUserLeaderboardPosition(userId: string) {
  const rows = await getLeaderboardData();
  const found = rows.find((r) => r.userId === userId) || null;

  if (found) {
    return {
      row: found,
      totalUsers: rows.length,
    };
  }

  const ctx = await computeRewardContext(userId);
  const credits = computeCredits(ctx);

  return {
    row: {
      userId,
      name: userId.split("@")[0],
      score: 0,
      rank: 0,
      percentile: 0,
      streak: ctx.streakDays,
      quizAccuracy: round2(ctx.quizAccuracy),
      quizAttempts: ctx.quizAttempts,
      mockAttempts: ctx.mockAttempts,
      credits,
    },
    totalUsers: rows.length,
  };
}

