import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLeaderboardData, getUserLeaderboardPosition } from "@/lib/leaderboard";

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const [leaderboard, me] = await Promise.all([
    getLeaderboardData(),
    getUserLeaderboardPosition(session.user.email),
  ]);

  const hasEnoughUsers = leaderboard.length > 0;
  const topRows = leaderboard.slice(0, 25);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 6 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>leaderboard</span>
          Leaderboard
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--on-surface)" }}>
          Global Neural Rankings
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--outline-variant)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--on-surface)" }}>Live Rankings</h3>
            <span className="badge badge-surface">{leaderboard.length} users</span>
          </div>

          {!hasEnoughUsers ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--on-surface-variant)", fontSize: 14 }}>
              Not enough users yet
            </div>
          ) : (
            <table className="table-aether" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Rank</th>
                  <th>Student</th>
                  <th>Score</th>
                  <th>Accuracy</th>
                  <th>Streak</th>
                </tr>
              </thead>
              <tbody>
                {topRows.map((row) => {
                  const isUser = row.userId === session.user?.email;
                  return (
                    <tr key={row.userId} style={{ background: isUser ? "rgba(37,99,235,0.08)" : undefined }}>
                      <td style={{ fontWeight: 700 }}>{row.rank}</td>
                      <td>
                        <div style={{ fontWeight: isUser ? 700 : 500, color: isUser ? "var(--primary)" : "var(--on-surface)" }}>
                          {row.name} {isUser ? "(You)" : ""}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{row.score.toFixed(2)}</td>
                      <td>{row.quizAccuracy.toFixed(1)}%</td>
                      <td>{row.streak}d</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20, textAlign: "center" }}>
            <div className="text-label-caps" style={{ color: "var(--accent-cyan)", marginBottom: 8 }}>Your Position</div>
            {me.row.rank > 0 ? (
              <>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 44, fontWeight: 700, color: "var(--accent-cyan)", lineHeight: 1 }}>
                  #{me.row.rank}
                </div>
                <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 8 }}>
                  Top {me.row.percentile.toFixed(1)}% · Score {me.row.score.toFixed(2)}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                Rank will appear after your first activity
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)", marginBottom: 10 }}>
              Score Formula
            </h3>
            <div style={{ fontSize: 12, color: "var(--on-surface-variant)", lineHeight: 1.6 }}>
              Neural Score = (Quiz Accuracy × 0.4) + (Mock Score × 0.4) + (Streak × 0.2)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

