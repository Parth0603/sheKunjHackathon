"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { EXAM_CONFIGS, type ExamId } from "@/lib/examConfig";

type Card = {
  cardId: string;
  question: string;
  answer: string;
  explanation?: string;
  example?: string;
  subject?: string;
  topic?: string;
  difficulty: "easy" | "medium" | "hard";
  tip?: string;
  progress?: { status: "new" | "known" | "revise" } | null;
};

type SavedSet = {
  id: string;
  exam: string;
  subject: string;
  chapter: string;
  topic?: string;
  count: number;
  updatedAt: string;
};

const examOptions: Array<{ id: ExamId; label: string }> = [
  { id: "JEE Advanced", label: "JEE" },
  { id: "GATE", label: "GATE" },
  { id: "NEET", label: "NEET" },
  { id: "UPSC", label: "UPSC" },
];

const countOptions = [5, 10, 20];

const difficultyTheme = {
  easy: {
    border: "#4ade80",
    bg: "#f0fdf4",
    badgeBg: "#dcfce7",
    badgeText: "#166534",
  },
  medium: {
    border: "#60a5fa",
    bg: "#eff6ff",
    badgeBg: "#dbeafe",
    badgeText: "#1d4ed8",
  },
  hard: {
    border: "#fb923c",
    bg: "#fff7ed",
    badgeBg: "#ffedd5",
    badgeText: "#c2410c",
  },
};

function subjectAccent(subject: string): { border: string; tint: string } {
  const s = subject.toLowerCase();
  if (s.includes("physics")) return { border: "#3b82f6", tint: "rgba(59,130,246,0.08)" };
  if (s.includes("chemistry")) return { border: "#22c55e", tint: "rgba(34,197,94,0.08)" };
  if (s.includes("math")) return { border: "#a855f7", tint: "rgba(168,85,247,0.08)" };
  if (s.includes("computer") || s.includes("cs")) return { border: "#14b8a6", tint: "rgba(20,184,166,0.08)" };
  return { border: "#64748b", tint: "rgba(100,116,139,0.08)" };
}

function useTouchSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef<number | null>(null);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX.current = e.changedTouches[0]?.clientX ?? null;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current === null) return;
      const delta = (e.changedTouches[0]?.clientX ?? 0) - startX.current;
      if (delta < -40) onLeft();
      if (delta > 40) onRight();
      startX.current = null;
    },
  };
}

function extractKeyPoints(answer: string): string[] {
  return answer
    .split(/\.|\n|;/)
    .map((part) => part.trim())
    .filter((part) => part.length > 24)
    .slice(0, 3);
}

function splitForDisplay(answer: string): string[] {
  return answer
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function isTechnicalSubject(subject: string): boolean {
  const s = subject.toLowerCase();
  return s.includes("computer") || s.includes("electrical") || s.includes("mechanical") || s.includes("mathematics") || s.includes("physics");
}

export default function FlashcardsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [exam, setExam] = useState<ExamId | "">("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState<number>(10);
  const [customCount, setCustomCount] = useState("");

  const [chapters, setChapters] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [savedSets, setSavedSets] = useState<SavedSet[]>([]);

  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [setId, setSetId] = useState("");
  const [sourceKey, setSourceKey] = useState("");

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [viewedCardIds, setViewedCardIds] = useState<Set<string>>(new Set());

  const [reviewMode, setReviewMode] = useState<"all" | "weak" | "new">("all");
  const [toast, setToast] = useState<string | null>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/flashcards/sets");
        const data = await res.json();
        if (res.ok) setSavedSets(Array.isArray(data.sets) ? data.sets : []);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (!exam || !subject) return;
    (async () => {
      try {
        const url = `/api/flashcards/meta?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok) {
          setChapters(Array.isArray(data.chapters) ? data.chapters : []);
          setTopics(Array.isArray(data.topics) ? data.topics : []);
        }
      } catch {
        setChapters([]);
        setTopics([]);
      }
    })();
  }, [exam, subject]);

  const currentCard = cards[index] || null;

  const moveTo = useCallback((targetIndex: number) => {
    const bounded = Math.max(0, Math.min(targetIndex, Math.max(cards.length - 1, 0)));
    setIndex(bounded);
    const card = cards[bounded];
    if (card) {
      setViewedCardIds((prev) => {
        if (prev.has(card.cardId)) return prev;
        const next = new Set(prev);
        next.add(card.cardId);
        return next;
      });
    }
    setFlipped(false);
  }, [cards]);

  const nextCard = useCallback(() => moveTo(index + 1), [index, moveTo]);
  const prevCard = useCallback(() => moveTo(index - 1), [index, moveTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (cards.length === 0) return;
      if (e.key === "ArrowRight") nextCard();
      if (e.key === "ArrowLeft") prevCard();
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards.length, nextCard, prevCard]);

  const subjects = useMemo(() => {
    if (!exam) return [];
    return EXAM_CONFIGS[exam].subjects;
  }, [exam]);

  const swipeHandlers = useTouchSwipe(nextCard, prevCard);

  const generate = async () => {
    if (!exam || !subject || !chapter) return;
    setLoading(true);
    try {
      const actualCount = count === -1 ? Math.max(1, Number(customCount || 10)) : count;
      const weakCards = savedSets.filter((s) => s.exam === exam && s.subject === subject).slice(0, 5).map((s) => s.chapter);

      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam, subject, chapter, topic, count: actualCount, userWeakAreas: weakCards }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setCards(Array.isArray(data.cards) ? data.cards : []);
      setSetId(data.setId || "");
      setSourceKey(data.sourceKey || "");
      const firstCard = Array.isArray(data.cards) && data.cards[0]?.cardId ? [data.cards[0].cardId] : [];
      setViewedCardIds(new Set(firstCard));
      setIndex(0);
      setFlipped(false);
      setStep(7);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate flashcards";
      notify(message);
    } finally {
      setLoading(false);
    }
  };

  const saveSet = async () => {
    if (!cards.length || !exam || !subject || !chapter) return;
    try {
      const res = await fetch("/api/flashcards/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam, subject, chapter, topic, count: cards.length, cards, sourceKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save set");
      setSetId(data.setId || "");
      const listRes = await fetch("/api/flashcards/sets");
      const list = await listRes.json();
      if (listRes.ok) setSavedSets(Array.isArray(list.sets) ? list.sets : []);
      notify("Set saved");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      notify(message);
    }
  };

  const resumeSet = async (id: string, mode: "all" | "weak" | "new" = "all") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/flashcards/set?setId=${encodeURIComponent(id)}&mode=${mode}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load set");

      setExam(data.set?.exam || "");
      setSubject(data.set?.subject || "");
      setChapter(data.set?.chapter || "");
      setTopic(data.set?.topic || "");
      setCards(Array.isArray(data.cards) ? data.cards : []);
      setSetId(id);
      setReviewMode(mode);
      const firstCard = Array.isArray(data.cards) && data.cards[0]?.cardId ? [data.cards[0].cardId] : [];
      setViewedCardIds(new Set(firstCard));
      setIndex(0);
      setFlipped(false);
      setStep(7);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resume set";
      notify(message);
    } finally {
      setLoading(false);
    }
  };

  const progressPct = cards.length ? Math.round(((index + 1) / cards.length) * 100) : 0;
  const theme = difficultyTheme[currentCard?.difficulty ?? "medium"];
  const keyPoints = currentCard ? extractKeyPoints(currentCard.answer) : [];
  const answerBlocks = currentCard ? splitForDisplay(currentCard.answer) : [];
  const explanationPoints = currentCard?.explanation
    ? currentCard.explanation.split(/\n|•|-/).map((x) => x.trim()).filter(Boolean).slice(0, 4)
    : [];
  const displayTopic = currentCard?.topic || topic || chapter || "Core concept";
  const cardSubject = currentCard?.subject || subject || "General";
  const subjectTone = subjectAccent(cardSubject);
  const technical = isTechnicalSubject(subject);
  const removeSet = async (id: string) => {
    try {
      const res = await fetch(`/api/flashcards/sets?setId=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to remove set");
      setSavedSets((prev) => prev.filter((s) => s.id !== id));
      if (setId === id) {
        setCards([]);
        setSetId("");
        setStep(1);
      }
      notify("Set removed");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove set";
      notify(message);
    }
  };

  return (
    <div className="flashcards-shell" style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 6 }}>Flashcards</div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "var(--on-surface)" }}>
          Smart Revision Flashcards
        </h1>
      </div>

      {step !== 7 && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ marginBottom: 14, fontSize: 13, color: "var(--on-surface-variant)" }}>Step {step} of 6</div>

          {step === 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {examOptions.map((ex) => (
                <button key={ex.id} className={`btn ${exam === ex.id ? "btn-primary" : "btn-secondary"}`} onClick={() => { setExam(ex.id); setSubject(""); setChapter(""); setStep(2); }}>
                  {ex.label}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {subjects.map((s) => (
                <button key={s} className={`btn ${subject === s ? "btn-primary" : "btn-secondary"}`} onClick={() => { setSubject(s); setChapter(""); setStep(3); }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {chapters.map((c) => (
                  <button key={c} className={`btn ${chapter === c ? "btn-primary" : "btn-secondary"}`} onClick={() => { setChapter(c); setStep(4); }}>
                    {c}
                  </button>
                ))}
              </div>
              <input className="input" placeholder="Or type chapter manually" value={chapter} onChange={(e) => setChapter(e.target.value)} />
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-primary" onClick={() => chapter.trim() && setStep(4)}>Continue</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <input className="input" list="topic-suggestions" placeholder="Optional topic (searchable), e.g. Dynamic Programming" value={topic} onChange={(e) => setTopic(e.target.value)} />
              <datalist id="topic-suggestions">
                {topics.map((t) => <option key={t} value={t} />)}
              </datalist>
              <div style={{ marginTop: 10 }}>
                <button className="btn btn-primary" onClick={() => setStep(5)}>Continue</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                {countOptions.map((c) => (
                  <button key={c} className={`btn ${count === c ? "btn-primary" : "btn-secondary"}`} onClick={() => setCount(c)}>{c}</button>
                ))}
                <button className={`btn ${count === -1 ? "btn-primary" : "btn-secondary"}`} onClick={() => setCount(-1)}>Custom</button>
              </div>
              {count === -1 && <input className="input" placeholder="Enter custom count" value={customCount} onChange={(e) => setCustomCount(e.target.value)} />}
              <div style={{ marginTop: 10 }}><button className="btn btn-primary" onClick={() => setStep(6)}>Continue</button></div>
            </div>
          )}

          {step === 6 && (
            <div>
              <div style={{ lineHeight: 1.7, color: "var(--on-surface-variant)", marginBottom: 12 }}>
                <div>Exam: {exam}</div><div>Subject: {subject}</div><div>Chapter: {chapter}</div><div>Topic: {topic || "General"}</div><div>Count: {count === -1 ? customCount || "10" : count}</div>
              </div>
              <button className="btn btn-primary" onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate Flashcards"}</button>
            </div>
          )}

          {loading && (
            <div className="skeleton-card" style={{ marginTop: 16 }}>
              <div className="skeleton-shimmer" />
              <div className="skeleton-line" style={{ width: "26%" }} />
              <div className="skeleton-line" style={{ width: "82%" }} />
              <div className="skeleton-line" style={{ width: "70%" }} />
            </div>
          )}

          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            {step > 1 && step < 7 && <button className="btn btn-secondary" onClick={() => setStep((s) => s - 1)}>Back</button>}
            {step < 7 && <button className="btn btn-ghost" onClick={() => setStep(1)}>Reset</button>}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16 }}>Saved Sets</h3>
          {setId && <button className="btn btn-secondary" onClick={saveSet}>Save Set</button>}
        </div>

        {savedSets.length === 0 ? (
          <p style={{ color: "var(--on-surface-variant)" }}>Generate your first flashcards to start quick revision</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {savedSets.map((s) => (
              <div key={s.id} className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 600 }}>{s.exam} - {s.subject}</div>
                <div style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>{s.chapter}{s.topic ? ` (${s.topic})` : ""}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn btn-secondary" onClick={() => resumeSet(s.id, "all")}>View Card</button>
                  <button className="btn btn-secondary" onClick={() => removeSet(s.id)}>Remove Card</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {step === 7 && currentCard && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "var(--on-surface-variant)" }}>
            <div>Mode: {reviewMode}</div>
            <div>Card {index + 1} / {cards.length}</div>
          </div>
          <div className="progress-bar" style={{ marginBottom: 14 }}><div className="progress-bar-fill" style={{ width: `${progressPct}%` }} /></div>

          <div
            {...swipeHandlers}
            className="rich-flashcard"
            style={{
              minHeight: 380,
              height: "min(56vh, 460px)",
              perspective: "1200px",
              borderRadius: 20,
              cursor: "pointer",
              marginBottom: 14,
              userSelect: "none",
              overflow: "hidden",
              boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
              border: `2px solid ${subjectTone.border}`,
              background: `linear-gradient(180deg, ${subjectTone.tint}, ${theme.bg})`,
            }}
            onClick={() => setFlipped((v) => !v)}
          >
            <div
              style={{
                position: "relative",
                minHeight: 380,
                width: "100%",
                transition: "transform 0.36s ease",
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              <div className="card-face" style={{ backfaceVisibility: "hidden" }}>
                <div className="card-head">
                  <span className="topic-chip">{`${exam || "Exam"} • ${cardSubject}`}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className="diff-chip" style={{ background: theme.badgeBg, color: theme.badgeText }}>{currentCard.difficulty.toUpperCase()}</span>
                    <span className="index-chip">{index + 1}/{cards.length}</span>
                  </div>
                </div>
                <div className="label-row">QUESTION</div>
                <div className="question-text">{currentCard.question}</div>
                <div className="subject-row">
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>school</span>
                  <span>{displayTopic}</span>
                </div>
              </div>

              <div className="card-face" style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
                <div className="card-head">
                  <span className="topic-chip">{`${exam || "Exam"} • ${cardSubject}`}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className="diff-chip" style={{ background: theme.badgeBg, color: theme.badgeText }}>{currentCard.difficulty.toUpperCase()}</span>
                    <span className="index-chip">{index + 1}/{cards.length}</span>
                  </div>
                </div>

                <div className="label-row">ANSWER</div>
                <div className="answer-content">
                  {answerBlocks.map((block) => (
                    <p key={block} className={`answer-block ${technical ? "technical" : ""}`}>{block}</p>
                  ))}
                </div>

                {(explanationPoints.length > 0 || keyPoints.length > 0) && (
                  <div className="explanation-box" style={{ marginTop: 10 }}>
                    <div className="mini-title">Explanation</div>
                    <ul className="key-list">
                      {(explanationPoints.length > 0 ? explanationPoints : keyPoints).map((point) => <li key={point}>{point}</li>)}
                    </ul>
                  </div>
                )}

                {currentCard?.example && (
                  <div className="example-box">
                    <div className="mini-title">Example</div>
                    <div style={{ fontSize: 14, lineHeight: 1.65 }}>{currentCard.example}</div>
                  </div>
                )}

                {currentCard.tip && (
                  <div className="tip-box">
                    <div className="mini-title">Exam Tip</div>
                    <div>{currentCard.tip}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={prevCard}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_back</span>
              Previous
            </button>
            <button className="btn btn-secondary" onClick={() => setFlipped((v) => !v)}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>autorenew</span>
              {flipped ? "Show Question" : "Flip Card"}
            </button>
            <button className="btn btn-secondary" onClick={nextCard}>
              Next
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_forward</span>
            </button>
          </div>

          
        </div>
      )}

      {step === 7 && cards.length === 0 && (
        <div className="card" style={{ padding: 20 }}>Generate your first flashcards to start quick revision</div>
      )}

      {toast && <div className="toast-note">{toast}</div>}

      <style jsx>{`
        .card-face {
          position: absolute;
          inset: 0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          text-align: left;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 16px;
        }
        .topic-chip, .index-chip, .diff-chip {
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          border: 1px solid rgba(15, 23, 42, 0.12);
        }
        .topic-chip {
          background: rgba(255,255,255,0.72);
          color: #0f172a;
          max-width: 42%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .index-chip {
          background: rgba(255,255,255,0.72);
          color: #334155;
          border-color: rgba(148, 163, 184, 0.36);
        }
        .label-row {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #475569;
          margin-bottom: 10px;
        }
        .question-text {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(20px, 3vw, 28px);
          line-height: 1.45;
          color: #0f172a;
          margin-top: 6px;
          max-width: 92%;
          align-self: center;
          text-align: center;
          padding: 12px 0;
        }
        .subject-row {
          margin-top: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
        }
        .answer-content {
          max-width: 92%;
          line-height: 1.7;
          color: #0f172a;
        }
        .answer-block {
          margin: 0 0 8px;
          font-size: 15px;
        }
        .answer-block.technical {
          font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
          background: rgba(255,255,255,0.65);
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 8px;
          padding: 8px 10px;
        }
        .mini-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 6px;
        }
        .key-list {
          margin: 0;
          padding-left: 18px;
          line-height: 1.65;
          font-size: 14px;
          color: #1e293b;
        }
        .tip-box {
          margin-top: 10px;
          border: 1px solid rgba(59,130,246,0.25);
          background: rgba(59,130,246,0.12);
          border-radius: 10px;
          padding: 10px;
          color: #334155;
          font-size: 13px;
        }
        .explanation-box {
          border: 1px solid rgba(34,197,94,0.24);
          background: rgba(34,197,94,0.1);
          border-radius: 10px;
          padding: 10px;
        }
        .example-box {
          margin-top: 10px;
          border: 1px solid rgba(251,191,36,0.28);
          background: rgba(251,191,36,0.13);
          border-radius: 10px;
          padding: 10px;
          color: #374151;
        }
        .skeleton-card {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 16px;
          min-height: 150px;
        }
        .skeleton-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.6) 45%, transparent 70%);
          animation: shimmer 1.2s infinite;
        }
        .skeleton-line {
          height: 12px;
          border-radius: 999px;
          background: #cbd5e1;
          margin: 12px 0;
          position: relative;
          z-index: 1;
        }
        .toast-note {
          position: fixed;
          bottom: 18px;
          right: 18px;
          background: #0f172a;
          color: #fff;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 12px;
          box-shadow: 0 10px 30px rgba(15,23,42,0.25);
          z-index: 50;
        }
        @keyframes shimmer {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        @media (max-width: 920px) {
          .flashcards-shell { padding: 18px 14px !important; }
        }
        @media (max-width: 760px) {
          .rich-flashcard { min-height: 360px !important; height: min(60vh, 520px) !important; }
          .card-face { padding: 14px; }
          .question-text { max-width: 100%; font-size: 21px; }
          .answer-content { max-width: 100%; }
          .topic-chip { max-width: 50%; }
        }
      `}</style>
    </div>
  );
}
