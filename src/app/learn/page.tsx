import Link from "next/link";
import { mockExams } from "@/data/mockData";

const examConfig: Record<string, { icon: string; desc: string; color: string; gradient: string }> = {
  jee: {
    icon: "science",
    desc: "Physics, Chemistry, Mathematics",
    color: "var(--primary)",
    gradient: "linear-gradient(135deg, rgba(91,95,251,0.2), rgba(91,95,251,0.05))",
  },
  neet: {
    icon: "biotech",
    desc: "Physics, Chemistry, Biology",
    color: "var(--success)",
    gradient: "linear-gradient(135deg, rgba(74,222,128,0.15), rgba(74,222,128,0.04))",
  },
  upsc: {
    icon: "account_balance",
    desc: "History, Geography, Polity, Economy",
    color: "var(--tertiary)",
    gradient: "linear-gradient(135deg, rgba(255,182,142,0.15), rgba(255,182,142,0.04))",
  },
  gate: {
    icon: "memory",
    desc: "CS, Electrical, Mechanical",
    color: "var(--accent-cyan)",
    gradient: "linear-gradient(135deg, rgba(34,199,240,0.15), rgba(34,199,240,0.04))",
  },
};

export default function LearnPage() {
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 6 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>menu_book</span>
          Exam Selection Hub
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--on-surface)" }}>
          Choose Your Target Exam
        </h1>
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 6 }}>
          Select an exam to access its subjects, chapters, and adaptive quizzes.
        </p>
      </div>

      {/* Exam cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 40 }}>
        {mockExams.map((exam) => {
          const config = examConfig[exam.id] ?? {
            icon: "school", desc: exam.subjects.join(", "),
            color: "var(--primary)",
            gradient: "linear-gradient(135deg, rgba(91,95,251,0.15), rgba(91,95,251,0.04))",
          };
          return (
            <Link key={exam.id} href={`/learn/${exam.id}`} style={{ textDecoration: "none" }}>
              <div
                className="card hover-exam-card"
                style={{
                  padding: 24,
                  background: config.gradient,
                  border: `1px solid ${config.color}30`,
                  cursor: "pointer",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  transition: "all 0.2s ease",
                  "--card-color": config.color,
                } as React.CSSProperties}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: `${config.color}15`,
                  border: `1px solid ${config.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 26, color: config.color }}>
                    {config.icon}
                  </span>
                </div>
                <div>
                  <h2 style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em",
                    color: "var(--on-surface)", marginBottom: 6,
                  }}>
                    {exam.name}
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--on-surface-variant)", lineHeight: 1.5 }}>
                    {config.desc}
                  </p>
                </div>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="text-label-caps" style={{ color: config.color }}>
                    {exam.subjects.length} Subjects
                  </span>
                  <span className="material-symbols-rounded" style={{ fontSize: 18, color: config.color }}>
                    arrow_forward
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick access section */}
      <div className="card" style={{
        padding: 24,
        background: "linear-gradient(135deg, rgba(91,95,251,0.08), rgba(124,58,237,0.05))",
        border: "1px solid rgba(91,95,251,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--primary)" }}>bolt</span>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--on-surface)" }}>
            Quick Actions
          </h3>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { href: "/mock-exam", icon: "assignment_turned_in", label: "Start Mock Exam", color: "var(--primary)" },
            { href: "/ai-tutor", icon: "psychology", label: "Ask AI Tutor", color: "var(--secondary)" },
            { href: "/analytics", icon: "insights", label: "View Analytics", color: "var(--accent-cyan)" },
            { href: "/study-plan", icon: "calendar_today", label: "Today's Plan", color: "var(--tertiary)" },
          ].map((action) => (
            <Link key={action.href} href={action.href} style={{ textDecoration: "none" }}>
              <div className="hover-bright" style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 18px",
                borderRadius: 9999,
                background: "var(--surface-container-high)",
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: action.color }}>{action.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--on-surface)" }}>{action.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
