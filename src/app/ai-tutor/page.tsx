"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Message { role: "user" | "ai"; content: string; time: string; }

const SUGGESTED = ["Explain the Doctrine of Lapse", "Major battles of 1857?", "Summarize Zamindari system", "IAS vs IPS difference"];
const DIAGNOSTICS = [
  { title: "Chronology Error Detected", desc: "Frequent misidentification of Delhi vs Kanpur uprising dates. Focus required.", icon: "warning", color: "var(--error)" },
  { title: "Strong: Economic Causes", desc: "High recall accuracy on taxation topics. Maintain momentum.", icon: "verified", color: "var(--success)" },
];
const REFERENCES = [
  { title: "Revolt Centers Map", type: "IMAGE", icon: "map" },
  { title: "Bipin Chandra – Ch 7", type: "PDF • 2.4 MB", icon: "picture_as_pdf" },
  { title: "Socio-Economic Impact", type: "NOTES • 12 PAGES", icon: "description" },
];

export default function AITutorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([{
    role: "ai",
    content: "Welcome! Our telemetry shows you struggled with the timeline of events in your last quiz on the Revolt of 1857. Would you like to review the chronological order, or dive into the socio-economic causes?",
    time: "Now",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("History – Revolt of 1857");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/"); }, [status, router]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text?: string) => {
    const content = (text || input).trim();
    if (!content) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setInput(""); setLoading(true);
    setMessages((p) => [...p, { role: "user", content, time }]);
    try {
      const res = await fetch("/api/ai-tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content, subject }) });
      const data = await res.json();
      setMessages((p) => [...p, { role: "ai", content: data.reply || "Sorry, I couldn't respond. Please try again.", time }]);
    } catch {
      setMessages((p) => [...p, { role: "ai", content: "Connection error. Please check your network.", time }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "0 24px", height: 56, borderBottom: "1px solid var(--outline-variant)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-container-lowest)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--secondary)" }}>psychology</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>AI Tutor</span>
          <span style={{ color: "var(--outline-variant)" }}>·</span>
          <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Exam Intel</span>
        </div>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input" style={{ width: "auto", fontSize: 12, padding: "5px 10px" }}>
          <option>History – Revolt of 1857</option>
          <option>Physics – Thermodynamics</option>
          <option>Chemistry – Organic</option>
          <option>Mathematics – Calculus</option>
          <option>Biology – Cell Biology</option>
          <option>Polity – Constitutional Law</option>
        </select>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 270px", overflow: "hidden" }}>
        {/* Chat */}
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
                    <div className={msg.role === "ai" ? "chat-bubble-ai" : "chat-bubble-user"} style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                    <div style={{ fontSize: 10, color: "var(--outline)", marginTop: 3, textAlign: msg.role === "user" ? "right" : "left" }}>{msg.time}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, var(--secondary-container), var(--primary-container))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 15, color: "white" }}>psychology</span>
                  </div>
                  <div className="chat-bubble-ai" style={{ display: "flex", gap: 4, alignItems: "center", padding: "14px 18px" }}>
                    {[0, 1, 2].map((j) => (
                      <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", animation: `bounce 1.2s ease infinite ${j * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Suggested */}
          <div style={{ padding: "8px 24px", borderTop: "1px solid var(--outline-variant)", background: "var(--surface-container-lowest)" }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", maxWidth: 680, margin: "0 auto", paddingBottom: 2 }}>
              {SUGGESTED.map((s) => (
                <button key={s} onClick={() => send(s)} style={{ cursor: "pointer", background: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: 9999, padding: "5px 12px", fontSize: 11, color: "var(--on-surface-variant)", whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: "12px 24px", background: "var(--surface-container-lowest)", borderTop: "1px solid var(--outline-variant)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 10, maxWidth: 680, margin: "0 auto" }}>
              <input className="input" placeholder="Ask Aether anything about this topic..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={() => send()} disabled={!input.trim() || loading} style={{ flexShrink: 0, padding: "10px 16px" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 16, background: "var(--surface-container-lowest)" }}>
          <div>
            <div className="text-label-caps" style={{ color: "var(--on-surface-variant)", marginBottom: 10 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>health_and_safety</span>
              Active Diagnostics
            </div>
            {DIAGNOSTICS.map((d, i) => (
              <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderColor: `${d.color}30` }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 14, color: d.color }}>{d.icon}</span>
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
            {REFERENCES.map((ref, i) => (
              <div key={i} className="card" style={{ padding: 12, marginBottom: 8, cursor: "pointer", display: "flex", gap: 10, alignItems: "center" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--primary)" }}>{ref.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface)", fontFamily: "'Space Grotesk', sans-serif" }}>{ref.title}</div>
                  <div style={{ fontSize: 10, color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{ref.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:.4}40%{transform:scale(1);opacity:1} }`}</style>
    </div>
  );
}
