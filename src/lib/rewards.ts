import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import UserPerformance from "@/models/UserPerformance";
import MockExamResult from "@/models/MockExamResult";

export const REWARD_CATALOG = [
  { key: "college-hoodie", name: "College Hoodie", cost: 1500, icon: "checkroom", category: "Merch" },
  { key: "neural-notebook", name: "Neural Notebook", cost: 800, icon: "menu_book", category: "Stationery" },
  { key: "exam-pro-bundle", name: "Exam Pro Bundle", cost: 3000, icon: "workspace_premium", category: "Digital" },
  { key: "speed-runner-badge", name: "Speed Runner Badge", cost: 500, icon: "bolt", category: "Badges" },
  { key: "study-lamp", name: "Study Lamp", cost: 2000, icon: "light_mode", category: "Merch" },
  { key: "premium-ai-sessions", name: "Premium AI Sessions", cost: 1000, icon: "psychology", category: "Digital" },
] as const;

export const BADGE_RULES = [
  { key: "7-day streak", condition: (ctx: RewardContext) => ctx.streakDays >= 7 },
  { key: "10 quizzes completed", condition: (ctx: RewardContext) => ctx.quizAttempts >= 10 },
  { key: "high accuracy", condition: (ctx: RewardContext) => ctx.quizAccuracy >= 80 },
] as const;

type RewardContext = {
  quizAttempts: number;
  mockAttempts: number;
  quizAccuracy: number;
  mockAvgScorePct: number;
  streakDays: number;
};

function computeStreakDays(timestamps: Date[]): number {
  const uniqueDays = Array.from(
    new Set(
      timestamps.map((ts) => {
        const d = new Date(ts);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    )
  ).sort((a, b) => b - a);

  if (!uniqueDays.length) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = today.getTime();

  if (uniqueDays[0] !== cursor && uniqueDays[0] === cursor - 86400000) {
    cursor = uniqueDays[0];
  }

  let streak = 0;
  for (const day of uniqueDays) {
    if (day === cursor) {
      streak += 1;
      cursor -= 86400000;
    } else if (day < cursor) {
      break;
    }
  }

  return streak;
}

export async function computeRewardContext(userId: string): Promise<RewardContext> {
  await connectDB();

  const [quizRows, mockRows] = await Promise.all([
    UserPerformance.find({ userId, type: "quiz" }).lean(),
    MockExamResult.find({ userId }).lean(),
  ]);

  const quizAttempts = quizRows.reduce((sum, row) => sum + (row.attempts ?? 0), 0);
  const quizAccuracy = quizAttempts
    ? quizRows.reduce((sum, row) => sum + (row.accuracy ?? 0) * (row.attempts ?? 0), 0) / quizAttempts
    : 0;

  const mockAttempts = mockRows.length;
  const mockAvgScorePct = mockAttempts
    ? mockRows.reduce((sum, row) => {
        const totalMarks = row.totalMarks || 1;
        const scorePct = (row.score / totalMarks) * 100;
        return sum + Math.max(0, scorePct);
      }, 0) / mockAttempts
    : 0;

  const streakDays = computeStreakDays([
    ...quizRows.map((q) => new Date(q.lastAttempt ?? q.updatedAt ?? Date.now())),
    ...mockRows.map((m) => new Date(m.createdAt)),
  ]);

  return { quizAttempts, mockAttempts, quizAccuracy, mockAvgScorePct, streakDays };
}

export function computeCredits(ctx: RewardContext): number {
  const quizCredits = ctx.quizAttempts * 10;
  const mockCredits = ctx.mockAttempts * 50;
  const streakBonus = Math.floor(ctx.streakDays / 7) * 50;
  const accuracyBonus = ctx.quizAccuracy >= 85 ? 100 : ctx.quizAccuracy >= 75 ? 50 : 0;
  return quizCredits + mockCredits + streakBonus + accuracyBonus;
}

export function computeBadges(ctx: RewardContext): string[] {
  return BADGE_RULES.filter((r) => r.condition(ctx)).map((r) => r.key);
}

export async function syncUserRewards(userId: string, reason?: string) {
  await connectDB();
  const existingUser = await User.findOne({ email: userId }).lean();
  const previousCredits = typeof existingUser?.credits === "number" ? existingUser.credits : 0;

  const ctx = await computeRewardContext(userId);
  const credits = computeCredits(ctx);
  const badges = computeBadges(ctx);

  const updatePayload: Record<string, unknown> = {
    credits,
    badges,
  };

  if (reason && credits > previousCredits) {
    updatePayload.creditHistory = [
      {
        reason,
        delta: credits - previousCredits,
        createdAt: new Date(),
      },
      ...((existingUser?.creditHistory as { reason: string; delta: number; createdAt: Date }[] | undefined) ?? []),
    ].slice(0, 50);
  }

  const setOnInsertPayload: Record<string, unknown> = {
    name: userId.split("@")[0],
    email: userId,
    ownedRewards: [],
  };
  if (!("creditHistory" in updatePayload)) {
    setOnInsertPayload.creditHistory = [];
  }

  const user = await User.findOneAndUpdate(
    { email: userId },
    {
      $set: updatePayload,
      $setOnInsert: setOnInsertPayload,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  return { user, ctx, credits, badges };
}

export async function redeemReward(userId: string, rewardKey: string) {
  await connectDB();
  const reward = REWARD_CATALOG.find((r) => r.key === rewardKey);
  if (!reward) {
    return { ok: false as const, error: "Reward not found" };
  }

  const { user, ctx } = await syncUserRewards(userId);
  if (!user) {
    return { ok: false as const, error: "User not found" };
  }

  const owned = Array.isArray(user.ownedRewards) ? user.ownedRewards : [];
  if (owned.includes(reward.key)) {
    return { ok: false as const, error: "Reward already owned" };
  }

  if ((user.credits ?? 0) < reward.cost) {
    return { ok: false as const, error: "Insufficient credits" };
  }

  user.credits = (user.credits ?? 0) - reward.cost;
  user.ownedRewards = [...owned, reward.key];
  user.creditHistory = [
    {
      reason: `Redeemed ${reward.name}`,
      delta: -reward.cost,
      createdAt: new Date(),
    },
    ...(Array.isArray(user.creditHistory) ? user.creditHistory : []),
  ].slice(0, 50);

  await user.save();
  return { ok: true as const, reward, user, ctx };
}

export function getRewardProgress(credits: number, cost: number): number {
  if (cost <= 0) return 100;
  return Math.min(100, Math.round((credits / cost) * 100));
}

export async function getRewardsDashboardData(userId: string) {
  const { user, ctx, credits, badges } = await syncUserRewards(userId);
  const ownedRewards = Array.isArray(user?.ownedRewards) ? user.ownedRewards : [];
  const history: { reason: string; delta: number; createdAt: Date }[] = Array.isArray(user?.creditHistory)
    ? (user.creditHistory as { reason: string; delta: number; createdAt: Date }[])
    : [];

  const catalog = REWARD_CATALOG.map((item) => ({
    ...item,
    owned: ownedRewards.includes(item.key),
    progress: getRewardProgress(credits, item.cost),
  }));

  return {
    credits,
    badges,
    context: ctx,
    rewards: catalog,
    ownedRewards,
    history: history
      .slice(0, 20)
      .map((h) => ({ reason: h.reason, delta: h.delta, createdAt: h.createdAt })),
  };
}

