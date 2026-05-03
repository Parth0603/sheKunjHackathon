"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface Note {
  _id: string;
  title: string;
  subject: string;
  exam: string;
  chapter: string;
  content: string;
  tags: string[];
  createdAt: string;
}

const SUBJECTS = ["All", "Physics", "Chemistry", "Mathematics", "History", "Biology", "Polity", "Computer Science"];
const EXAMS = ["All", "JEE", "NEET", "UPSC", "GATE"];
const MERMAID_STARTERS = /^(graph|flowchart|sequenceDiagram|stateDiagram|erDiagram|gantt)\b/i;

function normalizeDiagramMarkdown(content: string): string {
  if (/```mermaid[\s\S]*?```/i.test(content)) return content;
  const lines = content.split("\n");
  const headingIdx = lines.findIndex((line) => /^#{1,6}\s*diagram\s*$/i.test(line.trim()));
  if (headingIdx < 0) return content;

  const before = lines.slice(0, headingIdx + 1);
  const after = lines.slice(headingIdx + 1);
  const diagramBody: string[] = [];
  let restStart = after.length;
  for (let i = 0; i < after.length; i++) {
    const line = after[i];
    if (/^#{1,6}\s+/.test(line.trim())) {
      restStart = i;
      break;
    }
    diagramBody.push(line);
  }
  const candidate = diagramBody.join("\n").trim();
  if (!MERMAID_STARTERS.test(candidate)) return content;

  const rest = after.slice(restStart);
  return [...before, "```mermaid", candidate, "```", ...rest].join("\n");
}

function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "strict", suppressErrorRendering: true });
        await mermaid.parse(code);
        const result = await mermaid.render(`saved-note-diagram-${Date.now()}`, code);
        if (!cancelled) setSvg(result.svg);
      } catch {
        if (!cancelled) setSvg("");
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!svg) return <pre style={{ whiteSpace: "pre-wrap" }}>{code}</pre>;
  return <div style={{ background: "#fff", borderRadius: 8, padding: 12, overflowX: "auto" }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function NotesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterExam, setFilterExam] = useState("All");
  const [selected, setSelected] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    async function fetchNotes() {
      if (status !== "authenticated") return;
      setLoading(true);
      try {
        const res = await fetch("/api/notes", { cache: "no-store" });
        const data = await res.json();
        const fetched: Note[] = Array.isArray(data.notes) ? data.notes : [];
        setNotes(fetched);
        setSelected(fetched[0] ?? null);
      } catch {
        setNotes([]);
        setSelected(null);
      } finally {
        setLoading(false);
      }
    }
    fetchNotes();
  }, [status]);

  const filtered = useMemo(() => notes.filter((n) => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
    const matchSubject = filterSubject === "All" || n.subject === filterSubject;
    const matchExam = filterExam === "All" || n.exam === filterExam;
    return matchSearch && matchSubject && matchExam;
  }), [notes, search, filterSubject, filterExam]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "0 24px", height: 56, borderBottom: "1px solid var(--outline-variant)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-container-lowest)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--primary)" }}>edit_note</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Notes Vault</span>
          <span className="badge badge-surface" style={{ fontSize: 10 }}>{notes.length} notes</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr", overflow: "hidden" }}>
        <div style={{ borderRight: "1px solid var(--outline-variant)", display: "flex", flexDirection: "column", background: "var(--surface-container-lowest)", overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid var(--outline-variant)", flexShrink: 0 }}>
            <input className="input" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 6 }}>
              <select className="input" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} style={{ fontSize: 11, padding: "5px 8px", flex: 1 }}>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className="input" value={filterExam} onChange={(e) => setFilterExam(e.target.value)} style={{ fontSize: 11, padding: "5px 8px", flex: 1 }}>
                {EXAMS.map((e) => <option key={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading && <div style={{ padding: 16, fontSize: 12, color: "var(--on-surface-variant)" }}>Loading notes...</div>}
            {!loading && filtered.map((note) => (
              <div
                key={note._id}
                onClick={() => setSelected(note)}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  background: selected?._id === note._id ? "rgba(91,95,251,0.1)" : "transparent",
                  borderLeft: `3px solid ${selected?._id === note._id ? "var(--primary-container)" : "transparent"}`,
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--on-surface)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {note.title}
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                  <span className="badge badge-primary" style={{ fontSize: 9 }}>{note.exam}</span>
                  <span className="badge badge-surface" style={{ fontSize: 9 }}>{note.subject}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--on-surface-variant)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {note.content}
                </div>
                <div style={{ fontSize: 10, color: "var(--outline)", marginTop: 4 }}>{new Date(note.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: 32 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 36, color: "var(--outline)", display: "block", marginBottom: 8 }}>edit_note</span>
                <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>No notes yet</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
          {selected ? (
            <div style={{ maxWidth: 760 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <span className="badge badge-primary">{selected.exam}</span>
                    <span className="badge badge-surface">{selected.subject}</span>
                  </div>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--on-surface)", letterSpacing: "-0.01em" }}>
                    {selected.title}
                  </h2>
                  <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 6 }}>
                    {new Date(selected.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="card" style={{ padding: 24, background: "var(--surface-container-low)" }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.8, color: "var(--on-surface)", wordBreak: "break-word" }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      code({ className, children, ...props }) {
                        const language = className?.replace("language-", "") || "";
                        const code = String(children || "").trim();
                        if (language.toLowerCase() === "mermaid") {
                          return <MermaidBlock code={code} />;
                        }
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {normalizeDiagramMarkdown(selected.content)}
                  </ReactMarkdown>
                </div>
              </div>
              {selected.tags.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                  {selected.tags.map((tag) => (
                    <span key={tag} className="badge badge-cyan" style={{ fontSize: 10 }}>#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 48, color: "var(--outline)", display: "block", marginBottom: 12 }}>edit_note</span>
              <p style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>No notes yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
