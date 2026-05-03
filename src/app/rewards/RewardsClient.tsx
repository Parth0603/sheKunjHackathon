"use client";

import { useState } from "react";

type RewardItem = {
  key: string;
  name: string;
  cost: number;
  icon: string;
  category: string;
  owned: boolean;
  progress: number;
};

type HistoryItem = {
  reason: string;
  delta: number;
  createdAt: Date | string;
};

type Props = {
  initialCredits: number;
  initialBadges: string[];
  rewards: RewardItem[];
  history: HistoryItem[];
};

export default function RewardsClient({ initialCredits, initialBadges, rewards, history }: Props) {
  const [credits, setCredits] = useState(initialCredits);
  const [ownedRewards, setOwnedRewards] = useState(new Set(rewards.filter((r) => r.owned).map((r) => r.key)));
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const onRedeem = async (rewardKey: string) => {
    try {
      setLoadingKey(rewardKey);
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rewardKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Unable to redeem reward");
        return;
      }
      setCredits(data.credits ?? credits);
      setOwnedRewards((prev) => new Set([...prev, rewardKey]));
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <>
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
            Earn credits through real activity and redeem rewards.
          </p>
        </div>

        <div className="card" style={{ padding: "14px 22px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 24, color: "var(--secondary)" }}>toll</span>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: "var(--secondary)", lineHeight: 1 }}>
              {credits.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 2 }}>Neural Credits</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--on-surface)" }}>
              Available Rewards
            </h3>
          </div>

          {rewards.length === 0 ? (
            <div className="card" style={{ padding: 20, color: "var(--on-surface-variant)" }}>No rewards configured yet.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
              {rewards.map((r) => {
                const owned = ownedRewards.has(r.key);
                const canRedeem = credits >= r.cost && !owned;
                return (
                  <div key={r.key} className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--surface-container-high)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--outline-variant)" }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 24, color: "var(--on-surface-variant)" }}>{r.icon}</span>
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

                    {owned ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, background: "rgba(22,163,74,0.1)" }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 14, color: "var(--success)" }}>check_circle</span>
                        <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>Owned</span>
                      </div>
                    ) : (
                      <>
                        <div className="progress-bar" style={{ marginBottom: 6 }}>
                          <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.round((credits / r.cost) * 100))}%` }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 10, color: "var(--on-surface-variant)" }}>{credits.toLocaleString()} / {r.cost.toLocaleString()}</span>
                          <span style={{ fontSize: 10, color: "var(--on-surface-variant)" }}>{Math.min(100, Math.round((credits / r.cost) * 100))}%</span>
                        </div>
                        <button
                          className={`btn ${canRedeem ? "btn-primary" : "btn-secondary"}`}
                          style={{ width: "100%", fontSize: 12, padding: "8px" }}
                          disabled={!canRedeem || loadingKey === r.key}
                          onClick={() => onRedeem(r.key)}
                        >
                          {loadingKey === r.key ? "Processing..." : canRedeem ? "Redeem Now" : `Need ${(r.cost - credits).toLocaleString()} more`}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)", marginBottom: 12 }}>
              Badges
            </h3>
            {initialBadges.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {initialBadges.map((badge) => (
                  <span key={badge} className="badge badge-success">{badge}</span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>No badges earned yet.</div>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)", marginBottom: 14 }}>
              Credit History
            </h3>
            {history.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {history.map((h, i) => (
                  <div key={`${h.reason}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--outline-variant)" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--on-surface)", fontFamily: "'Inter', sans-serif" }}>{h.reason}</div>
                      <div style={{ fontSize: 10, color: "var(--outline)", marginTop: 2 }}>{new Date(h.createdAt).toLocaleDateString()}</div>
                    </div>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: h.delta >= 0 ? "var(--success)" : "var(--error)" }}>
                      {h.delta >= 0 ? "+" : ""}{h.delta}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>No reward activity yet.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

