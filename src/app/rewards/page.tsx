import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const REWARDS = [
  { name: "College Hoodie", cost: 1500, icon: "checkroom", owned: false, progress: 83, category: "Merch" },
  { name: "Neural Notebook", cost: 800, icon: "menu_book", owned: true, progress: 100, category: "Stationery" },
  { name: "Exam Pro Bundle", cost: 3000, icon: "workspace_premium", owned: false, progress: 41, category: "Digital" },
  { name: "Speed Runner Badge", cost: 500, icon: "bolt", owned: true, progress: 100, category: "Badges" },
  { name: "Dark Mode Theme", cost: 200, icon: "dark_mode", owned: true, progress: 100, category: "Digital" },
  { name: "Study Lamp", cost: 2000, icon: "light_mode", owned: false, progress: 62, category: "Merch" },
  { name: "Premium AI Sessions", cost: 1000, icon: "psychology", owned: false, progress: 51, category: "Digital" },
  { name: "Rank Badge – Gold", cost: 750, icon: "emoji_events", owned: false, progress: 68, category: "Badges" },
];

const HISTORY = [
  { action: "Completed 7-day streak", credits: "+50", date: "Today" },
  { action: "Quiz: Organic Chemistry – SN1/SN2", credits: "+20", date: "Today" },
  { action: "Mock Exam completed (JEE)", credits: "+100", date: "Yesterday" },
  { action: "First perfect score", credits: "+75", date: "Apr 30" },
  { action: "Redeemed: Dark Mode Theme", credits: "-200", date: "Apr 29" },
];

export default async function RewardsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const credits = 1240;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 6 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>military_tech</span>
            Rewards System
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--on-surface)" }}>
            Neural Credit Store
          </h1>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>
            Earn credits through study activity, redeem for real rewards.
          </p>
        </div>
        {/* Credit balance */}
        <div className="card" style={{
          padding: "14px 22px",
          background: "linear-gradient(135deg, rgba(210,187,255,0.15), rgba(96,1,209,0.15))",
          border: "1px solid rgba(210,187,255,0.25)",
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 24, color: "var(--secondary)" }}>toll</span>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: "var(--secondary)", lineHeight: 1 }}>
              {credits.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 2 }}>Neural Credits</div>
          </div>
        </div>
      </div>

      {/* How to earn */}
      <div className="card" style={{
        padding: 22, marginBottom: 24,
        background: "linear-gradient(135deg, rgba(91,95,251,0.08), rgba(34,199,240,0.05))",
        border: "1px solid rgba(91,95,251,0.2)",
      }}>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--on-surface)", marginBottom: 14 }}>
          How to Earn Credits
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {[
            { icon: "quiz", action: "Complete a quiz", credits: "+20 per quiz" },
            { icon: "local_fire_department", action: "Daily streak bonus", credits: "+50 / 7 days" },
            { icon: "assignment_turned_in", action: "Finish mock exam", credits: "+100 per exam" },
            { icon: "verified", action: "Perfect score", credits: "+75 bonus" },
            { icon: "trending_up", action: "Improving trend", credits: "+10 per subject" },
          ].map((item) => (
            <div key={item.action} style={{
              textAlign: "center",
              background: "var(--surface-container-high)",
              borderRadius: 10, padding: "14px 10px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: 22, color: "var(--primary)", display: "block", marginBottom: 8 }}>{item.icon}</span>
              <div style={{ fontSize: 11, color: "var(--on-surface)", fontFamily: "'Inter', sans-serif", marginBottom: 4, lineHeight: 1.3 }}>{item.action}</div>
              <div className="text-label-caps" style={{ color: "var(--success)", fontSize: 10 }}>{item.credits}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        {/* Rewards grid */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--on-surface)" }}>
              Available Rewards
            </h3>
            <div style={{ display: "flex", gap: 6 }}>
              {["All", "Merch", "Digital", "Badges"].map((cat) => (
                <span key={cat} className="badge badge-surface" style={{ cursor: "pointer", padding: "5px 10px" }}>{cat}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {REWARDS.map((r, i) => (
              <div key={i} className="card" style={{
                padding: 20,
                background: r.owned ? "rgba(74,222,128,0.05)" : "var(--surface-container)",
                border: `1px solid ${r.owned ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.08)"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: r.owned ? "rgba(74,222,128,0.1)" : "var(--surface-container-high)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1px solid ${r.owned ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 24, color: r.owned ? "var(--success)" : "var(--on-surface-variant)" }}>{r.icon}</span>
                  </div>
                  <span className="badge badge-surface" style={{ fontSize: 9 }}>{r.category}</span>
                </div>
                <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)", marginBottom: 4 }}>{r.name}</h4>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 14, color: "var(--secondary)" }}>toll</span>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--secondary)" }}>
                    {r.cost.toLocaleString()} credits
                  </span>
                </div>
                {r.owned ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, background: "rgba(74,222,128,0.1)" }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 14, color: "var(--success)" }}>check_circle</span>
                    <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>Owned</span>
                  </div>
                ) : (
                  <>
                    <div className="progress-bar" style={{ marginBottom: 6 }}>
                      <div className="progress-bar-fill" style={{
                        width: `${r.progress}%`,
                        background: credits >= r.cost
                          ? "linear-gradient(90deg, var(--success), var(--accent-cyan))"
                          : "linear-gradient(90deg, var(--secondary-container), var(--secondary))",
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 10, color: "var(--on-surface-variant)" }}>{credits.toLocaleString()} / {r.cost.toLocaleString()}</span>
                      <span style={{ fontSize: 10, color: "var(--on-surface-variant)" }}>{r.progress}%</span>
                    </div>
                    <button
                      className={`btn ${credits >= r.cost ? "btn-primary" : "btn-secondary"}`}
                      style={{ width: "100%", fontSize: 12, padding: "8px" }}
                      disabled={credits < r.cost}
                    >
                      {credits >= r.cost ? "Redeem Now" : `Need ${(r.cost - credits).toLocaleString()} more`}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: History */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Progress to next level */}
          <div className="card" style={{
            padding: 20,
            background: "linear-gradient(135deg, rgba(91,95,251,0.12), rgba(124,58,237,0.08))",
            border: "1px solid rgba(91,95,251,0.25)",
          }}>
            <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 10 }}>Level Progress</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Elite IV</span>
              <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>→ Elite V</span>
            </div>
            <div className="progress-bar" style={{ marginBottom: 8 }}>
              <div className="progress-bar-fill" style={{ width: "82%", background: "linear-gradient(90deg, var(--primary-container), var(--accent-cyan))" }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>
              1,240 / 1,500 XP · 260 XP to Elite V
            </div>
          </div>

          {/* Credit history */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--secondary)" }}>history</span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Credit History</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {HISTORY.map((h, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--on-surface)", fontFamily: "'Inter', sans-serif" }}>{h.action}</div>
                    <div style={{ fontSize: 10, color: "var(--outline)", marginTop: 2 }}>{h.date}</div>
                  </div>
                  <span style={{
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700,
                    color: h.credits.startsWith("+") ? "var(--success)" : "var(--error)",
                  }}>
                    {h.credits}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/dashboard" className="btn btn-ghost" style={{ width: "100%", marginTop: 10, fontSize: 12, justifyContent: "center", textDecoration: "none" }}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
