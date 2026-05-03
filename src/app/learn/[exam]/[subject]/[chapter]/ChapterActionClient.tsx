"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  chapter?: string;
  difficulty?: "easy" | "medium" | "hard";
  concept?: string;
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

function normalizeMermaid(diagram: string): string {
  let normalized = diagram.trim();

  normalized = normalized.replace(/^graph\s+(TD|LR|RL|BT)\s+(.+)$/i, (_m, dir, rest) => `graph ${dir}\n${rest}`);
  normalized = normalized.replace(/^flowchart\s+(TD|LR|RL|BT)\s+(.+)$/i, (_m, dir, rest) => `flowchart ${dir}\n${rest}`);

  // Split common one-line chains into multiple lines to satisfy parser expectations.
  normalized = normalized.replace(/\s+([A-Za-z0-9_]+\s*-->|[A-Za-z0-9_]+\s*-.->|[A-Za-z0-9_]+\s*==>)\s*/g, "\n$1 ");
  // Normalize malformed multi-node joins like "B &D --> E" into "B & D --> E".
  normalized = normalized.replace(/([A-Za-z0-9_])&([A-Za-z0-9_])/g, "$1 & $2");
  // Drop trailing semicolons and normalize whitespace.
  normalized = normalized
    .split("\n")
    .map((line) => line.trim().replace(/;+\s*$/, ""))
    .filter(Boolean)
    .join("\n");

  return normalized;
}

function buildFallbackDiagram(chapter: string, sections: { heading: string; bulletPoints: string[] }[] | undefined): string {
  const nodes = (sections || []).slice(0, 3).map((s, i) => `N${i + 1}["${s.heading.replace(/"/g, "")}"]`);
  const links = (sections || []).slice(0, 3).map((_, i) => `ROOT --> N${i + 1}`);
  return [`graph TD`, `ROOT["${chapter.replace(/"/g, "")}"]`, ...nodes, ...links].join("\n");
}

function getFirstMermaidLine(diagram: string): string {
  const lines = diagram
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%%"));
  return lines[0] ?? "";
}

export default function ChapterActionClient({ exam, subject, chapter }: Props) {
  const router = useRouter();
  const storageKey = `chapter-notes:${exam}:${subject}:${chapter}`;
  const initialStored = (() => {
    if (typeof window === "undefined") return {} as { notesData?: NotesData; savedNoteId?: string | null };
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as { notesData?: NotesData; savedNoteId?: string | null }) : {};
    } catch {
      return {};
    }
  })();
  const [loading, setLoading] = useState<"quiz" | "notes" | "evaluating" | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [notesData, setNotesData] = useState<NotesData | null>(initialStored.notesData ?? null);
  const [diagramSvg, setDiagramSvg] = useState<string | null>(null);
  const [showDiagram, setShowDiagram] = useState(false);
  const [showImage, setShowImage] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [questionTouchSeconds, setQuestionTouchSeconds] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<{
    score: number;
    total: number;
    accuracy: number;
    analysis: {
      level: string;
      coreIssue: string;
      weakAreas: string[];
      strengths: string[];
      mistakePattern: string;
      timeInsight: string;
      actionPlan: string[];
    };
  } | null>(null);
  const [saveNotice, setSaveNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(initialStored.savedNoteId ?? null);

  useEffect(() => {
    try {
      if (!notesData) return;
      sessionStorage.setItem(storageKey, JSON.stringify({ notesData, savedNoteId }));
    } catch {
      // ignore storage write failures
    }
  }, [notesData, savedNoteId, storageKey]);

  const handleSaveNotes = async (): Promise<string | null> => {
    if (!notesData) return null;

    const lines: string[] = [];
    lines.push(`# ${notesData.title || `${chapter} Notes`}`);
    if (notesData.summary) lines.push(`## Summary\n${notesData.summary}`);
    if (notesData.sections?.length) {
      for (const section of notesData.sections) {
        lines.push(`## ${section.heading}`);
        for (const point of section.bulletPoints) lines.push(`- ${point}`);
      }
    }
    if (notesData.keyConcepts?.length) {
      lines.push("## Key Concepts");
      for (const item of notesData.keyConcepts) lines.push(`- **${item.concept}**: ${item.description}`);
    }
    if (notesData.diagram) lines.push(`## Diagram\n\`\`\`mermaid\n${notesData.diagram}\n\`\`\``);
    const content = lines.join("\n\n").trim() || `# ${chapter} Notes`;

    try {
      const res = await fetch("/api/notes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam, subject, chapter, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save notes");
      const noteId = typeof data.note?._id === "string" ? data.note._id : String(data.note?._id || "");
      if (noteId) setSavedNoteId(noteId);
      if (data.duplicate) {
        setSaveNotice({ type: "success", message: "Notes already saved for this chapter." });
      } else {
        setSaveNotice({ type: "success", message: "Notes saved successfully." });
      }
      return noteId || null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save notes";
      setSaveNotice({ type: "error", message });
      return null;
    }
  };

  const handleViewDiagram = async () => {
    let noteId = savedNoteId;
    if (!noteId) {
      noteId = await handleSaveNotes();
    }
    if (!noteId) return;
    router.push(`/diagram/${noteId}`);
  };

  const handleGenerateQuiz = async () => {
    setLoading("quiz");
    setNotesData(null);
    setUserAnswers({});
    setQuestionTouchSeconds({});
    setQuizStartedAt(Date.now());
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
      setSavedNoteId(null);
      setSaveNotice(null);
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
      const normalizedDiagram = normalizeMermaid(cleanedDiagram);
      const fallbackDiagram = buildFallbackDiagram(chapter, notesData?.sections);
      const firstLine = getFirstMermaidLine(normalizedDiagram).toLowerCase();
      const startsValid = MERMAID_STARTERS.some((starter) => firstLine.startsWith(starter.toLowerCase()));

      if (!cleanedDiagram || !startsValid) {
        // Attempt to render fallback instead of hard-hiding section.
        try {
          const mermaid = (await import("mermaid")).default;
          mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "strict", suppressErrorRendering: true });
          await mermaid.parse(fallbackDiagram);
          const { svg } = await mermaid.render(`notes-diagram-fallback-${Date.now()}`, fallbackDiagram);
          if (!cancelled) {
            setDiagramSvg(svg);
            setShowDiagram(true);
          }
        } catch {
          setShowDiagram(false);
          setDiagramSvg(null);
        }
        return;
      }

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "strict", suppressErrorRendering: true });
        await mermaid.parse(normalizedDiagram);
        const id = `notes-diagram-${Date.now()}`;
        const { svg } = await mermaid.render(id, normalizedDiagram);
        if (!cancelled) {
          setDiagramSvg(svg);
          setShowDiagram(true);
        }
      } catch {
        // If AI Mermaid is malformed, render deterministic fallback diagram.
        try {
          const mermaid = (await import("mermaid")).default;
          mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "strict", suppressErrorRendering: true });
          await mermaid.parse(fallbackDiagram);
          const { svg } = await mermaid.render(`notes-diagram-fallback-${Date.now()}`, fallbackDiagram);
          if (!cancelled) {
            setDiagramSvg(svg);
            setShowDiagram(true);
          }
        } catch {
          if (!cancelled) {
            setShowDiagram(false);
            setDiagramSvg(null);
          }
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
    if (quizStartedAt) {
      setQuestionTouchSeconds((prev) => {
        if (prev[questionIndex]) return prev;
        return { ...prev, [questionIndex]: Math.max(1, Math.round((Date.now() - quizStartedAt) / 1000)) };
      });
    }
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
      const totalTimeTaken = quizStartedAt ? Math.max(1, Math.round((Date.now() - quizStartedAt) / 1000)) : quizData.questions.length * 45;
      const averageQuestionTime = Math.max(5, Math.round(totalTimeTaken / quizData.questions.length));
      const timings = quizData.questions.map((_, idx) => questionTouchSeconds[idx] || averageQuestionTime);
      const res = await fetch("/api/evaluate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam,
          subject,
          chapter,
          questions: quizData.questions,
          userAnswers,
          timeTaken: totalTimeTaken,
          questionTimings: timings,
        }),
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
            <button className="btn btn-secondary" onClick={handleSaveNotes} style={{ marginLeft: "auto", fontSize: 12, padding: "7px 12px" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>save</span>
              Save Notes
            </button>
            <button className="btn btn-secondary" onClick={handleViewDiagram} style={{ fontSize: 12, padding: "7px 12px" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>schema</span>
              View Diagram
            </button>
          </div>
          {saveNotice && (
            <div style={{
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: 8,
              fontSize: 12,
              background: saveNotice.type === "success" ? "rgba(74,222,128,0.12)" : "rgba(255,180,171,0.12)",
              border: `1px solid ${saveNotice.type === "success" ? "rgba(74,222,128,0.35)" : "rgba(255,180,171,0.35)"}`,
              color: saveNotice.type === "success" ? "var(--success)" : "var(--error)",
            }}>
              {saveNotice.message}
            </div>
          )}

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
            <div className="card" style={{ padding: 24, background: "linear-gradient(135deg, rgba(91,95,251,0.08), rgba(34,199,240,0.04))", border: "1px solid rgba(91,95,251,0.25)" }}>
              {/* Score header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--on-surface)", marginBottom: 3 }}>Quiz Results</h3>
                  <p style={{ fontSize: 12, color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif" }}>
                    {quizResult.score}/{quizResult.total} correct
                    <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
                    <span style={{
                      color: quizResult.analysis.level === "Strong" ? "var(--success)" : quizResult.analysis.level === "Weak" ? "var(--error)" : "var(--accent-cyan)",
                      fontWeight: 600,
                    }}>{quizResult.analysis.level}</span>
                    <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
                    {quizResult.analysis.coreIssue}
                  </p>
                </div>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 800, lineHeight: 1,
                  color: quizResult.accuracy >= 75 ? "var(--success)" : quizResult.accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)",
                }}>
                  {quizResult.accuracy.toFixed(0)}%
                </div>
              </div>

              <div className="progress-bar" style={{ marginBottom: 20 }}>
                <div className="progress-bar-fill" style={{
                  width: `${quizResult.accuracy}%`,
                  background: quizResult.accuracy >= 75 ? "var(--success)" : quizResult.accuracy >= 50 ? "var(--accent-cyan)" : "var(--error)",
                }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {/* Weak Areas */}
                {quizResult.analysis.weakAreas.length > 0 && (
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--error)", marginBottom: 8 }}>Weak Areas</p>
                    <ul style={{ margin: 0, paddingLeft: 15, display: "flex", flexDirection: "column", gap: 5 }}>
                      {quizResult.analysis.weakAreas.map((w, i) => (
                        <li key={i} style={{ fontSize: 12, color: "var(--on-surface-variant)", lineHeight: 1.4, fontFamily: "'Inter', sans-serif" }}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Strengths */}
                {quizResult.analysis.strengths.length > 0 && (
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--success)", marginBottom: 8 }}>Strength</p>
                    <ul style={{ margin: 0, paddingLeft: 15, display: "flex", flexDirection: "column", gap: 5 }}>
                      {quizResult.analysis.strengths.map((s, i) => (
                        <li key={i} style={{ fontSize: 12, color: "var(--on-surface-variant)", lineHeight: 1.4, fontFamily: "'Inter', sans-serif" }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mistake Pattern */}
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--tertiary)", marginBottom: 6 }}>Mistake Pattern</p>
                  <p style={{ fontSize: 12, color: "var(--on-surface-variant)", margin: 0, lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>{quizResult.analysis.mistakePattern}</p>
                </div>

                {/* Time Insight */}
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--accent-cyan)", marginBottom: 6 }}>Time Insight</p>
                  <p style={{ fontSize: 12, color: "var(--on-surface-variant)", margin: 0, lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>{quizResult.analysis.timeInsight}</p>
                </div>

                {/* Action Plan */}
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(91,95,251,0.08)", border: "1px solid rgba(91,95,251,0.25)", gridColumn: "1 / -1" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--primary)", marginBottom: 8 }}>Action Plan</p>
                  <ul style={{ margin: 0, paddingLeft: 15, display: "flex", flexDirection: "column", gap: 5 }}>
                    {quizResult.analysis.actionPlan.map((step, i) => (
                      <li key={i} style={{ fontSize: 12, color: "var(--on-surface-variant)", lineHeight: 1.4, fontFamily: "'Inter', sans-serif" }}>{step}</li>
                    ))}
                  </ul>
                </div>

                {/* Quick-action buttons */}
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                  <button className="btn btn-primary" onClick={handleGenerateQuiz} style={{ fontSize: 12 }}>Take Adaptive Quiz</button>
                  <button className="btn btn-secondary" onClick={handleGenerateNotes} style={{ fontSize: 12 }}>Revision Notes</button>
                  <button className="btn btn-secondary" onClick={() => router.push("/flashcards")} style={{ fontSize: 12 }}>Flashcards</button>
                </div>
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
