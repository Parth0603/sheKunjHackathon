import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import UserPerformance from "@/models/UserPerformance";
import MockExamResult from "@/models/MockExamResult";
import { getExamAnalysis } from "@/lib/analysis";

function SparkBar({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32 }}>
      {values.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 2,
          height: `${(v / max) * 100}%`,
          minHeight: 3,
          background: `rgba(91,95,251,${0.3 + (v / max) * 0.7})`,
        }} />
      ))}
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  const { exam: examFilterRaw } = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  await connectDB();
  const performances = await UserPerformance.find({
    userId: session.user.email,
    type: "quiz",
  }).sort({ lastAttempt: -1 });
  const mockResults = await MockExamResult.find({ userId: session.user.email }).sort({ createdAt: -1 }).lean();
  const examAnalysis = await getExamAnalysis(session.user.email);
  const examFilter = examFilterRaw ? decodeURIComponent(examFilterRaw) : "All";
  const filteredMock = examFilter === "All" ? mockResults : mockResults.filter((r) => r.exam === examFilter);

  const overallAccuracy = performances.length
    ? performances.reduce((s, p) => s + p.accuracy, 0) / performances.length : 0;
  // Sum attempts (not chapter-document count) and guard duplicate chapter rows.
  const chapterAttemptMap: Record<string, number> = {};
  for (const p of performances) {
    const key = `${p.exam}::${p.subject}::${p.chapter}`;
    chapterAttemptMap[key] = (chapterAttemptMap[key] ?? 0) + (typeof p.attempts === "number" ? p.attempts : 0);
  }
  const totalQuizzes = Object.values(chapterAttemptMap).reduce((s, v) => s + v, 0);
  const improving = performances.filter((p) => p.trend === "Improving").length;

  const bySubject = performances.reduce((acc: Record<string, { acc: number; count: number; attempts: number; exam: string }>, p) => {
    const key = `${p.exam}::${p.subject}`;
    if (!acc[key]) acc[key] = { acc: 0, count: 0, attempts: 0, exam: p.exam };
    acc[key].acc += p.accuracy;
    acc[key].count += 1;
    acc[key].attempts += typeof p.attempts === "number" ? p.attempts : 0;
    return acc;
  }, {});

  const subjectRows = Object.entries(bySubject).map(([key, v]) => {
    const [exam, subject] = key.split("::");
    const avg = v.acc / v.count;
    return { exam, subject, avg, count: v.attempts };
  }).sort((a, b) => a.avg - b.avg);

  const avgMockScore = filteredMock.length
    ? filteredMock.reduce((s, r) => s + (r.totalMarks ? (r.score / r.totalMarks) * 100 : 0), 0) / filteredMock.length
    : 0;
  const bestMockScore = filteredMock.length
    ? Math.max(...filteredMock.map((r) => (r.totalMarks ? (r.score / r.totalMarks) * 100 : 0)))
    : 0;
  const last5Mock = [...filteredMock]
    .slice(0, 5)
    .reverse()
    .map((r) => (r.totalMarks ? (r.score / r.totalMarks) * 100 : 0));
  const mockTrend =
    last5Mock.length >= 2
      ? last5Mock[last5Mock.length - 1] > last5Mock[0] + 4
        ? "Improving"
        : last5Mock[last5Mock.length - 1] < last5Mock[0] - 4
        ? "Declining"
        : "Stable"
      : "Stable";
  const topicBucket: Record<string, { correct: number; attempted: number }> = {};
  for (const attempt of filteredMock) {
    for (const t of attempt.topics || []) {
      if (!topicBucket[t.topic]) topicBucket[t.topic] = { correct: 0, attempted: 0 };
      topicBucket[t.topic].correct += t.correct;
      topicBucket[t.topic].attempted += t.attempted;
    }
  }
  const topicStats = Object.entries(topicBucket)
    .map(([topic, s]) => ({ topic, accuracy: s.attempted ? (s.correct / s.attempted) * 100 : 0, correct: s.correct, attempted: s.attempted }))
    .sort((a, b) => a.accuracy - b.accuracy);
  const weakTopics = topicStats.filter((t) => t.attempted > 0 && t.accuracy < 50).slice(0, 4);
  const strongTopics = [...topicStats].filter((t) => t.accuracy > 75).reverse().slice(0, 4);
  const totalWrong = filteredMock.reduce((s, r) => s + r.wrongAnswers, 0);
  const totalNegative = filteredMock.reduce((s, r) => s + r.wrongAnswers * (r.exam === "JEE Advanced" || r.exam === "NEET" ? 1 : 0.67), 0);
  const mockInsights: string[] = [];
  if (totalWrong > 0 && totalNegative > 0.25 * Math.max(filteredMock.length, 1)) {
    mockInsights.push("You are consistently losing marks in negative marking.");
  }
  if (mockTrend === "Declining") {
    mockInsights.push(`Your ${examFilter === "All" ? "overall mock" : examFilter} performance trend is declining.`);
  }
  if (weakTopics[0]) {
    mockInsights.push(`Your performance in ${weakTopics[0].topic} needs attention.`);
  }
  if (strongTopics[0]) {
    mockInsights.push(`Strong in ${strongTopics[0].topic}.`);
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 6 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>insights</span>
          Deep Analytics
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--on-surface)" }}>
          Performance Intelligence
        </h1>
        <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>
          Precision-engineered analysis of your cognitive performance metrics.
        </p>
      </div>

      {/* Top metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Overall Accuracy", value: `${overallAccuracy.toFixed(1)}%`, icon: "target", color: "var(--primary)", sub: "Across all subjects" },
          { label: "Total Quizzes", value: String(totalQuizzes), icon: "quiz", color: "var(--accent-cyan)", sub: "All time" },
          { label: "Improving Subjects", value: String(improving), icon: "trending_up", color: "var(--success)", sub: "Currently trending up" },
          { label: "Exams Tracked", value: String((examAnalysis ?? []).length), icon: "school", color: "var(--secondary)", sub: "Active exams" },
        ].map((m) => (
          <div key={m.label} className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <span className="text-label-caps" style={{ color: "var(--on-surface-variant)" }}>{m.label}</span>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: m.color }}>{m.icon}</span>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: m.color, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {m.value}
            </div>
            <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 6 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Exam breakdown */}
        {(examAnalysis ?? []).map((exam) => (
          <div key={exam.exam} className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 4 }}>{exam.exam}</div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--on-surface)" }}>
                  Subject Breakdown
                </h3>
              </div>
              <Link href={`/learn/${exam.exam.toLowerCase()}`} className="btn btn-ghost" style={{ fontSize: 11, padding: "5px 10px", textDecoration: "none" }}>
                Practice →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {exam.subjects.map((sub: { name: string; accuracy: number }) => {
                const color = sub.accuracy > 75 ? "var(--success)" : sub.accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)";
                return (
                  <div key={sub.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: "var(--on-surface)", fontFamily: "'Inter', sans-serif" }}>{sub.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {sub.accuracy.toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${sub.accuracy}%`, background: `linear-gradient(90deg, ${color}60, ${color})` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Subject rankings table */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--on-surface)" }}>
            Subject Performance Rankings
          </h3>
          <span className="badge badge-surface">Sorted: Weakest First</span>
        </div>
        {subjectRows.length > 0 ? (
          <table className="table-aether" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Exam</th>
                <th>Subject</th>
                <th>Avg Score</th>
                <th>Quizzes</th>
                <th>Trend</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subjectRows.map((row, i) => {
                const color = row.avg > 75 ? "var(--success)" : row.avg >= 50 ? "var(--accent-cyan)" : "var(--error)";
                const historyValues = performances
                  .filter((p) => p.subject === row.subject && p.exam === row.exam)
                  .slice(0, 8)
                  .map((p) => p.accuracy)
                  .reverse();
                return (
                  <tr key={i}>
                    <td style={{ color: "var(--outline)", fontFamily: "'Space Grotesk', sans-serif", width: 40 }}>{i + 1}</td>
                    <td><span className="badge badge-primary" style={{ fontSize: 10 }}>{row.exam}</span></td>
                    <td style={{ fontWeight: 500 }}>{row.subject}</td>
                    <td>
                      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color }}>{row.avg.toFixed(0)}%</span>
                    </td>
                    <td style={{ color: "var(--on-surface-variant)" }}>{row.count}</td>
                    <td style={{ width: 80 }}><SparkBar values={historyValues.length ? historyValues : [row.avg]} /></td>
                    <td>
                      <Link href={`/analysis/${encodeURIComponent(row.exam.toLowerCase())}/${encodeURIComponent(row.subject)}`}
                        className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 8px", textDecoration: "none" }}>
                        Drill →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 40, color: "var(--outline)", display: "block", marginBottom: 10 }}>bar_chart</span>
            <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>No analytics data yet. Complete some quizzes to see your performance breakdown.</p>
            <Link href="/learn" className="btn btn-primary" style={{ marginTop: 16, fontSize: 13, textDecoration: "none" }}>
              Start Practicing
            </Link>
          </div>
        )}
      </div>

      {/* Recent attempts */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16 }}>
          Recent Quiz Attempts
        </h3>
        {performances.slice(0, 10).map((p, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: p.accuracy > 75 ? "var(--success)" : p.accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--on-surface)" }}>{p.chapter}</div>
                <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{p.subject} · {p.exam}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{new Date(p.lastAttempt).toLocaleDateString()}</span>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: p.accuracy > 75 ? "var(--success)" : p.accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)" }}>
                {p.accuracy.toFixed(0)}%
              </span>
              <span style={{ fontSize: 11, color: p.trend === "Improving" ? "var(--success)" : p.trend === "Declining" ? "var(--error)" : "var(--outline)" }}>
                {p.trend === "Improving" ? "↑" : p.trend === "Declining" ? "↓" : "→"}
              </span>
            </div>
          </div>
        ))}
        {performances.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)", textAlign: "center", padding: "24px 0" }}>No quiz attempts yet.</p>
        )}
      </div>

      {/* Mock Exam Analytics */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--on-surface)" }}>
            Mock Exam Analytics
          </h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["All", "JEE Advanced", "GATE", "NEET", "UPSC"].map((e) => (
              <Link key={e} href={e === "All" ? "/analytics" : `/analytics?exam=${encodeURIComponent(e)}`} className={`badge ${examFilter === e ? "badge-primary" : "badge-surface"}`} style={{ textDecoration: "none" }}>
                {e}
              </Link>
            ))}
          </div>
        </div>

        {filteredMock.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>No mock exam attempts yet for this filter.</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
              {[
                { label: "Average Score", value: `${avgMockScore.toFixed(1)}%`, color: "var(--primary)" },
                { label: "Best Score", value: `${bestMockScore.toFixed(1)}%`, color: "var(--success)" },
                { label: "Total Attempts", value: String(filteredMock.length), color: "var(--accent-cyan)" },
              ].map((m) => (
                <div key={m.label} className="card" style={{ padding: 14 }}>
                  <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{m.label}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div className="text-label-caps" style={{ color: "var(--on-surface-variant)", marginBottom: 8 }}>Last 5 Scores · {mockTrend}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {(last5Mock.length ? last5Mock : [0]).map((v, i) => (
                  <div key={i} style={{ padding: 10, borderRadius: 8, background: "var(--surface-container-high)" }}>
                    <div style={{ height: 50, display: "flex", alignItems: "flex-end" }}>
                      <div style={{ width: "100%", borderRadius: 4, height: `${Math.max(8, v)}%`, background: "linear-gradient(180deg,var(--primary),var(--accent-cyan))" }} />
                    </div>
                    <div style={{ fontSize: 10, color: "var(--on-surface-variant)", marginTop: 4 }}>{v.toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div className="card" style={{ padding: 12 }}>
                <div className="text-label-caps" style={{ color: "var(--error)", marginBottom: 8 }}>Weak Topics</div>
                {weakTopics.length > 0 ? weakTopics.map((t) => (
                  <div key={t.topic} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                    <span>{t.topic}</span><span>{t.accuracy.toFixed(0)}%</span>
                  </div>
                )) : <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>No weak topics detected.</span>}
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div className="text-label-caps" style={{ color: "var(--success)", marginBottom: 8 }}>Strong Topics</div>
                {strongTopics.length > 0 ? strongTopics.map((t) => (
                  <div key={t.topic} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                    <span>{t.topic}</span><span>{t.accuracy.toFixed(0)}%</span>
                  </div>
                )) : <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>No strong topics yet.</span>}
              </div>
            </div>

            <div className="card" style={{ padding: 12, marginBottom: 12 }}>
              <div className="text-label-caps" style={{ color: "var(--accent-cyan)", marginBottom: 8 }}>Performance Breakdown</div>
              <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
                <span>Correct: {filteredMock.reduce((s, r) => s + r.correctAnswers, 0)}</span>
                <span>Wrong: {filteredMock.reduce((s, r) => s + r.wrongAnswers, 0)}</span>
                <span>Negative Impact: -{totalNegative.toFixed(2)}</span>
              </div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div className="text-label-caps" style={{ color: "var(--secondary)", marginBottom: 8 }}>Insights</div>
              {mockInsights.length > 0 ? mockInsights.map((i, idx) => (
                <div key={idx} style={{ fontSize: 12, marginBottom: 6 }}>• {i}</div>
              )) : <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>No strong signal yet. Keep attempting mocks.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
