import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getChapterAnalysis } from "@/lib/analysis";
import { mockExams } from "@/data/mockData";

export default async function ChapterAnalysisPage({ params }: { params: Promise<{ exam: string; subject: string; chapter: string }> }) {
  const { exam: examParam, subject: subjectParam, chapter: chapterParam } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const chapterName = decodeURIComponent(chapterParam);
  const subjectName = decodeURIComponent(subjectParam);
  const examName = decodeURIComponent(examParam);
  const data = await getChapterAnalysis(session.user.email, chapterName);
  if (!data) notFound();

  const examData = mockExams.find((e) => e.id === examName || e.name.toLowerCase() === examName.toLowerCase());
  const subjectData = examData?.subjects.find((s) => s.name === data.subject || s.id === subjectName);
  const chapterData = subjectData?.chapters.find((c) => c.name === data.chapter);
  const learnHref = examData && subjectData && chapterData ? `/learn/${examData.id}/${subjectData.id}/${chapterData.id}` : "/learn";
  const backHref = `/analysis/${encodeURIComponent(examName)}/${encodeURIComponent(data.subject)}`;

  const toneColor = data.strength === "Strong" ? "var(--success)" : data.strength === "Moderate" ? "var(--accent-cyan)" : "var(--error)";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      {/* Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <Link href="/analytics" className="badge badge-surface" style={{ textDecoration: "none", cursor: "pointer" }}>Analytics</Link>
        <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--outline)" }}>chevron_right</span>
        <Link href={backHref} className="badge badge-surface" style={{ textDecoration: "none", cursor: "pointer" }}>{data.subject}</Link>
        <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--outline)" }}>chevron_right</span>
        <span className="badge badge-primary">{data.chapter}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Header Card */}
          <div className="card" style={{ padding: 32, background: "linear-gradient(135deg, rgba(91,95,251,0.08), rgba(124,58,237,0.04))" }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--on-surface)", marginBottom: 8 }}>
              {data.chapter}
            </h1>
            <p style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>
              {examName.toUpperCase()} · {data.subject}
            </p>
          </div>

          {/* Master Progress */}
          <div className="card" style={{ padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, color: "var(--on-surface)" }}>
                Module Mastery
              </h3>
              <span className="badge" style={{
                background: `${toneColor}15`, color: toneColor, border: `1px solid ${toneColor}40`
              }}>
                {data.strength}
              </span>
            </div>
            <div className="progress-bar" style={{ height: 10, marginBottom: 12 }}>
              <div className="progress-bar-fill" style={{ width: `${data.accuracy}%`, background: toneColor }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--on-surface-variant)" }}>
              <span>0%</span>
              <span style={{ fontWeight: 600, color: "var(--on-surface)" }}>{data.accuracy.toFixed(0)}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Insight Card */}
          <div className="card" style={{ padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--secondary)" }}>psychology</span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, color: "var(--on-surface)" }}>
                AI Diagnostic
              </h3>
            </div>
            <div style={{
              padding: 20, borderRadius: 12,
              background: "var(--surface-container-high)",
              border: "1px solid rgba(255,255,255,0.05)",
              fontSize: 14, color: "var(--on-surface)", lineHeight: 1.6
            }}>
              {data.strength === "Weak"
                ? `Your accuracy in ${data.chapter} is critical (${data.accuracy.toFixed(0)}%). It is highly recommended to review the AI notes and retake the practice quiz.`
                : data.strength === "Moderate"
                ? `You are showing steady progress in ${data.chapter}. Additional practice quiz attempts will help push this module to mastery level.`
                : `Outstanding performance on ${data.chapter}. Your metrics indicate strong retention. Maintain this consistency.`}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Key Metrics */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16 }}>
              Performance Metrics
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Current Accuracy</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--on-surface)" }}>{data.accuracy.toFixed(0)}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Total Attempts</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--on-surface)" }}>{data.attempts}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Last Score</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--on-surface)" }}>{data.lastScore.toFixed(0)}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Historical Trend</span>
                <span style={{
                  fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
                  color: data.trend === "Improving" ? "var(--success)" : data.trend === "Declining" ? "var(--error)" : "var(--outline)"
                }}>
                  {data.trend === "Improving" ? "↑" : data.trend === "Declining" ? "↓" : "→"} {data.trend}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card" style={{ padding: 24, background: "linear-gradient(135deg, rgba(34,199,240,0.08), rgba(91,95,251,0.08))" }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16 }}>
              Actions
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href={learnHref} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}>
                Retake Module Quiz
              </Link>
              <Link href={backHref} className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}>
                Return to {data.subject}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
