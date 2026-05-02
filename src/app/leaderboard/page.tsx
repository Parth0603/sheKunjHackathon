import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

const LEADERBOARD = [
  { rank: 1, name: "Arjun Mehta", level: "Elite VII", score: 98420, badge: "🏆", exam: "JEE", streak: 42 },
  { rank: 2, name: "Priya Sharma", level: "Elite VI", score: 96150, badge: "🥈", exam: "NEET", streak: 38 },
  { rank: 3, name: "Rohan Das", level: "Elite VI", score: 94800, badge: "🥉", exam: "JEE", streak: 35 },
  { rank: 4, name: "Ananya Rao", level: "Elite V", score: 91230, badge: "", exam: "UPSC", streak: 28 },
  { rank: 5, name: "Vikram Singh", level: "Elite V", score: 89750, badge: "", exam: "GATE", streak: 24 },
  { rank: 6, name: "Kavya Nair", level: "Elite IV", score: 87400, badge: "", exam: "JEE", streak: 21 },
  { rank: 7, name: "Aditya Kumar", level: "Elite IV", score: 85920, badge: "", exam: "NEET", streak: 19 },
  { rank: 8, name: "Sneha Reddy", level: "Elite IV", score: 83600, badge: "", exam: "UPSC", streak: 17 },
  { rank: 9, name: "Rahul Verma", level: "Elite III", score: 81200, badge: "", exam: "JEE", streak: 14 },
  { rank: 10, name: "Ishaan Malhotra", level: "Elite III", score: 79500, badge: "", exam: "GATE", streak: 12 },
  { rank: 128, name: "You", level: "Elite IV", score: 51240, badge: "", exam: "JEE", streak: 7, isUser: true },
];

const REWARDS = [
  { name: "College Hoodie", cost: 1500, icon: "checkroom", owned: false, progress: 83 },
  { name: "Neural Notebook", cost: 800, icon: "menu_book", owned: true, progress: 100 },
  { name: "Exam Pro Bundle", cost: 3000, icon: "workspace_premium", owned: false, progress: 41 },
  { name: "Speed Runner Badge", cost: 500, icon: "bolt", owned: true, progress: 100 },
];

const BADGES = [
  { name: "7-Day Streak", icon: "local_fire_department", earned: true, color: "var(--tertiary)" },
  { name: "First 100%", icon: "verified", earned: true, color: "var(--success)" },
  { name: "Quiz Master", icon: "quiz", earned: true, color: "var(--primary)" },
  { name: "Speed Solver", icon: "bolt", earned: false, color: "var(--outline)" },
  { name: "Top 100", icon: "leaderboard", earned: false, color: "var(--outline)" },
  { name: "Iron Will", icon: "fitness_center", earned: false, color: "var(--outline)" },
];

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 6 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>leaderboard</span>
          Leaderboard & Rewards
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--on-surface)" }}>
          Global Neural Rankings
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        {/* Left: Leaderboard */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Top 3 podium */}
          <div className="card" style={{
            padding: 28,
            background: "linear-gradient(135deg, rgba(91,95,251,0.12) 0%, rgba(124,58,237,0.08) 100%)",
            border: "1px solid rgba(91,95,251,0.25)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 16 }}>
              {[LEADERBOARD[1], LEADERBOARD[0], LEADERBOARD[2]].map((user, idx) => {
                const heights = [90, 120, 76];
                const colors = ["#C0C1FF", "#FFD700", "#FFB68E"];
                return (
                  <div key={user.rank} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${colors[idx]}40, ${colors[idx]}20)`,
                      border: `2px solid ${colors[idx]}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700,
                      color: colors[idx], marginBottom: 8,
                      boxShadow: `0 0 16px ${colors[idx]}40`,
                    }}>
                      {user.name.charAt(0)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface)", marginBottom: 2 }}>{user.name.split(" ")[0]}</div>
                    <div style={{ fontSize: 10, color: "var(--on-surface-variant)", marginBottom: 8 }}>{user.level}</div>
                    <div style={{
                      width: 72,
                      height: heights[idx],
                      background: `linear-gradient(to top, ${colors[idx]}30, ${colors[idx]}10)`,
                      border: `1px solid ${colors[idx]}50`,
                      borderRadius: "6px 6px 0 0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: colors[idx] }}>
                        {user.badge || `#${user.rank}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rankings table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--outline-variant)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--on-surface)" }}>Rankings</h3>
              <div style={{ display: "flex", gap: 6 }}>
                {["All", "JEE", "NEET", "UPSC", "GATE"].map((f) => (
                  <button key={f} style={{
                    padding: "4px 10px", borderRadius: 9999, fontSize: 11, border: "1px solid var(--outline-variant)",
                    background: f === "All" ? "var(--primary-container)" : "transparent",
                    color: f === "All" ? "var(--on-primary-container)" : "var(--on-surface-variant)",
                    cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  }}>{f}</button>
                ))}
              </div>
            </div>
            <table className="table-aether" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Rank</th>
                  <th>Student</th>
                  <th>Exam</th>
                  <th>Neural Score</th>
                  <th>Streak</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {LEADERBOARD.filter((u) => u.rank !== 128 || true).map((user, i) => {
                  const isUser = (user as typeof user & { isUser?: boolean }).isUser;
                  return (
                    <tr key={i} style={{ background: isUser ? "rgba(91,95,251,0.08)" : undefined }}>
                      <td style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: user.rank <= 3 ? "#FFD700" : "var(--on-surface-variant)" }}>
                        {user.badge || `#${user.rank}`}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: "50%",
                            background: isUser ? "linear-gradient(135deg, var(--primary-container), var(--accent-purple))" : "var(--surface-container-high)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700,
                            color: isUser ? "white" : "var(--on-surface-variant)",
                          }}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: isUser ? 700 : 500, color: isUser ? "var(--primary)" : "var(--on-surface)" }}>
                              {user.name} {isUser ? "(You)" : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-primary" style={{ fontSize: 10 }}>{user.exam}</span></td>
                      <td style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "var(--on-surface)" }}>{user.score.toLocaleString()}</td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                          <span className="material-symbols-rounded" style={{ fontSize: 14, color: "var(--tertiary)" }}>local_fire_department</span>
                          {user.streak}d
                        </span>
                      </td>
                      <td><span className="badge badge-surface" style={{ fontSize: 10 }}>{user.level}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Your rank card */}
          <div className="card" style={{
            padding: 22,
            background: "linear-gradient(135deg, rgba(34,199,240,0.1) 0%, rgba(91,95,251,0.1) 100%)",
            border: "1px solid rgba(34,199,240,0.25)",
            textAlign: "center",
          }}>
            <div className="text-label-caps" style={{ color: "var(--accent-cyan)", marginBottom: 8 }}>Your Position</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 52, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--accent-cyan)", lineHeight: 1, textShadow: "0 0 24px rgba(34,199,240,0.4)" }}>
              #128
            </div>
            <div style={{ fontSize: 12, color: "var(--on-surface-variant)", margin: "8px 0 16px" }}>Top 2.3% · 51,240 pts</div>
            <div className="progress-bar" style={{ marginBottom: 6 }}>
              <div className="progress-bar-fill" style={{ width: "68%", background: "linear-gradient(90deg, var(--accent-cyan), var(--primary-container))" }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>4,710 pts to reach #100</div>
          </div>

          {/* Rewards shop */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--secondary)" }}>storefront</span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Rewards Shop</h3>
            </div>
            {REWARDS.map((r, i) => (
              <div key={i} className="card" style={{ padding: 12, marginBottom: 8, background: r.owned ? "rgba(74,222,128,0.06)" : "var(--surface-container-highest)", border: `1px solid ${r.owned ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: r.owned ? 0 : 8 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 22, color: r.owned ? "var(--success)" : "var(--on-surface-variant)" }}>{r.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface)", fontFamily: "'Space Grotesk', sans-serif" }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{r.cost.toLocaleString()} Neural Credits</div>
                  </div>
                  {r.owned && <span className="badge badge-success" style={{ fontSize: 9 }}>Owned</span>}
                </div>
                {!r.owned && (
                  <>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${r.progress}%`, background: "linear-gradient(90deg, var(--secondary-container), var(--secondary))" }} />
                    </div>
                    <div style={{ fontSize: 10, color: "var(--on-surface-variant)", marginTop: 4, textAlign: "right" }}>{r.progress}% earned</div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Badges */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--tertiary)" }}>military_tech</span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Achievement Badges</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {BADGES.map((b, i) => (
                <div key={i} style={{
                  textAlign: "center", padding: "12px 8px",
                  borderRadius: 8, opacity: b.earned ? 1 : 0.4,
                  background: b.earned ? `${b.color}15` : "var(--surface-container-highest)",
                  border: `1px solid ${b.earned ? `${b.color}30` : "rgba(255,255,255,0.04)"}`,
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 22, color: b.earned ? b.color : "var(--outline)", display: "block", marginBottom: 4 }}>{b.icon}</span>
                  <div style={{ fontSize: 9, color: b.earned ? "var(--on-surface-variant)" : "var(--outline)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {b.name}
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
