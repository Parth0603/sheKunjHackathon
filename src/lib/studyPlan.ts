import UserPerformance from "@/models/UserPerformance";
import MockExamResult from "@/models/MockExamResult";
import { mockExams } from "@/data/mockData";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type Day = (typeof DAYS)[number];

type PlanTask = {
  subject: string;
  chapter: string;
  type: "REVISION" | "PRACTICE" | "NEW" | "MOCK";
  durationMinutes: number;
  priority: "high" | "medium" | "low";
};

type WeeklyPlan = Record<Day, PlanTask[]>;

type Perf = {
  exam: string;
  subject: string;
  chapter: string;
  accuracy: number;
  trend: "Improving" | "Declining" | "Stable";
};

function emptyPlan(): WeeklyPlan {
  return { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
}

function pickDuration(type: PlanTask["type"], accuracy?: number): number {
  if (type === "MOCK") return 180;
  if (type === "NEW") return 45;
  if (type === "REVISION") return accuracy !== undefined && accuracy < 35 ? 90 : 75;
  if (type === "PRACTICE") return accuracy !== undefined && accuracy < 60 ? 60 : 45;
  return 30;
}

export async function generateAdaptiveWeeklyPlan(userId: string) {
  const rows = (await UserPerformance.find({ userId }).lean()) as Perf[];
  const recentMocks = (await MockExamResult.find({ userId }).sort({ createdAt: -1 }).limit(5).lean()) as {
    exam: string;
    weakAreas?: string[];
  }[];
  const mockWeakTopics = recentMocks.flatMap((m) => (m.weakAreas || []).map((topic: string) => ({ topic, exam: m.exam })));

  const weak = rows.filter((r) => r.accuracy < 50).sort((a, b) => a.accuracy - b.accuracy);
  const moderate = rows.filter((r) => r.accuracy >= 50 && r.accuracy <= 75).sort((a, b) => a.accuracy - b.accuracy);
  const strong = rows.filter((r) => r.accuracy > 75).sort((a, b) => b.accuracy - a.accuracy);
  const declining = rows.filter((r) => r.trend === "Declining").sort((a, b) => a.accuracy - b.accuracy);
  for (const m of mockWeakTopics) {
    const exists = weak.some((w) => w.chapter === m.topic);
    if (!exists) {
      const candidate = rows.find((r) => r.chapter === m.topic) || rows[0];
      if (candidate) {
        weak.unshift({ ...candidate, accuracy: Math.min(candidate.accuracy, 45) });
      }
    }
  }

  const plan = emptyPlan();
  const taken = new Set<string>();

  const byExamSubject = new Set(rows.map((r) => `${r.exam}::${r.subject}`));
  const allCandidateNew: { subject: string; chapter: string }[] = [];
  for (const exam of mockExams) {
    for (const subject of exam.subjects) {
      if (!byExamSubject.has(`${exam.name}::${subject.name}`) && !byExamSubject.has(`${exam.id.toUpperCase()}::${subject.name}`)) continue;
      for (const ch of subject.chapters) {
        const exists = rows.some((r) => r.subject === subject.name && r.chapter.toLowerCase() === ch.name.toLowerCase());
        if (!exists) allCandidateNew.push({ subject: subject.name, chapter: ch.name });
      }
    }
  }

  const dailyWeakSource = weak.length > 0 ? weak : declining;

  DAYS.forEach((day, idx) => {
    if (day === "Sat") {
      plan[day].push({ subject: "All Subjects", chapter: "Full-Length Mock Exam", type: "MOCK", durationMinutes: 180, priority: "high" });
      return;
    }

    const weakPick = dailyWeakSource[idx % Math.max(dailyWeakSource.length, 1)];
    if (weakPick) {
      const key = `REVISION:${weakPick.subject}:${weakPick.chapter}`;
      if (!taken.has(key)) {
        plan[day].push({
          subject: weakPick.subject,
          chapter: weakPick.chapter,
          type: "REVISION",
          durationMinutes: pickDuration("REVISION", weakPick.accuracy),
          priority: "high",
        });
        taken.add(key);
      }
    }

    const moderatePick = moderate[idx % Math.max(moderate.length, 1)] || declining[idx % Math.max(declining.length, 1)];
    if (moderatePick) {
      const key = `PRACTICE:${moderatePick.subject}:${moderatePick.chapter}`;
      if (!taken.has(key)) {
        plan[day].push({
          subject: moderatePick.subject,
          chapter: moderatePick.chapter,
          type: "PRACTICE",
          durationMinutes: pickDuration("PRACTICE", moderatePick.accuracy),
          priority: moderatePick.trend === "Declining" ? "high" : "medium",
        });
        taken.add(key);
      }
    }

    const newPick = allCandidateNew[idx % Math.max(allCandidateNew.length, 1)];
    if (newPick && day !== "Sun") {
      plan[day].push({
        subject: newPick.subject,
        chapter: newPick.chapter,
        type: "NEW",
        durationMinutes: pickDuration("NEW"),
        priority: "low",
      });
    }
  });

  if (strong.length > 0) {
    const s = strong[0];
    plan.Sun.push({
      subject: s.subject,
      chapter: s.chapter,
      type: "PRACTICE",
      durationMinutes: 30,
      priority: "low",
    });
  }

  const mockCount = DAYS.reduce((acc, d) => acc + plan[d].filter((t) => t.type === "MOCK").length, 0);
  const insights = [
    weak.length > 0
      ? "You are focusing more on weak areas this week"
      : "Your plan is balanced across practice and revision",
    `${mockCount} mock exams scheduled`,
  ];

  return {
    weeklyPlan: plan,
    insights,
    metrics: {
      weakCount: weak.length,
      moderateCount: moderate.length,
      strongCount: strong.length,
      decliningCount: declining.length,
    },
  };
}
