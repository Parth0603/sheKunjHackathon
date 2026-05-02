"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

const QUESTIONS = [
  {
    id: 1, subject: "Physics",
    q: "A particle moves in a circle of radius R with constant speed v. The magnitude of change in velocity when the particle goes from point A to B, where the arc AB subtends an angle of 60° at the centre, is:",
    options: ["v", "v√2", "v√3", "2v"],
    correct: 0,
  },
  {
    id: 2, subject: "Chemistry",
    q: "Which of the following has the highest lattice energy?",
    options: ["NaCl", "MgO", "CaO", "LiF"],
    correct: 1,
  },
  {
    id: 3, subject: "Mathematics",
    q: "If f(x) = x² + 2x + 1, then f(f(x)) at x = 0 equals:",
    options: ["0", "1", "2", "4"],
    correct: 1,
  },
  {
    id: 4, subject: "Physics",
    q: "The de Broglie wavelength of a particle with kinetic energy K is λ. What is the wavelength when kinetic energy is 4K?",
    options: ["λ/4", "λ/2", "2λ", "4λ"],
    correct: 1,
  },
  {
    id: 5, subject: "Chemistry",
    q: "The hybridisation of carbon in diamond is:",
    options: ["sp", "sp²", "sp³", "sp³d"],
    correct: 2,
  },
];

export default function MockExamPage() {
  const { status } = useSession();
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [timeLeft, setTimeLeft] = useState(3 * 60 * 60); // 3 hours
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/"); }, [status, router]);
  useEffect(() => {
    if (started && !submitted) {
      timerRef.current = setInterval(() => setTimeLeft((t) => { if (t <= 1) { setSubmitted(true); return 0; } return t - 1; }), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, submitted]);

  const fmt = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const answered = answers.filter((a) => a !== null).length;
  const score = submitted ? answers.reduce<number>((acc, a, i) => acc + (a === QUESTIONS[i].correct ? 4 : a !== null ? -1 : 0), 0) : 0;

  if (!started) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div className="card" style={{ maxWidth: 520, width: "100%", padding: 40, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, var(--primary-container), var(--accent-purple))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 0 24px rgba(91,95,251,0.4)" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 30, color: "white" }}>assignment_turned_in</span>
          </div>
          <div className="badge badge-primary" style={{ margin: "0 auto 16px" }}>JEE Advanced Mock</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--on-surface)", marginBottom: 8 }}>
            Mock Exam Mode
          </h1>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 28, lineHeight: 1.6 }}>
            Simulate real exam conditions. Distraction-free, timed, with negative marking.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
            {[
              { icon: "timer", label: "Duration", value: "3:00:00" },
              { icon: "quiz", label: "Questions", value: String(QUESTIONS.length) },
              { icon: "add_circle", label: "Correct +", value: "4 marks" },
              { icon: "remove_circle", label: "Wrong −", value: "1 mark" },
            ].map((item) => (
              <div key={item.label} style={{ background: "var(--surface-container-high)", borderRadius: 8, padding: "12px 14px", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 14, color: "var(--primary)" }}>{item.icon}</span>
                  <span style={{ fontSize: 10, color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</span>
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--on-surface)" }}>{item.value}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setStarted(true)} style={{ width: "100%", padding: "13px", fontSize: 15 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>play_arrow</span>
            Begin Exam
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const correct = answers.filter((a, i) => a === QUESTIONS[i].correct).length;
    const wrong = answers.filter((a, i) => a !== null && a !== QUESTIONS[i].correct).length;
    const skipped = answers.filter((a) => a === null).length;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div className="card" style={{ maxWidth: 560, width: "100%", padding: 40, textAlign: "center" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 48, color: score > 0 ? "var(--success)" : "var(--error)", display: "block", marginBottom: 16 }}>
            {score > 0 ? "emoji_events" : "sentiment_very_dissatisfied"}
          </span>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: "var(--on-surface)", marginBottom: 6 }}>Exam Submitted</h2>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 700, color: score > 0 ? "var(--success)" : "var(--error)", marginBottom: 20 }}>
            {score > 0 ? "+" : ""}{score}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28 }}>
            {[
              { label: "Correct", value: correct, color: "var(--success)" },
              { label: "Wrong", value: wrong, color: "var(--error)" },
              { label: "Skipped", value: skipped, color: "var(--outline)" },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--surface-container-high)", borderRadius: 8, padding: "14px 10px" }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => { setStarted(false); setSubmitted(false); setAnswers(Array(QUESTIONS.length).fill(null)); setTimeLeft(3 * 60 * 60); setCurrent(0); }} style={{ flex: 1 }}>
              Retry Exam
            </button>
            <button className="btn btn-primary" onClick={() => router.push("/analytics")} style={{ flex: 1 }}>
              View Analytics
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[current];
  const isLowTime = timeLeft < 600;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Exam header */}
      <div style={{
        height: 56, padding: "0 24px",
        background: "var(--surface-container-lowest)",
        borderBottom: "1px solid var(--outline-variant)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--primary)" }}>assignment_turned_in</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>JEE Advanced Mock</span>
          <span className="badge badge-surface" style={{ fontSize: 10 }}>{q.subject}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--on-surface-variant)" }}>quiz</span>
            <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{answered}/{QUESTIONS.length} answered</span>
          </div>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700,
            color: isLowTime ? "var(--error)" : "var(--accent-cyan)",
            padding: "4px 14px", borderRadius: 8,
            background: isLowTime ? "rgba(255,180,171,0.1)" : "rgba(34,199,240,0.08)",
            border: `1px solid ${isLowTime ? "rgba(255,180,171,0.3)" : "rgba(34,199,240,0.2)"}`,
            animation: isLowTime ? "pulse-glow 1s ease-in-out infinite" : "none",
          }}>
            {fmt(timeLeft)}
          </div>
          <button className="btn btn-secondary" onClick={() => setSubmitted(true)} style={{ fontSize: 12, padding: "7px 14px" }}>
            Submit Exam
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 220px", overflow: "hidden" }}>
        {/* Question area */}
        <div style={{ overflowY: "auto", padding: 32 }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: "var(--primary-container)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700,
                color: "var(--on-primary-container)",
              }}>
                {current + 1}
              </div>
              <span className="text-label-caps" style={{ color: "var(--on-surface-variant)" }}>
                Question {current + 1} of {QUESTIONS.length} · {q.subject}
              </span>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, lineHeight: 1.7, color: "var(--on-surface)", marginBottom: 28 }}>{q.q}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  className={`option-card${answers[current] === i ? " selected" : ""}`}
                  onClick={() => { const a = [...answers]; a[current] = a[current] === i ? null : i; setAnswers(a); }}
                  style={{ textAlign: "left", border: "none", width: "100%", cursor: "pointer" }}
                >
                  <div className="option-letter">{String.fromCharCode(65 + i)}</div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14 }}>{opt}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
              <button className="btn btn-secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_back</span>
                Previous
              </button>
              <button className="btn btn-primary" disabled={current === QUESTIONS.length - 1} onClick={() => setCurrent((c) => c + 1)}>
                Next
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Question navigator */}
        <div style={{ overflowY: "auto", padding: 20, background: "var(--surface-container-lowest)", borderLeft: "1px solid var(--outline-variant)" }}>
          <div className="text-label-caps" style={{ color: "var(--on-surface-variant)", marginBottom: 12 }}>Navigator</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 16 }}>
            {QUESTIONS.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} style={{
                width: "100%", aspectRatio: "1",
                borderRadius: 6,
                border: `1px solid ${i === current ? "var(--primary-container)" : answers[i] !== null ? "rgba(91,95,251,0.3)" : "var(--outline-variant)"}`,
                background: i === current ? "var(--primary-container)" : answers[i] !== null ? "rgba(91,95,251,0.15)" : "var(--surface-container)",
                color: i === current ? "var(--on-primary-container)" : "var(--on-surface-variant)",
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                {i + 1}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { color: "var(--primary-container)", label: "Current" },
              { color: "rgba(91,95,251,0.15)", label: "Answered" },
              { color: "var(--surface-container)", label: "Unattempted" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color, border: "1px solid rgba(255,255,255,0.1)" }} />
                <span style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
