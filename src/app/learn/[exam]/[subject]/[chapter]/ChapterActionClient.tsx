"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Props {
  exam: string;
  subject: string;
  chapter: string;
}

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

type NotesData = {
  title?: string;
  summary?: string;
  shouldGenerateImage?: boolean;
  imagePrompt?: string;
  diagram?: string;
  sections?: { heading: string; bulletPoints: string[] }[];
  keyConcepts?: { concept: string; description: string }[];
  error?: string;
};

type QuizData = {
  questions?: QuizQuestion[];
  error?: string;
};

const MERMAID_STARTERS = ["graph", "flowchart", "sequenceDiagram", "stateDiagram", "erDiagram", "gantt"];

function sanitizeMermaid(raw: string | undefined): string {
  if (!raw) return "";
  return raw.replace(/```mermaid\n?|```\n?/gi, "").trim();
}

function getFirstMermaidLine(diagram: string): string {
  const lines = diagram
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%%"));
  return lines[0] ?? "";
}

export default function ChapterActionClient({ exam, subject, chapter }: Props) {
  const [loading, setLoading] = useState<"quiz" | "notes" | "evaluating" | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [notesData, setNotesData] = useState<NotesData | null>(null);
  const [diagramSvg, setDiagramSvg] = useState<string | null>(null);
  const [showDiagram, setShowDiagram] = useState(false);
  const [showImage, setShowImage] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; total: number; accuracy: number; strength: string; isWeakTopic?: boolean } | null>(null);

  const handleGenerateQuiz = async () => {
    setLoading("quiz");
    setNotesData(null);
    setUserAnswers({});
    setQuizResult(null);
    try {
      const res = await fetch("/api/generate-quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exam, subject, chapter }) });
      const data = await res.json();
      setQuizData(data);
    } catch (err) {
      console.error(err);
      alert("Failed to generate quiz");
    }
    setLoading(null);
  };

  const handleGenerateNotes = async () => {
    setLoading("notes");
    setQuizData(null);
    setQuizResult(null);
    setDiagramSvg(null);
    setShowDiagram(false);
    setShowImage(true);
    try {
      const res = await fetch("/api/generate-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exam, subject, chapter }) });
      const data = await res.json();
      setNotesData(data);
    } catch (err) {
      console.error(err);
      alert("Failed to generate notes");
    }
    setLoading(null);
  };

  const markdownNotes = useMemo(() => {
    if (!notesData) return "";
    const lines: string[] = [];
    if (notesData.sections?.length) {
      for (const section of notesData.sections) {
        lines.push(`## ${section.heading}`);
        for (const point of section.bulletPoints) lines.push(`- ${point}`);
        lines.push("");
      }
    }
    return lines.join("\n").trim();
  }, [notesData]);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      const cleanedDiagram = sanitizeMermaid(notesData?.diagram);
      const firstLine = getFirstMermaidLine(cleanedDiagram).toLowerCase();
      const startsValid = MERMAID_STARTERS.some((starter) => firstLine.startsWith(starter.toLowerCase()));

      if (!cleanedDiagram || !startsValid) {
        setShowDiagram(false);
        setDiagramSvg(null);
        return;
      }

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "strict", suppressErrorRendering: true });
        await mermaid.parse(cleanedDiagram);
        const id = `notes-diagram-${Date.now()}`;
        const { svg } = await mermaid.render(id, cleanedDiagram);
        if (!cancelled) {
          setDiagramSvg(svg);
          setShowDiagram(true);
        }
      } catch (err) {
        console.error("Mermaid render failed:", err);
        if (!cancelled) {
          setShowDiagram(false);
          setDiagramSvg(null);
        }
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [notesData?.diagram]);

  const handleOptionSelect = (questionIndex: number, option: string) => {
    if (quizResult) return;
    setUserAnswers((prev) => ({ ...prev, [questionIndex]: option }));
  };

  const handleSubmitQuiz = async () => {
    if (!quizData?.questions) return;
    if (Object.keys(userAnswers).length !== quizData.questions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setLoading("evaluating");
    try {
      const res = await fetch("/api/evaluate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam, subject, chapter, questions: quizData.questions, userAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuizResult(data);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to submit quiz: ${message}`);
    }
    setLoading(null);
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 32 }}>
        <button
          className="btn btn-primary"
          onClick={handleGenerateNotes}
          disabled={loading !== null}
          style={{ padding: "16px", fontSize: 16 }}
        >
          <span className="material-symbols-rounded">{loading === "notes" ? "autorenew" : "menu_book"}</span>
          {loading === "notes" ? "Synthesizing Notes..." : "Generate AI Notes"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleGenerateQuiz}
          disabled={loading !== null}
          style={{ padding: "16px", fontSize: 16 }}
        >
          <span className="material-symbols-rounded">{loading === "quiz" ? "autorenew" : "quiz"}</span>
          {loading === "quiz" ? "Constructing Quiz..." : "Take Practice Quiz"}
        </button>
      </div>

      {notesData && !notesData.error && (
        <div className="card" style={{ padding: 32, maxWidth: 900, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "var(--primary-container)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <span className="material-symbols-rounded" style={{ color: "var(--on-primary-container)" }}>description</span>
            </div>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--on-surface)" }}>
              {notesData.title || "Module Notes"}
            </h3>
          </div>

          {notesData.summary && (
            <div style={{ padding: 20, background: "rgba(91,95,251,0.08)", borderLeft: "4px solid var(--primary)", borderRadius: "0 8px 8px 0", marginBottom: 28 }}>
              <p style={{ fontSize: 15, color: "var(--on-surface)", lineHeight: 1.6, fontFamily: "'Inter', sans-serif", margin: 0 }}>
                {notesData.summary}
              </p>
            </div>
          )}

          {notesData.shouldGenerateImage && notesData.imagePrompt && showImage && (
            <div style={{ marginBottom: 32, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
              <img 
                src={`https://image.pollinations.ai/prompt/${encodeURIComponent(notesData.imagePrompt)}?width=800&height=400&nologo=true`} 
                alt="AI Generated Context" 
                style={{ width: "100%", display: "block", objectFit: "cover" }}
                onError={() => setShowImage(false)}
              />
            </div>
          )}

          {showDiagram && diagramSvg && (
            <div style={{ marginBottom: 32, background: "var(--surface-container-lowest)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
              <h4 className="text-label-caps" style={{ color: "var(--accent-cyan)", marginBottom: 16 }}>Concept Map</h4>
              <div style={{ display: "flex", justifyContent: "center", background: "white", padding: 16, borderRadius: 8, overflowX: "auto" }}>
                <div
                  style={{ maxWidth: "100%" }}
                  dangerouslySetInnerHTML={{ __html: diagramSvg }}
                />
              </div>
            </div>
          )}

          {!!markdownNotes && (
            <div style={{ marginBottom: 32 }}>
              <h4 className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 16 }}>Detailed Notes</h4>
              <div style={{ lineHeight: 1.75, color: "var(--on-surface)", fontSize: 14 }}>
                <ReactMarkdown>{markdownNotes}</ReactMarkdown>
              </div>
            </div>
          )}

          {notesData.keyConcepts && notesData.keyConcepts.length > 0 && (
            <div>
              <h4 className="text-label-caps" style={{ color: "var(--secondary)", marginBottom: 16 }}>Key Concepts</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                {notesData.keyConcepts.map((concept, idx: number) => (
                  <div key={idx} style={{
                    padding: 20,
                    borderRadius: 12,
                    background: "rgba(210,187,255,0.05)",
                    border: "1px solid rgba(210,187,255,0.15)"
                  }}>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--secondary)", marginBottom: 8 }}>
                      {concept.concept}
                    </p>
                    <p style={{ fontSize: 13, color: "var(--on-surface-variant)", lineHeight: 1.5 }}>
                      {concept.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {quizData && !quizData.error && quizData.questions && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
          {quizResult && (
            <div className="card" style={{ padding: 24, background: "linear-gradient(135deg, rgba(91,95,251,0.1), rgba(34,199,240,0.05))", border: "1px solid rgba(91,95,251,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--on-surface)" }}>Quiz Results</h3>
                  <p style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>You scored {quizResult.score} out of {quizResult.total}</p>
                </div>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700,
                  color: quizResult.accuracy >= 75 ? "var(--success)" : quizResult.accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)"
                }}>
                  {quizResult.accuracy.toFixed(0)}%
                </div>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{
                  width: `${quizResult.accuracy}%`,
                  background: `linear-gradient(90deg, var(--surface-container-high), ${quizResult.accuracy >= 75 ? "var(--success)" : quizResult.accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)"})`
                }} />
              </div>
            </div>
          )}

          {quizData.questions.map((q, i: number) => {
            const isCorrect = userAnswers[i] === q.correctAnswer;
            return (
              <div key={i} className="card" style={{ padding: 24 }}>
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16 }}>
                  <span style={{ color: "var(--primary)", marginRight: 8 }}>{i + 1}.</span>
                  {q.question}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {q.options?.map((opt: string, j: number) => {
                    const isSelected = userAnswers[i] === opt;
                    
                    let cardClass = "option-card";
                    if (!quizResult && isSelected) cardClass += " selected";
                    if (quizResult && opt === q.correctAnswer) cardClass += " correct";
                    if (quizResult && isSelected && opt !== q.correctAnswer) cardClass += " wrong";
                    
                    return (
                      <div key={j} className={cardClass} onClick={() => handleOptionSelect(i, opt)}>
                        <div className="option-letter">{String.fromCharCode(65 + j)}</div>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
                {quizResult && (
                  <div style={{
                    marginTop: 16, padding: "12px 16px", borderRadius: 8,
                    background: isCorrect ? "rgba(74,222,128,0.1)" : "rgba(255,180,171,0.1)",
                    border: `1px solid ${isCorrect ? "rgba(74,222,128,0.2)" : "rgba(255,180,171,0.2)"}`,
                    display: "flex", alignItems: "center", gap: 8
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: isCorrect ? "var(--success)" : "var(--error)" }}>
                      {isCorrect ? "check_circle" : "cancel"}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isCorrect ? "var(--success)" : "var(--error)" }}>
                      {isCorrect ? "Correct answer!" : `Incorrect. The correct answer is: ${q.correctAnswer}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {!quizResult && (
            <div style={{
              position: "sticky", bottom: 24, zIndex: 10,
              padding: 20, borderRadius: 16,
              background: "rgba(31,31,40,0.85)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
            }}>
              <button
                className="btn btn-primary"
                onClick={handleSubmitQuiz}
                disabled={loading === "evaluating"}
                style={{ width: "100%", padding: "14px", fontSize: 16 }}
              >
                {loading === "evaluating" ? "Analyzing Results..." : "Submit Answers for Evaluation"}
              </button>
            </div>
          )}
        </div>
      )}

      {notesData?.error && (
        <div className="card" style={{ padding: 20, background: "rgba(255,180,171,0.1)", border: "1px solid var(--error)", color: "var(--error)", marginTop: 20 }}>
          <span className="material-symbols-rounded" style={{ marginRight: 8, verticalAlign: "middle" }}>error</span>
          Error generating notes: {notesData.error}
        </div>
      )}
      {quizData?.error && (
        <div className="card" style={{ padding: 20, background: "rgba(255,180,171,0.1)", border: "1px solid var(--error)", color: "var(--error)", marginTop: 20 }}>
          <span className="material-symbols-rounded" style={{ marginRight: 8, verticalAlign: "middle" }}>error</span>
          Error generating quiz: {quizData.error}
        </div>
      )}
    </>
  );
}
