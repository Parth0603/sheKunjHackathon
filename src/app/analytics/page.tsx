import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import UserPerformance from "@/models/UserPerformance";
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

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  await connectDB();
  const performances = await UserPerformance.find({ userId: session.user.email }).sort({ lastAttempt: -1 });
  const examAnalysis = await getExamAnalysis(session.user.email);

  const overallAccuracy = performances.length
    ? performances.reduce((s, p) => s + p.accuracy, 0) / performances.length : 0;
  const totalQuizzes = performances.length;
  const improving = performances.filter((p) => p.trend === "Improving").length;

  const bySubject = performances.reduce((acc: Record<string, { acc: number; count: number; exam: string }>, p) => {
    const key = `${p.exam}::${p.subject}`;
    if (!acc[key]) acc[key] = { acc: 0, count: 0, exam: p.exam };
    acc[key].acc += p.accuracy;
    acc[key].count += 1;
    return acc;
  }, {});

  const subjectRows = Object.entries(bySubject).map(([key, v]) => {
    const [exam, subject] = key.split("::");
    const avg = v.acc / v.count;
    return { exam, subject, avg, count: v.count };
  }).sort((a, b) => a.avg - b.avg);

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
    </div>
  );
}
