import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { connectDB } from "@/lib/mongodb";
import UserPerformance from "@/models/UserPerformance";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  await connectDB();
  const performances = await UserPerformance.find({ userId: session.user.email }).sort({ lastAttempt: -1 });
  const totalQuizzes = performances.length;
  const overallAccuracy = totalQuizzes ? performances.reduce((s, p) => s + p.accuracy, 0) / totalQuizzes : 0;
  const best = performances.reduce((b, p) => p.accuracy > (b?.accuracy ?? 0) ? p : b, null as typeof performances[0] | null);

  const ACHIEVEMENTS = [
    { name: "7-Day Streak", icon: "local_fire_department", earned: true, color: "var(--tertiary)" },
    { name: "First Perfect", icon: "verified", earned: totalQuizzes > 0, color: "var(--success)" },
    { name: "Quiz Master", icon: "quiz", earned: totalQuizzes >= 10, color: "var(--primary)" },
    { name: "Top 100", icon: "leaderboard", earned: false, color: "var(--outline)" },
    { name: "Iron Will", icon: "fitness_center", earned: false, color: "var(--outline)" },
    { name: "Speed Solver", icon: "bolt", earned: false, color: "var(--outline)" },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 24 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>account_circle</span>
        Neural Profile
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        {/* Left: Profile card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{
            padding: 28, textAlign: "center",
            background: "linear-gradient(135deg, rgba(91,95,251,0.12) 0%, rgba(124,58,237,0.08) 100%)",
            border: "1px solid rgba(91,95,251,0.25)",
          }}>
            <div style={{
              position: "relative", width: 80, height: 80, borderRadius: "50%",
              margin: "0 auto 16px",
              border: "3px solid rgba(91,95,251,0.5)",
              boxShadow: "0 0 24px rgba(91,95,251,0.3)",
              overflow: "hidden",
            }}>
              {session.user?.image ? (
                <Image src={session.user.image} alt="Avatar" fill style={{ objectFit: "cover" }} />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  background: "linear-gradient(135deg, var(--primary-container), var(--accent-purple))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "white",
                }}>
                  {session.user?.name?.charAt(0) ?? "U"}
                </div>
              )}
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--on-surface)", marginBottom: 4 }}>
              {session.user?.name}
            </h2>
            <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 12 }}>
              Elite Level IV
            </div>
            <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginBottom: 16 }}>{session.user?.email}</p>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              {[
                { label: "Rank", value: "#128" },
                { label: "Credits", value: "1,240" },
                { label: "Streak", value: "7d" },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--on-surface)" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Target exam */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--primary)" }}>school</span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Target Exams</h3>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["JEE Advanced", "JEE Mains"].map((exam) => (
                <span key={exam} className="badge badge-primary">{exam}</span>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--tertiary)" }}>military_tech</span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Achievements</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {ACHIEVEMENTS.map((a, i) => (
                <div key={i} style={{
                  textAlign: "center", padding: "10px 6px", borderRadius: 8,
                  opacity: a.earned ? 1 : 0.35,
                  background: a.earned ? `${a.color}15` : "var(--surface-container-highest)",
                  border: `1px solid ${a.earned ? `${a.color}30` : "rgba(255,255,255,0.04)"}`,
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 20, color: a.earned ? a.color : "var(--outline)", display: "block", marginBottom: 3 }}>{a.icon}</span>
                  <div style={{ fontSize: 8, color: a.earned ? "var(--on-surface-variant)" : "var(--outline)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{a.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Stats and settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Performance summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              { label: "Total Quizzes", value: String(totalQuizzes), icon: "quiz", color: "var(--primary)" },
              { label: "Overall Accuracy", value: `${overallAccuracy.toFixed(1)}%`, icon: "target", color: "var(--accent-cyan)" },
              { label: "Best Score", value: best ? `${best.accuracy.toFixed(0)}%` : "–", icon: "emoji_events", color: "var(--tertiary)" },
            ].map((s) => (
              <div key={s.label} className="card" style={{ padding: 18, textAlign: "center" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 24, color: s.color, display: "block", marginBottom: 8 }}>{s.icon}</span>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: s.color, marginBottom: 3 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent performance */}
          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16 }}>Recent Quiz Results</h3>
            {performances.slice(0, 8).map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.accuracy > 75 ? "var(--success)" : p.accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--on-surface)" }}>{p.chapter}</div>
                    <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{p.subject} · {p.exam}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: p.accuracy > 75 ? "var(--success)" : p.accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)" }}>
                    {p.accuracy.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 10, color: "var(--outline)" }}>{new Date(p.lastAttempt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
            {performances.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--on-surface-variant)", textAlign: "center", padding: "20px 0" }}>No quizzes taken yet.</p>
            )}
          </div>

          {/* Account settings */}
          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16 }}>Account Settings</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: "notifications", label: "Push Notifications", desc: "Daily study reminders and test alerts" },
                { icon: "dark_mode", label: "Dark Mode", desc: "Always on (Aether Intelligence default)" },
                { icon: "language", label: "Language", desc: "English (International)" },
              ].map((setting, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--on-surface-variant)" }}>{setting.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--on-surface)" }}>{setting.label}</div>
                      <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{setting.desc}</div>
                    </div>
                  </div>
                  <div style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: i === 0 ? "var(--primary-container)" : i === 1 ? "var(--primary-container)" : "var(--surface-container-high)",
                    position: "relative", cursor: "pointer",
                  }}>
                    <div style={{
                      position: "absolute", top: 2, borderRadius: "50%",
                      width: 16, height: 16, background: "white",
                      left: i === 0 || i === 1 ? 18 : 2,
                      transition: "left 0.2s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
