"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Note { id: string; title: string; subject: string; exam: string; content: string; tags: string[]; createdAt: string; }

const MOCK_NOTES: Note[] = [
  { id: "1", title: "Gauss Law – Key Formulas", subject: "Physics", exam: "JEE", content: "∮E·dA = Q_enc/ε₀\n\nFor a sphere: E = kQ/r²\nFor an infinite plane: E = σ/2ε₀\nFor an infinite cylinder: E = λ/2πε₀r", tags: ["electrostatics", "formulas"], createdAt: "2026-05-01" },
  { id: "2", title: "Revolt of 1857 – Causes", subject: "History", exam: "UPSC", content: "Political: Doctrine of Lapse\nEconomic: Heavy taxation\nSocial: Racial discrimination\nImmediate: Enfield rifle cartridges", tags: ["modern india", "revolt"], createdAt: "2026-04-30" },
  { id: "3", title: "Organic Reactions Summary", subject: "Chemistry", exam: "JEE", content: "SN1: Carbocation intermediate, first order\nSN2: Backside attack, inversion\nE1: Carbocation, Zaitsev product\nE2: Anti-periplanar, Hofmann product", tags: ["organic", "mechanisms"], createdAt: "2026-04-29" },
  { id: "4", title: "Integration Techniques", subject: "Mathematics", exam: "JEE", content: "By Parts: ∫u dv = uv - ∫v du\nSubstitution: ∫f(g(x))g'(x)dx\nPartial Fractions: for rational functions", tags: ["calculus", "integration"], createdAt: "2026-04-28" },
];

const SUBJECTS = ["All", "Physics", "Chemistry", "Mathematics", "History", "Biology", "Polity"];
const EXAMS = ["All", "JEE", "NEET", "UPSC", "GATE"];

export default function NotesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(MOCK_NOTES);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterExam, setFilterExam] = useState("All");
  const [selected, setSelected] = useState<Note | null>(MOCK_NOTES[0]);
  const [creating, setCreating] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", subject: "Physics", exam: "JEE", content: "", tags: "" });

  useEffect(() => { if (status === "unauthenticated") router.push("/"); }, [status, router]);

  const filtered = notes.filter((n) => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
    const matchSubject = filterSubject === "All" || n.subject === filterSubject;
    const matchExam = filterExam === "All" || n.exam === filterExam;
    return matchSearch && matchSubject && matchExam;
  });

  const saveNote = () => {
    if (!newNote.title || !newNote.content) return;
    const note: Note = {
      id: Date.now().toString(),
      title: newNote.title,
      subject: newNote.subject,
      exam: newNote.exam,
      content: newNote.content,
      tags: newNote.tags.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString().split("T")[0],
    };
    setNotes((p) => [note, ...p]);
    setSelected(note);
    setCreating(false);
    setNewNote({ title: "", subject: "Physics", exam: "JEE", content: "", tags: "" });
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "0 24px", height: 56, borderBottom: "1px solid var(--outline-variant)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-container-lowest)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--primary)" }}>edit_note</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>Notes Vault</span>
          <span className="badge badge-surface" style={{ fontSize: 10 }}>{notes.length} notes</span>
        </div>
        <button className="btn btn-primary" onClick={() => { setCreating(true); setSelected(null); }} style={{ fontSize: 12, padding: "7px 14px" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>add</span>
          New Note
        </button>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr", overflow: "hidden" }}>
        {/* Sidebar list */}
        <div style={{ borderRight: "1px solid var(--outline-variant)", display: "flex", flexDirection: "column", background: "var(--surface-container-lowest)", overflow: "hidden" }}>
          {/* Search & filters */}
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

          {/* Note list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.map((note) => (
              <div
                key={note.id}
                onClick={() => { setSelected(note); setCreating(false); }}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  background: selected?.id === note.id ? "rgba(91,95,251,0.1)" : "transparent",
                  borderLeft: `3px solid ${selected?.id === note.id ? "var(--primary-container)" : "transparent"}`,
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
                <div style={{ fontSize: 10, color: "var(--outline)", marginTop: 4 }}>{note.createdAt}</div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: 32 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 36, color: "var(--outline)", display: "block", marginBottom: 8 }}>search_off</span>
                <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>No notes found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Editor / viewer */}
        <div style={{ overflowY: "auto", padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
          {creating ? (
            <div style={{ maxWidth: 680 }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, color: "var(--on-surface)", marginBottom: 20 }}>New Note</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input className="input" placeholder="Note title..." value={newNote.title} onChange={(e) => setNewNote((p) => ({ ...p, title: e.target.value }))} style={{ fontSize: 15, fontWeight: 600 }} />
                <div style={{ display: "flex", gap: 12 }}>
                  <select className="input" value={newNote.subject} onChange={(e) => setNewNote((p) => ({ ...p, subject: e.target.value }))}>
                    {SUBJECTS.filter((s) => s !== "All").map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <select className="input" value={newNote.exam} onChange={(e) => setNewNote((p) => ({ ...p, exam: e.target.value }))}>
                    {EXAMS.filter((e) => e !== "All").map((e) => <option key={e}>{e}</option>)}
                  </select>
                </div>
                <textarea className="input" placeholder="Note content..." value={newNote.content} onChange={(e) => setNewNote((p) => ({ ...p, content: e.target.value }))} style={{ minHeight: 200, resize: "vertical", fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }} />
                <input className="input" placeholder="Tags (comma-separated)..." value={newNote.tags} onChange={(e) => setNewNote((p) => ({ ...p, tags: e.target.value }))} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveNote}>Save Note</button>
                </div>
              </div>
            </div>
          ) : selected ? (
            <div style={{ maxWidth: 680 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <span className="badge badge-primary">{selected.exam}</span>
                    <span className="badge badge-surface">{selected.subject}</span>
                  </div>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--on-surface)", letterSpacing: "-0.01em" }}>
                    {selected.title}
                  </h2>
                  <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 6 }}>{selected.createdAt}</div>
                </div>
                <button className="btn btn-ghost" onClick={() => { setNotes((p) => p.filter((n) => n.id !== selected.id)); setSelected(null); }} style={{ color: "var(--error)" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>delete</span>
                </button>
              </div>
              <div className="card" style={{ padding: 24, background: "var(--surface-container-low)" }}>
                <pre style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.8, color: "var(--on-surface)", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                  {selected.content}
                </pre>
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
              <p style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>Select a note or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
