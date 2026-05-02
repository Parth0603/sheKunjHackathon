import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PLAN: Record<string, { subject: string; topic: string; duration: string; type: string; priority: "high" | "medium" | "low" }[]> = {
  Mon: [
    { subject: "Physics", topic: "Thermodynamics – First Law", duration: "90 min", type: "Revision", priority: "high" },
    { subject: "Chemistry", topic: "Organic Mechanisms", duration: "60 min", type: "New", priority: "medium" },
    { subject: "Mathematics", topic: "Integration by Parts", duration: "45 min", type: "Practice", priority: "low" },
  ],
  Tue: [
    { subject: "Chemistry", topic: "Inorganic – p-block", duration: "75 min", type: "Revision", priority: "high" },
    { subject: "Physics", topic: "Electrostatics – Gauss Law", duration: "90 min", type: "New", priority: "high" },
  ],
  Wed: [
    { subject: "Mathematics", topic: "Differential Equations", duration: "120 min", type: "Practice", priority: "high" },
    { subject: "Physics", topic: "Optics – Refraction", duration: "60 min", type: "New", priority: "medium" },
  ],
  Thu: [
    { subject: "Chemistry", topic: "Equilibrium – Kp & Kc", duration: "90 min", type: "Revision", priority: "high" },
    { subject: "Mathematics", topic: "Coordinate Geometry", duration: "75 min", type: "Practice", priority: "medium" },
  ],
  Fri: [
    { subject: "Physics", topic: "Modern Physics – Photoelectric", duration: "90 min", type: "Revision", priority: "high" },
    { subject: "Chemistry", topic: "Electrochemistry", duration: "60 min", type: "New", priority: "low" },
    { subject: "Mathematics", topic: "Probability", duration: "45 min", type: "Practice", priority: "medium" },
  ],
  Sat: [
    { subject: "Full Mock", topic: "JEE Advanced Paper 1 (Full Syllabus)", duration: "180 min", type: "Mock", priority: "high" },
  ],
  Sun: [
    { subject: "Analysis", topic: "Mock Review & Error Analysis", duration: "90 min", type: "Review", priority: "high" },
    { subject: "All Subjects", topic: "Weekly Weak Topic Revision", duration: "60 min", type: "Revision", priority: "medium" },
  ],
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "var(--error)",
  medium: "var(--accent-cyan)",
  low: "var(--success)",
};
const TYPE_COLORS: Record<string, string> = {
  Revision: "var(--tertiary)",
  New: "var(--primary)",
  Practice: "var(--accent-cyan)",
  Mock: "var(--secondary)",
  Review: "var(--success)",
};

export default async function StudyPlanPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");
  const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 6 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>calendar_today</span>
            Adaptive Study Plan
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--on-surface)" }}>
            Weekly Command Schedule
          </h1>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>
            AI-optimized based on your performance trends and upcoming exam dates.
          </p>
        </div>
        <div className="badge badge-primary" style={{ padding: "8px 16px" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>auto_awesome</span>
          AI Generated
        </div>
      </div>

      {/* Plan insights */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { icon: "schedule", label: "Weekly Study Hours", value: "21.5h", color: "var(--primary)" },
          { icon: "priority_high", label: "High Priority Tasks", value: "8", color: "var(--error)" },
          { icon: "assignment_turned_in", label: "Mock Exams Scheduled", value: "1", color: "var(--secondary)" },
        ].map((m) => (
          <div key={m.label} className="card" style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${m.color}15`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: m.color }}>{m.icon}</span>
            </div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Day tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {DAYS.map((day) => {
          const isToday = day === today;
          const tasks = PLAN[day] || [];
          return (
            <div key={day} style={{
              flexShrink: 0,
              padding: "10px 16px",
              borderRadius: 10,
              background: isToday ? "var(--primary-container)" : "var(--surface-container)",
              border: `1px solid ${isToday ? "rgba(91,95,251,0.5)" : "rgba(255,255,255,0.06)"}`,
              cursor: "pointer",
              minWidth: 80,
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 13, fontWeight: 700,
                color: isToday ? "var(--on-primary-container)" : "var(--on-surface)",
              }}>{day}</div>
              <div style={{
                fontSize: 10,
                color: isToday ? "rgba(254,250,255,0.7)" : "var(--on-surface-variant)",
                marginTop: 2,
              }}>{tasks.length} tasks</div>
            </div>
          );
        })}
      </div>

      {/* Weekly grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
        {DAYS.map((day) => {
          const isToday = day === today;
          const tasks = PLAN[day] || [];
          const totalMins = tasks.reduce((s, t) => s + parseInt(t.duration), 0);
          return (
            <div key={day}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 8, padding: "0 2px",
              }}>
                <span style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13, fontWeight: 700,
                  color: isToday ? "var(--primary)" : "var(--on-surface-variant)",
                }}>{day}</span>
                {isToday && <span className="badge badge-primary" style={{ fontSize: 9, padding: "2px 6px" }}>TODAY</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tasks.map((task, i) => (
                  <div key={i} className="card" style={{
                    padding: "10px 12px",
                    borderLeft: `3px solid ${PRIORITY_COLORS[task.priority]}`,
                    background: isToday ? "rgba(91,95,251,0.06)" : "var(--surface-container)",
                  }}>
                    <div className="text-label-caps" style={{ color: TYPE_COLORS[task.type], fontSize: 9, marginBottom: 4 }}>
                      {task.type}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--on-surface)", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.3, marginBottom: 4 }}>
                      {task.subject}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--on-surface-variant)", lineHeight: 1.4 }}>{task.topic}</div>
                    <div style={{ fontSize: 10, color: "var(--outline)", marginTop: 5, display: "flex", alignItems: "center", gap: 3 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 11 }}>schedule</span>
                      {task.duration}
                    </div>
                  </div>
                ))}
                {tasks.length > 0 && (
                  <div style={{ fontSize: 10, color: "var(--outline)", textAlign: "center", padding: "2px 0" }}>
                    Total: {totalMins}m
                  </div>
                )}
                {tasks.length === 0 && (
                  <div style={{ padding: "16px 8px", textAlign: "center", borderRadius: 8, border: "1px dashed var(--outline-variant)" }}>
                    <span style={{ fontSize: 10, color: "var(--outline)" }}>Rest day</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Today&apos;s focus */}
      <div className="card" style={{
        marginTop: 24, padding: 24,
        background: "linear-gradient(135deg, rgba(91,95,251,0.1), rgba(124,58,237,0.08))",
        border: "1px solid rgba(91,95,251,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--primary)" }}>bolt</span>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--on-surface)" }}>
            Today&apos;s Focus — {today}
          </h3>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {(PLAN[today] || []).map((task, i) => (
            <div key={i} style={{
              padding: "10px 16px",
              borderRadius: 9999,
              background: "var(--surface-container-high)",
              border: `1px solid ${PRIORITY_COLORS[task.priority]}40`,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: PRIORITY_COLORS[task.priority], flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--on-surface)" }}>{task.subject}: {task.topic}</span>
              <span className="badge badge-surface" style={{ fontSize: 9 }}>{task.duration}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
