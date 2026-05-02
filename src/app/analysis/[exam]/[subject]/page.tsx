import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSubjectAnalysis } from "@/lib/analysis";

export default async function SubjectAnalysisPage({ params }: { params: Promise<{ exam: string; subject: string }> }) {
  const { exam, subject } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const data = await getSubjectAnalysis(session.user.email, decodeURIComponent(subject));
  if (!data) notFound();

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Link href="/analytics" className="badge badge-surface" style={{ textDecoration: "none", cursor: "pointer" }}>Analytics</Link>
          <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--outline)" }}>chevron_right</span>
          <span className="badge badge-primary">{decodeURIComponent(exam).toUpperCase()}</span>
          <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--outline)" }}>chevron_right</span>
          <span className="badge badge-surface" style={{ color: "var(--on-surface)" }}>{data.subject}</span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--on-surface)" }}>
          {data.subject} Diagnostics
        </h1>
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 6 }}>
          Subject-level performance analysis and deep module breakdown.
        </p>
      </div>

      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Avg Accuracy", value: `${data.avgAccuracy.toFixed(0)}%`, color: "var(--primary)" },
          { label: "Total Attempts", value: data.totalAttempts.toString(), color: "var(--accent-cyan)" },
          { label: "Strong Modules", value: data.strongChapters.length.toString(), color: "var(--success)" },
          { label: "Weak Modules", value: data.weakChapters.length.toString(), color: "var(--error)" },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <div className="text-label-caps" style={{ color: "var(--on-surface-variant)", marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: stat.color, lineHeight: 1 }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Overall Mastery Bar */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, color: "var(--on-surface)" }}>
            Overall Subject Mastery
          </h3>
          <span className="badge" style={{
            background: data.strength === "Strong" ? "rgba(74,222,128,0.15)" : data.strength === "Moderate" ? "rgba(34,199,240,0.15)" : "rgba(255,180,171,0.15)",
            color: data.strength === "Strong" ? "var(--success)" : data.strength === "Moderate" ? "var(--accent-cyan)" : "var(--error)",
            border: `1px solid ${data.strength === "Strong" ? "var(--success)" : data.strength === "Moderate" ? "var(--accent-cyan)" : "var(--error)"}40`
          }}>
            {data.strength}
          </span>
        </div>
        <div className="progress-bar" style={{ height: 8 }}>
          <div className="progress-bar-fill" style={{
            width: `${data.avgAccuracy}%`,
            background: data.strength === "Strong" ? "var(--success)" : data.strength === "Moderate" ? "var(--accent-cyan)" : "var(--error)",
          }} />
        </div>
      </div>

      {/* Chapter breakdown */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--primary)" }}>account_tree</span>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, color: "var(--on-surface)" }}>
            Module Breakdown
          </h3>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {data.chapters.map((ch, i) => {
            const toneColor = ch.strength === "Strong" ? "var(--success)" : ch.strength === "Moderate" ? "var(--accent-cyan)" : "var(--error)";
            return (
              <Link key={i} href={`/analysis/${encodeURIComponent(exam)}/${encodeURIComponent(subject)}/${encodeURIComponent(ch.chapter)}`} style={{ textDecoration: "none" }}>
                <div className="card hover-bg-high" style={{ padding: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--on-surface)" }}>
                      {ch.chapter}
                    </h4>
                    <span className="text-label-caps" style={{ color: toneColor }}>{ch.strength}</span>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: 10 }}>
                    <div className="progress-bar-fill" style={{ width: `${ch.accuracy}%`, background: toneColor }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--on-surface-variant)" }}>
                    <span>{ch.accuracy.toFixed(0)}% Accuracy</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 14, color: ch.trend === "Improving" ? "var(--success)" : ch.trend === "Declining" ? "var(--error)" : "var(--outline)" }}>
                        {ch.trend === "Improving" ? "trending_up" : ch.trend === "Declining" ? "trending_down" : "trending_flat"}
                      </span>
                      {ch.trend}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
