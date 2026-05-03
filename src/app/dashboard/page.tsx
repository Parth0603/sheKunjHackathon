import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import UserPerformance from "@/models/UserPerformance";
import MockExamResult from "@/models/MockExamResult";
import StudyPlan from "@/models/StudyPlan";
import { buildSmartGuidance, getExamAnalysis, getUserInsights } from "@/lib/analysis";
import ExportWeeklyReportButton from "./ExportWeeklyReportButton";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  await connectDB();

  const quizPerformances = await UserPerformance.find({
    userId: session.user.email,
    type: "quiz",
  }).sort({ lastAttempt: -1 });

  const [allPerformanceCount, mockExamCount, studyPlan] = await Promise.all([
    UserPerformance.countDocuments({ userId: session.user.email }),
    MockExamResult.countDocuments({ userId: session.user.email }),
    StudyPlan.findOne({ userId: session.user.email }).lean(),
  ]);

  const totalQuizAttempts = quizPerformances.reduce((sum, p) => sum + (p.attempts || 0), 0);
  const hasStudyPlan = Boolean(
    studyPlan &&
      studyPlan.weeklyPlan &&
      Object.values(studyPlan.weeklyPlan).some((tasks) => Array.isArray(tasks) && tasks.length > 0)
  );

  const isNewUser =
    totalQuizAttempts === 0 &&
    mockExamCount === 0 &&
    !hasStudyPlan &&
    allPerformanceCount === 0;

  const examAnalysis = await getExamAnalysis(session.user.email);
  const subjectMastery = (examAnalysis ?? []).flatMap((e) =>
    e.subjects.map((s: { name: string; accuracy: number }) => ({
      name: s.name,
      accuracy: s.accuracy,
      exam: e.exam,
    }))
  );

  const [guidance, userInsights] = await Promise.all([
    Promise.resolve(
      buildSmartGuidance(
        quizPerformances.map((p) => ({
          exam: p.exam,
          subject: p.subject,
          chapter: p.chapter,
          accuracy: p.accuracy,
          attempts: p.attempts ?? 1,
          trend: p.trend,
          history: Array.isArray(p.history) ? p.history : [],
        }))
      )
    ),
    getUserInsights(session.user.email),
  ]);

  const overallAccuracy = quizPerformances.length
    ? quizPerformances.reduce((sum, p) => sum + p.accuracy, 0) / quizPerformances.length
    : 0;

  const recentDays = Array.from(
    new Set(
      quizPerformances.map((p) => {
        const d = new Date(p.lastAttempt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    )
  ).sort((a, b) => b - a);

  let streak = 0;
  if (recentDays.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let cursor = today.getTime();
    if (recentDays[0] !== cursor && recentDays[0] === cursor - 86400000) {
      cursor = recentDays[0];
    }

    for (const day of recentDays) {
      if (day === cursor) {
        streak += 1;
        cursor -= 86400000;
      } else if (day < cursor) {
        break;
      }
    }
  }

  const credits = totalQuizAttempts * 10 + mockExamCount * 50 + streak * 5;

  const { strongTopics } = guidance;
  const insights = isNewUser ? [] : [...guidance.insights];
  const recommendations = isNewUser ? [] : [...guidance.recommendations];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      <div
        style={{
          marginBottom: 28,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              position: "relative",
              width: 52,
              height: 52,
              borderRadius: 12,
              overflow: "hidden",
              border: "2px solid rgba(37,99,235,0.25)",
              flexShrink: 0,
            }}
          >
            {session.user?.image ? (
              <Image src={session.user.image} alt="Profile" fill style={{ objectFit: "cover" }} />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#2563eb",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "white",
                }}
              >
                {session.user?.name?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--on-surface)",
                lineHeight: 1.2,
              }}
            >
              Welcome, {session.user?.name?.split(" ")[0]}
            </h1>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ExportWeeklyReportButton userId={session.user.email} />
          <Link href="/learn" className="btn btn-primary" style={{ flexShrink: 0, textDecoration: "none" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
              bolt
            </span>
            Start Learning
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          {
            icon: "track_changes",
            label: "Overall Mastery",
            value: `${isNewUser ? 0 : overallAccuracy.toFixed(0)}%`,
            color: "var(--primary)",
          },
          { icon: "quiz", label: "Quizzes Taken", value: String(totalQuizAttempts), color: "var(--accent-cyan)" },
          { icon: "local_fire_department", label: "Day Streak", value: `${streak}d`, color: "var(--tertiary)" },
          { icon: "military_tech", label: "Credits", value: credits.toLocaleString(), color: "var(--secondary)" },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span className="text-label-caps" style={{ color: "var(--on-surface-variant)" }}>
                {stat.label}
              </span>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: stat.color }}>
                {stat.icon}
              </span>
            </div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: stat.color,
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 320px", gap: 20 }}>
        <div style={{ gridColumn: "1 / 3", display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
              <div>
                <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 6 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>
                    auto_awesome
                  </span>
                  {isNewUser ? "Start Your Learning Journey" : "Today's Adaptive Plan"}
                </div>
                <h2
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 20,
                    fontWeight: 600,
                    color: "var(--on-surface)",
                    marginBottom: 6,
                  }}
                >
                  {isNewUser ? "Start Your Learning Journey" : "Adaptive Study Plan"}
                </h2>
                <p style={{ fontSize: 13, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                  {isNewUser
                    ? "You haven't started yet. Take your first quiz to unlock your personalized study plan."
                    : insights.length > 0
                      ? insights[0].message
                      : "Complete more quizzes to unlock deeper adaptive planning."}
                </p>
              </div>
              <Link href="/learn" className="btn btn-secondary" style={{ flexShrink: 0, fontSize: 13, textDecoration: "none" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                  play_arrow
                </span>
                Start First Quiz
              </Link>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--on-surface)" }}>
                Subject Performance
              </h3>
              <Link href="/analytics" className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 10px", textDecoration: "none" }}>
                Deep Analytics
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {subjectMastery.length > 0 ? (
                subjectMastery.slice(0, 6).map((sub, i) => {
                  const toneColor = sub.accuracy > 75 ? "var(--success)" : sub.accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)";
                  return (
                    <Link
                      key={i}
                      href={`/analysis/${encodeURIComponent(sub.exam.toLowerCase())}/${encodeURIComponent(sub.name)}`}
                      style={{ textDecoration: "none", display: "block" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <div>
                          <span className="text-label-caps" style={{ color: "var(--primary)", marginRight: 8 }}>
                            {sub.exam}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--on-surface)", fontFamily: "'Inter', sans-serif" }}>{sub.name}</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: toneColor, fontFamily: "'Space Grotesk', sans-serif" }}>{sub.accuracy.toFixed(0)}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${sub.accuracy}%` }} />
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div style={{ padding: "24px 0", textAlign: "center" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 36, color: "var(--outline)", display: "block", marginBottom: 8 }}>
                    bar_chart
                  </span>
                  <p style={{ fontSize: 13, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif" }}>
                    No data yet. Start learning to track your progress.
                  </p>
                  <Link href="/learn" className="btn btn-primary" style={{ marginTop: 12, fontSize: 13, textDecoration: "none" }}>
                    Begin First Quiz
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16 }}>
              Activity Timeline
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {quizPerformances.length > 0 ? (
                quizPerformances.slice(0, 6).map((p, i) => (
                  <Link
                    key={i}
                    href={`/analysis/${encodeURIComponent(p.exam.toLowerCase())}/${encodeURIComponent(p.subject)}/${encodeURIComponent(p.chapter)}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      className="hover-bg-high"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "11px 12px",
                        borderRadius: 8,
                        transition: "background 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: p.accuracy > 75 ? "var(--success)" : p.accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)",
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--on-surface)", fontFamily: "'Inter', sans-serif" }}>{p.chapter}</div>
                          <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 1 }}>
                            {p.subject} - {new Date(p.lastAttempt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--on-surface)" }}>
                          {p.accuracy.toFixed(0)}%
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: p.trend === "Improving" ? "var(--success)" : p.trend === "Declining" ? "var(--error)" : "var(--outline)",
                          }}
                        >
                          {p.trend}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p style={{ fontSize: 13, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif", textAlign: "center", padding: "20px 0" }}>
                  No activity yet
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20, textAlign: "center" }}>
            <div className="text-label-caps" style={{ color: "var(--accent-cyan)", marginBottom: 8 }}>
              Global Rank
            </div>
            <div style={{ fontSize: 12, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif", marginBottom: 12 }}>
              Rank will appear after your first activity
            </div>
            <Link href="/leaderboard" className="btn btn-secondary" style={{ fontSize: 12, width: "100%", textDecoration: "none" }}>
              View Leaderboard
            </Link>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--secondary)" }}>
                psychology
              </span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>AI Insights</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {!userInsights.hasData ? (
                <p style={{ fontSize: 12, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif" }}>
                  Complete your first quiz to unlock AI insights.
                </p>
              ) : (
                <>
                  {userInsights.weakAreas.map((area, i) => (
                    <div
                      key={`weak-${i}`}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "rgba(220,38,38,0.06)",
                        border: "1px solid rgba(220,38,38,0.18)",
                        fontSize: 12,
                        color: "var(--on-surface-variant)",
                        fontFamily: "'Inter', sans-serif",
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--error)",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Weak Area
                      </span>
                      {area.reason}
                    </div>
                  ))}

                  {userInsights.strongAreas.map((area, i) => (
                    <div
                      key={`strong-${i}`}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "rgba(34,197,94,0.06)",
                        border: "1px solid rgba(34,197,94,0.18)",
                        fontSize: 12,
                        color: "var(--on-surface-variant)",
                        fontFamily: "'Inter', sans-serif",
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--success)",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Strong
                      </span>
                      You are consistently performing well in {area.chapter} with {area.accuracy.toFixed(0)}% accuracy across {area.attempts} attempts.
                    </div>
                  ))}

                  {userInsights.trends.map((trend, i) => (
                    <div
                      key={`trend-${i}`}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "rgba(6,182,212,0.06)",
                        border: "1px solid rgba(6,182,212,0.18)",
                        fontSize: 12,
                        color: "var(--on-surface-variant)",
                        fontFamily: "'Inter', sans-serif",
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--accent-cyan)",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        {trend.direction === "improving" ? "Improving" : "Declining"}
                      </span>
                      Your recent performance in {trend.subject} is {trend.direction} by {trend.change}%.
                    </div>
                  ))}

                  {userInsights.weakAreas.length === 0 &&
                    userInsights.strongAreas.length === 0 &&
                    userInsights.trends.length === 0 && (
                      <p style={{ fontSize: 12, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif" }}>
                        Keep attempting quizzes — insights appear after 2+ attempts per chapter.
                      </p>
                    )}
                </>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--tertiary)" }}>
                bolt
              </span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Next Steps</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recommendations.length > 0 ? (
                recommendations.slice(0, 3).map((rec, i) => (
                  <Link
                    key={i}
                    href={rec.action}
                    style={{
                      display: "block",
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: rec.type === "critical" ? "rgba(220,38,38,0.08)" : "var(--surface-container-high)",
                      border: `1px solid ${rec.type === "critical" ? "rgba(220,38,38,0.2)" : "var(--outline-variant)"}`,
                      textDecoration: "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: rec.type === "critical" ? "var(--error)" : "var(--on-surface)", marginBottom: 2 }}>
                      {rec.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif" }}>{rec.description}</div>
                  </Link>
                ))
              ) : (
                <div>
                  <p style={{ fontSize: 12, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>
                    You're all set to begin
                  </p>
                  <Link href="/learn" className="btn btn-primary" style={{ width: "100%", fontSize: 12, textDecoration: "none" }}>
                    Start Learning
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--secondary)" }}>
                toll
              </span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Neural Credits</h3>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "var(--secondary)", marginBottom: 6 }}>
              {credits.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginBottom: 10 }}>
              Credits update only after quiz completion, mock exams, and streak progress.
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${Math.min((credits / 1000) * 100, 100)}%`, background: "var(--secondary)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--outline)" }}>
              <span>0</span>
              <span>1000</span>
            </div>
          </div>

          {strongTopics.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--success)" }}>
                  verified
                </span>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Mastered Topics</h3>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {strongTopics.slice(0, 6).map((topic, i) => (
                  <span key={i} className="badge badge-success" style={{ fontSize: 10 }}>
                    {topic.chapter}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

