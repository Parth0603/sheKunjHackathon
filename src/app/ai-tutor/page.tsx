"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type Message = { role: "user" | "ai"; content: string; time: string };
type Diagnostic = { title: string; desc: string; level: "weak" | "strong" | "trend" };
type ReferenceAsset = { title: string; type: string; meta: string };

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function levelColor(level: Diagnostic["level"]) {
  if (level === "weak") return "var(--error)";
  if (level === "strong") return "var(--success)";
  return "var(--accent-cyan)";
}

const markdownComponents: Components = {
  p: (props) => <p style={{ margin: "0 0 10px", lineHeight: 1.7 }} {...props} />,
  ul: (props) => <ul style={{ margin: "0 0 12px 18px", lineHeight: 1.7 }} {...props} />,
  ol: (props) => <ol style={{ margin: "0 0 12px 18px", lineHeight: 1.7 }} {...props} />,
  li: (props) => <li style={{ marginBottom: 6 }} {...props} />,
  h1: (props) => <h3 style={{ margin: "0 0 10px", fontSize: 20, lineHeight: 1.35 }} {...props} />,
  h2: (props) => <h4 style={{ margin: "0 0 9px", fontSize: 18, lineHeight: 1.35 }} {...props} />,
  h3: (props) => <h5 style={{ margin: "0 0 8px", fontSize: 16, lineHeight: 1.35 }} {...props} />,
  code: (props) => <code style={{ fontSize: 13 }} {...props} />,
  pre: (props) => (
    <pre
      style={{
        margin: "0 0 12px",
        padding: 12,
        borderRadius: 10,
        overflowX: "auto",
        background: "var(--surface-container-high)",
        border: "1px solid var(--outline-variant)",
      }}
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote
      style={{
        margin: "0 0 12px",
        padding: "8px 12px",
        borderLeft: "3px solid var(--primary)",
        background: "var(--surface-container-high)",
        borderRadius: 8,
      }}
      {...props}
    />
  ),
};

async function postTutor(payload: Record<string, unknown>) {
  const res = await fetch("/api/ai-tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to get response");
  return data;
}

type TutorPayload = {
  exam?: string;
  subject?: string;
  chapter?: string;
  diagnostics?: Diagnostic[];
  diagnosticsMessage?: string;
  suggestedQuestions?: string[];
  followUps?: string[];
  referenceAssets?: ReferenceAsset[];
  history?: Array<{ role: "user" | "ai"; content: string }>;
  firstMessage?: string;
  response?: { text?: string };
};

export default function AITutorPage() {
  const { status } = useSession();
  const router = useRouter();
  const [exam, setExam] = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [diagnosticsMessage, setDiagnosticsMessage] = useState("");
  const [suggested, setSuggested] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [references, setReferences] = useState<ReferenceAsset[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function bootstrap() {
      if (status !== "authenticated" || bootstrapped) return;
      setLoading(true);
      try {
        const data = (await postTutor({ query: "", exam, subject, chapter })) as TutorPayload;

        setExam(data.exam || "");
        setSubject(data.subject || "");
        setChapter(data.chapter || "");
        setDiagnostics(Array.isArray(data.diagnostics) ? data.diagnostics : []);
        setDiagnosticsMessage(typeof data.diagnosticsMessage === "string" ? data.diagnosticsMessage : "");
        setSuggested(Array.isArray(data.suggestedQuestions) ? data.suggestedQuestions : []);
        setFollowUps(Array.isArray(data.followUps) ? data.followUps : []);
        setReferences(Array.isArray(data.referenceAssets) ? data.referenceAssets : []);

        const history = Array.isArray(data.history) ? data.history : [];
        if (history.length > 0) {
          setMessages(
            history.map((m: { role: "user" | "ai"; content: string }) => ({
              role: m.role,
              content: m.content,
              time: nowLabel(),
            }))
          );
        } else if (data.firstMessage) {
          setMessages([{ role: "ai", content: data.firstMessage, time: nowLabel() }]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
        setBootstrapped(true);
      }
    }
    bootstrap();
  }, [status, bootstrapped, exam, subject, chapter]);

  const send = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    const time = nowLabel();
    setInput("");
    setLoading(true);
    setMessages((p) => [...p, { role: "user", content, time }]);

    try {
      let data: TutorPayload;
      try {
        data = await postTutor({ query: content, exam, subject, chapter });
      } catch {
        data = await postTutor({ query: content, exam, subject, chapter });
      }

      setDiagnostics(Array.isArray(data.diagnostics) ? data.diagnostics : diagnostics);
      setDiagnosticsMessage(typeof data.diagnosticsMessage === "string" ? data.diagnosticsMessage : diagnosticsMessage);
      setSuggested(Array.isArray(data.suggestedQuestions) ? data.suggestedQuestions : suggested);
      setFollowUps(Array.isArray(data.followUps) ? data.followUps : []);
      setReferences(Array.isArray(data.referenceAssets) ? data.referenceAssets : references);

      setMessages((p) => [...p, { role: "ai", content: data.response?.text || "Something went wrong. Try again.", time }]);
    } catch {
      setMessages((p) => [...p, { role: "ai", content: "Something went wrong. Try again.", time }]);
    } finally {
      setLoading(false);
    }
  };

  const actionChips = [...followUps, ...suggested].slice(0, 6);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "0 24px", height: 56, borderBottom: "1px solid var(--outline-variant)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-container-lowest)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--secondary)" }}>psychology</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>AI Tutor</span>
          <span style={{ color: "var(--outline-variant)" }}>-</span>
          <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>{exam} / {subject} / {chapter}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 270px", overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid var(--outline-variant)" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680, margin: "0 auto" }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 10, alignItems: "flex-end" }}>
                  {msg.role === "ai" && (
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, var(--secondary-container), var(--primary-container))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 15, color: "white" }}>psychology</span>
                    </div>
                  )}
                  <div style={{ maxWidth: "78%" }}>
                    <div className={msg.role === "ai" ? "chat-bubble-ai" : "chat-bubble-user"} style={{ lineHeight: 1.6 }}>
                      {msg.role === "ai" ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--outline)", marginTop: 3, textAlign: msg.role === "user" ? "right" : "left" }}>{msg.time}</div>
                  </div>
                </div>
              ))}
              {loading && <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>Thinking...</div>}
              <div ref={bottomRef} />
            </div>
          </div>

          <div style={{ padding: "8px 24px", borderTop: "1px solid var(--outline-variant)", background: "var(--surface-container-lowest)" }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", maxWidth: 680, margin: "0 auto", paddingBottom: 2 }}>
              {actionChips.map((s) => (
                <button key={s} onClick={() => send(s)} style={{ cursor: "pointer", background: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: 9999, padding: "5px 12px", fontSize: 11, color: "var(--on-surface-variant)", whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "12px 24px", background: "var(--surface-container-lowest)", borderTop: "1px solid var(--outline-variant)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 10, maxWidth: 680, margin: "0 auto" }}>
              <input className="input" placeholder="Ask your tutor..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={() => send()} disabled={!input.trim() || loading} style={{ flexShrink: 0, padding: "10px 16px" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>send</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 16, background: "var(--surface-container-lowest)" }}>
          <div>
            <div className="text-label-caps" style={{ color: "var(--on-surface-variant)", marginBottom: 10 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>health_and_safety</span>
              Active Diagnostics
            </div>
            {diagnostics.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{diagnosticsMessage || "Start learning to see insights"}</p>
            ) : diagnostics.map((d, i) => (
              <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderColor: `${levelColor(d.level)}30` }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 14, color: levelColor(d.level) }}>{d.level === "weak" ? "warning" : d.level === "strong" ? "verified" : "timeline"}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface)", fontFamily: "'Space Grotesk', sans-serif" }}>{d.title}</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--on-surface-variant)", lineHeight: 1.5 }}>{d.desc}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="text-label-caps" style={{ color: "var(--on-surface-variant)", marginBottom: 10 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>library_books</span>
              Reference Assets
            </div>
            {references.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>No reference assets yet.</p>
            ) : references.map((ref, i) => (
              <div key={i} className="card" style={{ padding: 12, marginBottom: 8, display: "flex", gap: 10, alignItems: "center" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--primary)" }}>
                  {ref.type === "NOTE" ? "description" : "rule"}
                </span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface)", fontFamily: "'Space Grotesk', sans-serif" }}>{ref.title}</div>
                  <div style={{ fontSize: 10, color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>
                    {ref.type} - {ref.meta}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
