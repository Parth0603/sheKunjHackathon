import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType } from "docx";
import puppeteer from "puppeteer";
import { connectDB } from "@/lib/mongodb";
import UserPerformance from "@/models/UserPerformance";
import MockExamResult from "@/models/MockExamResult";
import User from "@/models/User";
import { geminiModel } from "@/lib/gemini";

export type ExportFormat = "pdf" | "docx";

type Trend = "Improving" | "Declining" | "Stable";

type ReportData = {
  userName: string;
  generatedAt: Date;
  totalQuizzes: number;
  overallAccuracy: number;
  streak: number;
  subjectsAttempted: { subject: string; accuracy: number; attempts: number }[];
  strongTopics: { chapter: string; accuracy: number }[];
  weakTopics: { chapter: string; accuracy: number }[];
  trends: { improving: string[]; declining: string[]; stable: string[] };
  mockSummary: { attempts: number; avgScorePct: number; bestScorePct: number };
  studyTimeMinutes: number | null;
  achievements: string[];
  aiInsights: {
    performanceSummary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  emptyState: boolean;
};

function safeArray<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : [];
}

function computeStreak(timestamps: Date[]): number {
  const uniqueDays = Array.from(new Set(timestamps.map((ts) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }))).sort((a, b) => b - a);

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

function extractJsonObject(input: string): string {
  const cleaned = input.replace(/```json\n?|```\n?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) throw new Error("Invalid JSON from model");
  return cleaned.slice(start, end + 1);
}

async function generateAiInsights(data: Omit<ReportData, "aiInsights">): Promise<ReportData["aiInsights"]> {
  if (data.emptyState) {
    return {
      performanceSummary: "You have not completed any activity this week. Start learning to generate insights.",
      strengths: [],
      weaknesses: [],
      recommendations: ["Take your first quiz", "Attempt one mock exam", "Build a 7-day consistency streak"],
    };
  }

  const prompt = `You are an academic performance analyst. Based on this weekly data, return concise JSON only.

Data:
- Total quizzes: ${data.totalQuizzes}
- Accuracy: ${data.overallAccuracy.toFixed(1)}
- Streak: ${data.streak}
- Subjects: ${data.subjectsAttempted.map((s) => `${s.subject} (${s.accuracy.toFixed(1)}%)`).join(", ") || "None"}
- Strong topics: ${data.strongTopics.map((t) => t.chapter).join(", ") || "None"}
- Weak topics: ${data.weakTopics.map((t) => t.chapter).join(", ") || "None"}
- Improving: ${data.trends.improving.join(", ") || "None"}
- Declining: ${data.trends.declining.join(", ") || "None"}
- Mock attempts: ${data.mockSummary.attempts}, avg mock score %: ${data.mockSummary.avgScorePct.toFixed(1)}

Return JSON with shape:
{
  "performanceSummary": "...",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "recommendations": ["..."]
}`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(extractJsonObject(text)) as ReportData["aiInsights"];

    return {
      performanceSummary: parsed.performanceSummary || "Your weekly performance data is available.",
      strengths: safeArray(parsed.strengths).slice(0, 5),
      weaknesses: safeArray(parsed.weaknesses).slice(0, 5),
      recommendations: safeArray(parsed.recommendations).slice(0, 6),
    };
  } catch {
    return {
      performanceSummary: "You showed progress in multiple areas this week. Continue focused revision on weak topics.",
      strengths: data.strongTopics.map((t) => t.chapter).slice(0, 5),
      weaknesses: data.weakTopics.map((t) => t.chapter).slice(0, 5),
      recommendations: [
        ...(data.weakTopics[0] ? [`Revise ${data.weakTopics[0].chapter}`] : ["Take a focused quiz"]),
        "Attempt one mixed-difficulty quiz",
        "Review errors from recent mock exams",
      ],
    };
  }
}

export async function buildWeeklyReport(userId: string): Promise<ReportData> {
  await connectDB();

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 7);

  const [quizRows, mockRows, user] = await Promise.all([
    UserPerformance.find({ userId, type: "quiz", lastAttempt: { $gte: from } }).lean(),
    MockExamResult.find({ userId, createdAt: { $gte: from } }).lean(),
    User.findOne({ email: userId }).lean(),
  ]);

  const totalQuizzes = quizRows.reduce((sum, r) => sum + (r.attempts ?? 0), 0);
  const weightedAccuracySum = quizRows.reduce((sum, r) => sum + (r.accuracy ?? 0) * (r.attempts ?? 0), 0);
  const overallAccuracy = totalQuizzes > 0 ? weightedAccuracySum / totalQuizzes : 0;

  const subjectMap = new Map<string, { weightedAcc: number; attempts: number }>();
  for (const row of quizRows) {
    const key = row.subject;
    const prev = subjectMap.get(key) ?? { weightedAcc: 0, attempts: 0 };
    prev.weightedAcc += (row.accuracy ?? 0) * (row.attempts ?? 0);
    prev.attempts += row.attempts ?? 0;
    subjectMap.set(key, prev);
  }

  const subjectsAttempted = Array.from(subjectMap.entries()).map(([subject, v]) => ({
    subject,
    attempts: v.attempts,
    accuracy: v.attempts > 0 ? v.weightedAcc / v.attempts : 0,
  })).sort((a, b) => b.accuracy - a.accuracy);

  const strongTopics = quizRows
    .filter((r) => (r.accuracy ?? 0) >= 75)
    .map((r) => ({ chapter: r.chapter, accuracy: r.accuracy ?? 0 }))
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 6);

  const weakTopics = quizRows
    .filter((r) => (r.accuracy ?? 0) < 50)
    .map((r) => ({ chapter: r.chapter, accuracy: r.accuracy ?? 0 }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 6);

  const trends = {
    improving: quizRows.filter((r) => r.trend === "Improving").map((r) => r.chapter),
    declining: quizRows.filter((r) => r.trend === "Declining").map((r) => r.chapter),
    stable: quizRows.filter((r) => r.trend === "Stable").map((r) => r.chapter),
  };

  const mockAttempts = mockRows.length;
  const mockScorePctList = mockRows.map((m) => {
    const total = m.totalMarks || 1;
    return (m.score / total) * 100;
  });
  const mockSummary = {
    attempts: mockAttempts,
    avgScorePct: mockAttempts ? mockScorePctList.reduce((a, b) => a + b, 0) / mockAttempts : 0,
    bestScorePct: mockAttempts ? Math.max(...mockScorePctList) : 0,
  };

  const studyTimeMinutes = mockAttempts
    ? mockRows.reduce((sum, m) => sum + (m.timeTaken ?? 0), 0) / 60
    : null;

  const streak = computeStreak([
    ...quizRows.map((q) => new Date(q.lastAttempt ?? now)),
    ...mockRows.map((m) => new Date(m.createdAt)),
  ]);

  const achievements = safeArray(user?.badges as string[]);
  const emptyState = totalQuizzes === 0 && mockAttempts === 0;

  const baseData: Omit<ReportData, "aiInsights"> = {
    userName: (user?.name as string) || userId.split("@")[0],
    generatedAt: now,
    totalQuizzes,
    overallAccuracy,
    streak,
    subjectsAttempted,
    strongTopics,
    weakTopics,
    trends,
    mockSummary,
    studyTimeMinutes,
    achievements,
    emptyState,
  };

  const aiInsights = await generateAiInsights(baseData);
  return { ...baseData, aiInsights };
}

function sectionLines(title: string, lines: string[]): string[] {
  return [title, ...lines, ""];
}

export function toPlainLines(data: ReportData): string[] {
  if (data.emptyState) {
    return [
      "Weekly Performance Report",
      "",
      "You have not completed any activity this week. Start learning to generate insights.",
      "",
      `Generated on: ${data.generatedAt.toLocaleString()}`,
    ];
  }

  const lines: string[] = [];
  lines.push("Weekly Performance Report", "");

  lines.push(...sectionLines("1. Overview", [
    `- Total quizzes (last 7 days): ${data.totalQuizzes}`,
    `- Overall accuracy: ${data.overallAccuracy.toFixed(1)}%`,
    `- Streak: ${data.streak} day(s)`,
    `- Mock attempts: ${data.mockSummary.attempts}`,
  ]));

  lines.push(...sectionLines("2. Subject Performance", data.subjectsAttempted.length
    ? data.subjectsAttempted.map((s) => `- ${s.subject}: ${s.accuracy.toFixed(1)}% (${s.attempts} attempts)`)
    : ["- No subject attempts this week"]));

  lines.push(...sectionLines("3. Strengths", data.strongTopics.length
    ? data.strongTopics.map((t) => `- ${t.chapter} (${t.accuracy.toFixed(1)}%)`)
    : ["- No strong topics identified yet"]));

  lines.push(...sectionLines("4. Weak Areas", data.weakTopics.length
    ? data.weakTopics.map((t) => `- ${t.chapter} (${t.accuracy.toFixed(1)}%)`)
    : ["- No weak topics identified yet"]));

  lines.push(...sectionLines("5. Trends", [
    `- Improving: ${data.trends.improving.join(", ") || "None"}`,
    `- Declining: ${data.trends.declining.join(", ") || "None"}`,
    `- Stable: ${data.trends.stable.join(", ") || "None"}`,
  ]));

  lines.push(...sectionLines("6. AI Insights", [
    `- Summary: ${data.aiInsights.performanceSummary}`,
    ...(data.aiInsights.strengths.length ? data.aiInsights.strengths.map((s) => `- Strength: ${s}`) : []),
    ...(data.aiInsights.weaknesses.length ? data.aiInsights.weaknesses.map((w) => `- Weakness: ${w}`) : []),
  ]));

  lines.push(...sectionLines("7. Recommendations", data.aiInsights.recommendations.length
    ? data.aiInsights.recommendations.map((r) => `- ${r}`)
    : ["- Continue with consistent daily practice"]));

  lines.push(...sectionLines("Additional Metrics", [
    `- Study time tracked: ${data.studyTimeMinutes ? `${Math.round(data.studyTimeMinutes)} minutes` : "Not tracked"}`,
    `- Achievements unlocked: ${data.achievements.join(", ") || "None"}`,
    `- Generated on: ${data.generatedAt.toLocaleString()}`,
  ]));

  return lines;
}

export async function renderReportPdfBuffer(data: ReportData): Promise<Buffer> {
  const esc = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const listOrEmpty = (items: string[], emptyText: string) =>
    items.length
      ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
      : `<p class="muted">${esc(emptyText)}</p>`;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        --bg: #ffffff;
        --text: #0f172a;
        --muted: #475569;
        --line: #e2e8f0;
        --accent: #1d4ed8;
        --danger: #b91c1c;
        --success: #166534;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 28px;
        background: var(--bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
      }
      h1, h2 { margin: 0; }
      .header {
        margin-bottom: 20px;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--line);
      }
      .subtitle { margin-top: 6px; color: var(--muted); font-size: 12px; }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 18px;
      }
      .stat {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 10px;
        background: #f8fafc;
      }
      .stat .label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
      .stat .value { margin-top: 4px; font-size: 18px; font-weight: 700; }
      .section {
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 12px;
      }
      .section h2 { font-size: 15px; margin-bottom: 8px; }
      ul { margin: 0; padding-left: 18px; }
      li { margin: 4px 0; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chip {
        display: inline-block;
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 12px;
        border: 1px solid var(--line);
      }
      .chip.weak { border-color: #fecaca; color: var(--danger); background: #fef2f2; }
      .chip.strong { border-color: #bbf7d0; color: var(--success); background: #f0fdf4; }
      .muted { color: var(--muted); }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Weekly Study Report</h1>
      <div class="subtitle">User: ${esc(data.userName)} | Generated: ${esc(data.generatedAt.toLocaleString())}</div>
    </div>

    <div class="grid">
      <div class="stat"><div class="label">Weekly Quizzes</div><div class="value">${data.totalQuizzes}</div></div>
      <div class="stat"><div class="label">Accuracy</div><div class="value">${data.overallAccuracy.toFixed(1)}%</div></div>
      <div class="stat"><div class="label">Streak</div><div class="value">${data.streak} day(s)</div></div>
    </div>

    <div class="section">
      <h2>Weak Topics</h2>
      ${
        data.weakTopics.length
          ? `<div class="chips">${data.weakTopics.map((t) => `<span class="chip weak">${esc(`${t.chapter} (${t.accuracy.toFixed(1)}%)`)}</span>`).join("")}</div>`
          : `<p class="muted">No weak topics identified this week.</p>`
      }
    </div>

    <div class="section">
      <h2>Strong Topics</h2>
      ${
        data.strongTopics.length
          ? `<div class="chips">${data.strongTopics.map((t) => `<span class="chip strong">${esc(`${t.chapter} (${t.accuracy.toFixed(1)}%)`)}</span>`).join("")}</div>`
          : `<p class="muted">No strong topics identified yet.</p>`
      }
    </div>

    <div class="section">
      <h2>Recommendations</h2>
      ${listOrEmpty(data.aiInsights.recommendations, "Continue consistent daily practice.")}
    </div>
  </body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", right: "12mm", bottom: "16mm", left: "12mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function renderReportDocxBuffer(data: ReportData): Promise<Buffer> {
  const lines = toPlainLines(data);
  const children: Paragraph[] = [];

  children.push(new Paragraph({
    text: "Weekly Performance Report",
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
  }));

  for (const line of lines.slice(2)) {
    if (!line) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    if (/^\d+\./.test(line)) {
      children.push(new Paragraph({ text: line, heading: HeadingLevel.HEADING_2 }));
      continue;
    }

    if (line.startsWith("- ")) {
      children.push(new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun(line.slice(2))],
      }));
      continue;
    }

    children.push(new Paragraph({ text: line }));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export function formatReportFileName(userName: string, date: Date, format: ExportFormat): string {
  const safeUser = userName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `Study_Report_${safeUser}_${y}-${m}-${d}.${format}`;
}
