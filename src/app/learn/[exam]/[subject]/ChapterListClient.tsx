"use client";

import { useState } from "react";
import Link from "next/link";

interface Performance {
  chapter: string;
  accuracy: number;
  trend: string;
}

interface Chapter {
  id: string;
  name: string;
}

interface Props {
  exam: string;
  subject: string;
  initialChapters: Chapter[];
  performances: Performance[];
}

export default function ChapterListClient({ exam, subject, initialChapters, performances }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [loading, setLoading] = useState(false);

  async function handleGenerateChapters() {
    setLoading(true);
    try {
      const res = await fetch("/api/generate-chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam, subject }),
      });
      const data = await res.json();
      if (data.chapters) setChapters(data.chapters);
    } catch (err) {
      console.error("Failed to generate chapters:", err);
    }
    setLoading(false);
  }

  const weakPerformance = performances.filter((p) => p.accuracy < 50).sort((a, b) => a.accuracy - b.accuracy)[0];
  const recommendedChapter = weakPerformance
    ? chapters.find((c) => c.id === weakPerformance.chapter || c.name === weakPerformance.chapter)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {recommendedChapter && (
        <div className="card" style={{
          padding: 24,
          background: "linear-gradient(135deg, rgba(255,180,171,0.1), rgba(91,95,251,0.05))",
          border: "1px solid rgba(255,180,171,0.3)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16
        }}>
          <div>
            <div className="text-label-caps" style={{ color: "var(--error)", marginBottom: 6 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>target</span>
              Priority Recommendation
            </div>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, color: "var(--on-surface)" }}>
              Focus on {recommendedChapter.name}
            </h3>
            <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>
              Your accuracy is currently {weakPerformance?.accuracy.toFixed(0)}%. Reviewing this module is critical for improvement.
            </p>
          </div>
          <Link href={`/learn/${exam}/${subject}/${recommendedChapter.id}`} className="btn btn-primary" style={{ flexShrink: 0, textDecoration: "none" }}>
            Start Priority Module
          </Link>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 32, color: "var(--primary)", display: "block", marginBottom: 12, animation: "pulse-glow 2s infinite" }}>
            memory
          </span>
          <p style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>Synthesizing module parameters...</p>
        </div>
      ) : chapters.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 36, color: "var(--outline)", display: "block", marginBottom: 16 }}>
            library_add
          </span>
          <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginBottom: 20 }}>
            No modules have been generated for this subject yet.
          </p>
          <button className="btn btn-secondary" onClick={handleGenerateChapters}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>auto_awesome</span>
            Generate Curriculum
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {chapters.map((chapter) => {
            const perf = performances.find((p) => p.chapter === chapter.id || p.chapter === chapter.name);
            const accuracy = perf?.accuracy ?? 0;
            const statusColor = !perf ? "var(--outline)" : accuracy > 75 ? "var(--success)" : accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)";
            const statusLabel = !perf ? "Untested" : accuracy > 75 ? "Mastered" : accuracy >= 50 ? "Moderate" : "Needs Review";

            return (
              <Link href={`/learn/${exam}/${subject}/${chapter.id}`} key={chapter.id} style={{ textDecoration: "none" }}>
                <div className="card hover-bg-high" style={{ padding: 20, height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                    <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--on-surface)", lineHeight: 1.3 }}>
                      {chapter.name}
                    </h2>
                    <span className="badge badge-surface" style={{ flexShrink: 0, color: statusColor, borderColor: `${statusColor}40` }}>
                      {statusLabel}
                    </span>
                  </div>

                  <div style={{ marginTop: "auto" }}>
                    {perf ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>Accuracy</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, fontFamily: "'Space Grotesk', sans-serif" }}>
                            {accuracy.toFixed(0)}%
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${accuracy}%`, background: `linear-gradient(90deg, ${statusColor}80, ${statusColor})` }} />
                        </div>
                        <div style={{ fontSize: 10, color: "var(--on-surface-variant)", marginTop: 6, textAlign: "right" }}>
                          Trend: {perf.trend}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--on-surface-variant)" }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 14 }}>radio_button_unchecked</span>
                        <span style={{ fontSize: 12 }}>Not attempted yet</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
