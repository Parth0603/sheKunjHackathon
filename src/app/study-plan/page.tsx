"use client";

import { useEffect, useMemo, useState } from "react";

type PlanTask = {
  subject: string;
  chapter: string;
  type: "REVISION" | "PRACTICE" | "NEW" | "MOCK";
  durationMinutes: number;
  priority: "high" | "medium" | "low";
};

type WeeklyPlan = Record<string, PlanTask[]>;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PRIORITY_COLORS: Record<string, string> = {
  high: "var(--error)",
  medium: "var(--accent-cyan)",
  low: "var(--success)",
};

const TYPE_COLORS: Record<string, string> = {
  REVISION: "var(--tertiary)",
  PRACTICE: "var(--accent-cyan)",
  NEW: "var(--primary)",
  MOCK: "var(--secondary)",
};

export default function StudyPlanPage() {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlan() {
      setLoading(true);
      try {
        const res = await fetch("/api/study-plan/generate", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load plan");
        setWeeklyPlan(data.weeklyPlan);
        setInsights(Array.isArray(data.insights) ? data.insights : []);
        setLastUpdated(new Date(data.lastUpdated).toLocaleString());
      } catch {
        setWeeklyPlan(null);
        setInsights([]);
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, []);

  const totalMinutes = useMemo(() => {
    if (!weeklyPlan) return 0;
    return DAYS.reduce((acc, day) => acc + (weeklyPlan[day] || []).reduce((s, t) => s + t.durationMinutes, 0), 0);
  }, [weeklyPlan]);

  const highPriorityCount = useMemo(() => {
    if (!weeklyPlan) return 0;
    return DAYS.reduce((acc, day) => acc + (weeklyPlan[day] || []).filter((t) => t.priority === "high").length, 0);
  }, [weeklyPlan]);

  const mockCount = useMemo(() => {
    if (!weeklyPlan) return 0;
    return DAYS.reduce((acc, day) => acc + (weeklyPlan[day] || []).filter((t) => t.type === "MOCK").length, 0);
  }, [weeklyPlan]);

  const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
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
            Real-time plan generated from your quiz performance and trends.
          </p>
        </div>
        <div className="badge badge-primary" style={{ padding: "8px 16px" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>auto_awesome</span>
          Agentic Plan
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 24 }}>Generating adaptive plan...</div>
      ) : !weeklyPlan ? (
        <div className="card" style={{ padding: 24 }}>No performance data yet. Attempt quizzes to generate your plan.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { icon: "schedule", label: "Weekly Study Hours", value: `${(totalMinutes / 60).toFixed(1)}h`, color: "var(--primary)" },
              { icon: "priority_high", label: "High Priority Tasks", value: String(highPriorityCount), color: "var(--error)" },
              { icon: "assignment_turned_in", label: "Mock Exams Scheduled", value: String(mockCount), color: "var(--secondary)" },
            ].map((m) => (
              <div key={m.label} className="card" style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${m.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 20, color: m.color }}>{m.icon}</span>
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{m.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 16, marginBottom: 20 }}>
            {insights.map((insight, idx) => (
              <div key={idx} style={{ fontSize: 13, color: "var(--on-surface)", marginBottom: idx === insights.length - 1 ? 0 : 8 }}>
                - {insight}
              </div>
            ))}
            <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 8 }}>Last updated: {lastUpdated}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
            {DAYS.map((day) => {
              const isToday = day === today;
              const tasks = weeklyPlan[day] || [];
              const totalMins = tasks.reduce((s, t) => s + t.durationMinutes, 0);
              return (
                <div key={day}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 2px" }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: isToday ? "var(--primary)" : "var(--on-surface-variant)" }}>{day}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tasks.map((task, i) => (
                      <div key={i} className="card" style={{ padding: "10px 12px", borderLeft: `3px solid ${PRIORITY_COLORS[task.priority]}`, background: isToday ? "rgba(91,95,251,0.06)" : "var(--surface-container)" }}>
                        <div className="text-label-caps" style={{ color: TYPE_COLORS[task.type], fontSize: 9, marginBottom: 4 }}>{task.type}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--on-surface)", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.3, marginBottom: 4 }}>{task.subject}</div>
                        <div style={{ fontSize: 10, color: "var(--on-surface-variant)", lineHeight: 1.4 }}>{task.chapter}</div>
                        <div style={{ fontSize: 10, color: "var(--outline)", marginTop: 5, display: "flex", alignItems: "center", gap: 3 }}>
                          <span className="material-symbols-rounded" style={{ fontSize: 11 }}>schedule</span>
                          {task.durationMinutes} min
                        </div>
                      </div>
                    ))}
                    {tasks.length > 0 && <div style={{ fontSize: 10, color: "var(--outline)", textAlign: "center", padding: "2px 0" }}>Total: {totalMins}m</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
