import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import UserPerformance from "@/models/UserPerformance";
import { buildSmartGuidance, getExamAnalysis } from "@/lib/analysis";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  await connectDB();
  const performances = await UserPerformance.find({ userId: session.user.email }).sort({ lastAttempt: -1 });

  const examAnalysis = await getExamAnalysis(session.user.email);
  const subjectMastery = (examAnalysis ?? []).flatMap((e) =>
    e.subjects.map((s: { name: string; accuracy: number }) => ({ name: s.name, accuracy: s.accuracy, exam: e.exam }))
  );

  const guidance = buildSmartGuidance(
    performances.map((p) => ({
      exam: p.exam,
      subject: p.subject,
      chapter: p.chapter,
      accuracy: p.accuracy,
      trend: p.trend,
      history: Array.isArray(p.history) ? p.history : [],
    }))
  );

  const overallAccuracy = performances.length
    ? performances.reduce((sum, p) => sum + p.accuracy, 0) / performances.length
    : 0;
  const { weakTopics, strongTopics } = guidance;
  const insights = [...guidance.insights];
  const recommendations = [...guidance.recommendations];
  const streak = 7; // mock streak
  const rank = 128; // mock rank
  const credits = 1240; // mock neural credits

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            position: "relative", width: 52, height: 52, borderRadius: 12,
            overflow: "hidden", border: "2px solid rgba(91,95,251,0.4)",
            boxShadow: "0 0 20px rgba(91,95,251,0.2)",
            flexShrink: 0,
          }}>
            {session.user?.image ? (
              <Image src={session.user.image} alt="Profile" fill style={{ objectFit: "cover" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%", display: "flex", alignItems: "center",
                justifyContent: "center", background: "linear-gradient(135deg, #5b5ffb, #7c3aed)",
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "white",
              }}>
                {session.user?.name?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 3 }}>
              Neural Core · Elite Level IV
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--on-surface)", lineHeight: 1.2 }}>
              Welcome back, {session.user?.name?.split(" ")[0]}
            </h1>
            <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
              Your neural pathways indicate optimal readiness for deep work.
            </p>
          </div>
        </div>
        <Link href="/learn" className="btn btn-primary" style={{ flexShrink: 0, textDecoration: "none" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>bolt</span>
          Start Learning
        </Link>
      </div>

      {/* Top stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { icon: "track_changes", label: "Overall Mastery", value: `${overallAccuracy.toFixed(0)}%`, color: "var(--primary)" },
          { icon: "quiz", label: "Quizzes Taken", value: String(performances.length), color: "var(--accent-cyan)" },
          { icon: "local_fire_department", label: "Day Streak", value: `${streak}d`, color: "var(--tertiary)" },
          { icon: "military_tech", label: "Neural Credits", value: credits.toLocaleString(), color: "var(--secondary)" },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span className="text-label-caps" style={{ color: "var(--on-surface-variant)" }}>{stat.label}</span>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: stat.color }}>{stat.icon}</span>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 320px", gap: 20 }}>
        {/* Left: Adaptive Plan */}
        <div style={{ gridColumn: "1 / 3", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Adaptive Plan banner */}
          <div className="card" style={{
            padding: 24,
            background: "linear-gradient(135deg, rgba(91,95,251,0.15) 0%, rgba(124,58,237,0.1) 100%)",
            border: "1px solid rgba(91,95,251,0.3)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
              <div>
                <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 6 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>auto_awesome</span>
                  Today&apos;s Adaptive Plan
                </div>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: "var(--on-surface)", marginBottom: 6 }}>
                  Estimated session: 4h 20m
                </h2>
                <p style={{ fontSize: 13, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                  {insights.length > 0
                    ? insights[0].message
                    : "System analysis recalibrated today's queue to prioritize weak topic revision before advancing to new material."}
                </p>
              </div>
              <Link href="/study-plan" className="btn btn-secondary" style={{ flexShrink: 0, fontSize: 13, textDecoration: "none" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>calendar_today</span>
                Full Plan
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { label: "Focus Areas", value: Math.max(weakTopics.length, 2), icon: "target" },
                { label: "Revision Queue", value: Math.max(recommendations.length, 3), icon: "refresh" },
                { label: "New Material", value: 4, icon: "new_releases" },
              ].map((item) => (
                <div key={item.label} style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 20, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "var(--on-surface)" }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif", marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Performance */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--on-surface)" }}>
                Subject Performance
              </h3>
              <Link href="/analytics" className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 10px", textDecoration: "none" }}>
                Deep Analytics →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {subjectMastery.length > 0 ? subjectMastery.slice(0, 6).map((sub, i) => {
                const toneColor = sub.accuracy > 75 ? "var(--success)" : sub.accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)";
                return (
                  <Link
                    key={i}
                    href={`/analysis/${encodeURIComponent(sub.exam.toLowerCase())}/${encodeURIComponent(sub.name)}`}
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div>
                        <span className="text-label-caps" style={{ color: "var(--primary)", marginRight: 8 }}>{sub.exam}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--on-surface)", fontFamily: "'Inter', sans-serif" }}>{sub.name}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: toneColor, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {sub.accuracy.toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{
                        width: `${sub.accuracy}%`,
                        background: `linear-gradient(90deg, ${toneColor}80, ${toneColor})`,
                      }} />
                    </div>
                  </Link>
                );
              }) : (
                <div style={{ padding: "24px 0", textAlign: "center" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 36, color: "var(--outline)", display: "block", marginBottom: 8 }}>
                    bar_chart
                  </span>
                  <p style={{ fontSize: 13, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif" }}>
                    No data yet. Start learning to see your mastery.
                  </p>
                  <Link href="/learn" className="btn btn-primary" style={{ marginTop: 12, fontSize: 13, textDecoration: "none" }}>
                    Begin First Quiz
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16 }}>
              Activity Timeline
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {performances.length > 0 ? performances.slice(0, 6).map((p, i) => (
                <Link
                  key={i}
                  href={`/analysis/${encodeURIComponent(p.exam.toLowerCase())}/${encodeURIComponent(p.subject)}/${encodeURIComponent(p.chapter)}`}
                  style={{ textDecoration: "none" }}
                >
                  <div className="hover-bg-high" style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 12px",
                    borderRadius: 8,
                    transition: "background 0.15s ease",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: p.accuracy > 75 ? "var(--success)" : p.accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)",
                        flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--on-surface)", fontFamily: "'Inter', sans-serif" }}>{p.chapter}</div>
                        <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 1 }}>{p.subject} · {new Date(p.lastAttempt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--on-surface)" }}>
                        {p.accuracy.toFixed(0)}%
                      </div>
                      <div style={{
                        fontSize: 11, fontWeight: 600,
                        color: p.trend === "Improving" ? "var(--success)" : p.trend === "Declining" ? "var(--error)" : "var(--outline)",
                      }}>
                        {p.trend === "Improving" ? "↑" : p.trend === "Declining" ? "↓" : "→"} {p.trend}
                      </div>
                    </div>
                  </div>
                </Link>
              )) : (
                <p style={{ fontSize: 13, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif", textAlign: "center", padding: "20px 0" }}>
                  No activity recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar widgets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Global Rank */}
          <div className="card" style={{
            padding: 20,
            background: "linear-gradient(135deg, rgba(34,199,240,0.1) 0%, rgba(91,95,251,0.1) 100%)",
            border: "1px solid rgba(34,199,240,0.25)",
            textAlign: "center",
          }}>
            <div className="text-label-caps" style={{ color: "var(--accent-cyan)", marginBottom: 8 }}>
              Global Rank
            </div>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 44, fontWeight: 700,
              color: "var(--accent-cyan)",
              letterSpacing: "-0.03em",
              lineHeight: 1,
              marginBottom: 4,
              textShadow: "0 0 20px rgba(34,199,240,0.4)",
            }}>
              #{rank}
            </div>
            <div style={{ fontSize: 12, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif", marginBottom: 12 }}>
              Top 2.3% of all users
            </div>
            <Link href="/leaderboard" className="btn btn-secondary" style={{ fontSize: 12, width: "100%", textDecoration: "none" }}>
              View Leaderboard →
            </Link>
          </div>

          {/* AI Insights */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--secondary)" }}>psychology</span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>AI Insights</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {insights.length > 0 ? insights.slice(0, 3).map((insight, i) => (
                <div key={i} style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--surface-container-high)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  fontSize: 12,
                  color: "var(--on-surface-variant)",
                  fontFamily: "'Inter', sans-serif",
                  lineHeight: 1.5,
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                    color: insight.kind === "weak" ? "var(--error)" : insight.kind === "strong" ? "var(--success)" : "var(--accent-cyan)",
                    display: "block", marginBottom: 4,
                  }}>
                    {insight.kind === "weak" ? "⚠ Weak Area" : insight.kind === "strong" ? "✓ Strong" : "↗ Trend"}
                  </span>
                  {insight.message}
                </div>
              )) : (
                <p style={{ fontSize: 12, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif" }}>
                  Analyze your first quiz to get AI insights.
                </p>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--tertiary)" }}>bolt</span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Next Steps</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recommendations.length > 0 ? recommendations.slice(0, 3).map((rec, i) => (
                <Link
                  key={i}
                  href={rec.action}
                  style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: rec.type === "critical" ? "rgba(255,180,171,0.08)" : "var(--surface-container-high)",
                    border: `1px solid ${rec.type === "critical" ? "rgba(255,180,171,0.2)" : "rgba(255,255,255,0.05)"}`,
                    textDecoration: "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: rec.type === "critical" ? "var(--error)" : "var(--on-surface)", marginBottom: 2 }}>
                    {rec.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif" }}>
                    {rec.description}
                  </div>
                </Link>
              )) : (
                <p style={{ fontSize: 12, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif" }}>You are all caught up! 🎯</p>
              )}
            </div>
          </div>

          {/* Neural Credits */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--secondary)" }}>toll</span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Neural Credits</h3>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "var(--secondary)", marginBottom: 6 }}>
              {credits.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginBottom: 10 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle" }}>track_changes</span>
              {" "}Target: College Hoodie (1500)
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{
                width: `${Math.min((credits / 1500) * 100, 100)}%`,
                background: "linear-gradient(90deg, var(--secondary-container), var(--secondary))",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--outline)" }}>
              <span>0</span><span>1500</span>
            </div>
          </div>

          {/* Strong topics */}
          {strongTopics.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--success)" }}>verified</span>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Mastered Topics</h3>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {strongTopics.slice(0, 6).map((topic, i) => (
                  <span key={i} className="badge badge-success" style={{ fontSize: 10 }}>{topic.chapter}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
