"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EXAM_CONFIGS, ExamId } from "@/lib/examConfig";

type Question = {
  id: number;
  question: string;
  subject: string;
  chapter: string;
  difficulty: "easy" | "medium" | "hard";
  options: string[];
  correctAnswer: string;
};

const EXAM_OPTIONS = Object.keys(EXAM_CONFIGS) as ExamId[];

export default function MockExamPage() {
  const { status } = useSession();
  const router = useRouter();
  const [selectedExam, setSelectedExam] = useState<ExamId>("JEE Advanced");
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    correct: number;
    wrong: number;
    skipped: number;
    negativeApplied: number;
    weakAreas: string[];
    strongAreas: string[];
    topicAccuracy: { chapter: string; accuracy: number; correct: number; attempted: number }[];
  } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (started && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            setSubmitted(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, submitted]);

  const config = EXAM_CONFIGS[selectedExam];

  const fmt = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const answered = answers.filter((a) => a !== null).length;

  const beginExam = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mock-exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam: selectedExam }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate exam");
      setQuestions(data.questions || []);
      setAnswers(Array((data.questions || []).length).fill(null));
      const duration = (data.config?.durationMinutes || config.durationMinutes) * 60;
      setTimeLeft(duration);
      setTotalDurationSeconds(duration);
      setCurrent(0);
      setResult(null);
      setSubmitted(false);
      setStarted(true);
    } catch (error) {
      console.error(error);
      alert("Failed to start exam");
    } finally {
      setLoading(false);
    }
  };

  const submitExam = async () => {
    setSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const res = await fetch("/api/mock-exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam: selectedExam, questions, answers, timeTaken: Math.max(0, totalDurationSeconds - timeLeft) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit exam");
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Failed to submit exam");
    }
  };

  if (!started) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div className="card" style={{ maxWidth: 560, width: "100%", padding: 36 }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--on-surface)", marginBottom: 12 }}>
            Mock Exam Simulator
          </h1>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 20 }}>
            Select an exam pattern to begin a realistic timed simulation.
          </p>

          <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--on-surface-variant)" }}>Select Exam</label>
          <select className="input" value={selectedExam} onChange={(e) => setSelectedExam(e.target.value as ExamId)} style={{ marginBottom: 18 }}>
            {EXAM_OPTIONS.map((exam) => (
              <option key={exam} value={exam}>{exam}</option>
            ))}
          </select>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>Duration</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16 }}>{config.durationMinutes} min</div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>Questions</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16 }}>{config.numberOfQuestions}</div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>Correct</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16 }}>+{config.marking.correct}</div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>Negative</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16 }}>-{config.marking.negative}</div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={beginExam} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Generating Exam..." : "Begin Exam"}
          </button>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div className="card" style={{ maxWidth: 700, width: "100%", padding: 28 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 14 }}>Exam Analysis</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Score", value: result.score.toFixed(2) },
              { label: "Correct", value: String(result.correct) },
              { label: "Wrong", value: String(result.wrong) },
              { label: "Skipped", value: String(result.skipped) },
              { label: "Negative", value: `-${result.negativeApplied.toFixed(2)}` },
            ].map((x) => (
              <div key={x.label} className="card" style={{ padding: 12 }}>
                <div style={{ fontSize: 10, color: "var(--on-surface-variant)" }}>{x.label}</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17 }}>{x.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div className="card" style={{ padding: 14 }}>
              <div className="text-label-caps" style={{ color: "var(--error)", marginBottom: 8 }}>Weak Areas</div>
              {result.weakAreas.length > 0 ? result.weakAreas.map((w) => (
                <div key={w} style={{ fontSize: 12, marginBottom: 6 }}>{w}</div>
              )) : <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>No major weak area detected.</div>}
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="text-label-caps" style={{ color: "var(--success)", marginBottom: 8 }}>Strong Areas</div>
              {result.strongAreas.length > 0 ? result.strongAreas.map((s) => (
                <div key={s} style={{ fontSize: 12, marginBottom: 6 }}>{s}</div>
              )) : <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>No strong area identified yet.</div>}
            </div>
          </div>

          <div className="card" style={{ padding: 14, marginBottom: 16 }}>
            <div className="text-label-caps" style={{ color: "var(--accent-cyan)", marginBottom: 8 }}>Topic-wise Accuracy</div>
            {result.topicAccuracy.map((t) => (
              <div key={t.chapter} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span>{t.chapter}</span>
                <span>{t.accuracy.toFixed(0)}% ({t.correct}/{t.attempted})</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => { setStarted(false); setSubmitted(false); setQuestions([]); setAnswers([]); setResult(null); }}>
              Retry Exam
            </button>
            <button className="btn btn-primary" onClick={() => router.push("/analytics")}>View Analytics</button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];
  if (!q) return <div style={{ padding: 24 }}>Loading question...</div>;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: 56, padding: "0 24px", background: "var(--surface-container-lowest)", borderBottom: "1px solid var(--outline-variant)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--primary)" }}>assignment_turned_in</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600 }}>{selectedExam}</span>
          <span className="badge badge-surface" style={{ fontSize: 10 }}>{q.subject}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{answered}/{questions.length} answered</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: timeLeft < 600 ? "var(--error)" : "var(--accent-cyan)" }}>{fmt(timeLeft)}</span>
          <button className="btn btn-secondary" onClick={submitExam}>Submit Exam</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 220px", overflow: "hidden" }}>
        <div style={{ overflowY: "auto", padding: 30 }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ marginBottom: 16, fontSize: 12, color: "var(--on-surface-variant)" }}>
              Question {current + 1} of {questions.length} · {q.subject} · {q.chapter} · {q.difficulty}
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>{q.question}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  className={`option-card${answers[current] === opt ? " selected" : ""}`}
                  onClick={() => {
                    const next = [...answers];
                    next[current] = next[current] === opt ? null : opt;
                    setAnswers(next);
                  }}
                  style={{ textAlign: "left", border: "none", width: "100%", cursor: "pointer" }}
                >
                  <div className="option-letter">{String.fromCharCode(65 + i)}</div>
                  <span style={{ fontSize: 14 }}>{opt}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 26 }}>
              <button className="btn btn-secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>Previous</button>
              <button className="btn btn-primary" disabled={current === questions.length - 1} onClick={() => setCurrent((c) => c + 1)}>Next</button>
            </div>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: 20, background: "var(--surface-container-lowest)", borderLeft: "1px solid var(--outline-variant)" }}>
          <div className="text-label-caps" style={{ color: "var(--on-surface-variant)", marginBottom: 12 }}>Navigator</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  borderRadius: 6,
                  border: `1px solid ${i === current ? "var(--primary-container)" : answers[i] ? "rgba(91,95,251,0.3)" : "var(--outline-variant)"}`,
                  background: i === current ? "var(--primary-container)" : answers[i] ? "rgba(91,95,251,0.15)" : "var(--surface-container)",
                  color: i === current ? "var(--on-primary-container)" : "var(--on-surface-variant)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
