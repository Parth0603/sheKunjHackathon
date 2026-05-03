"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type NoteData = {
  _id: string;
  chapter: string;
  title: string;
  content: string;
};

function extractMermaid(content: string): string {
  const fenced = content.match(/```mermaid\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const plain = content.match(/Mermaid Diagram:\s*([\s\S]*)/i);
  if (plain?.[1]?.trim()) return plain[1].trim();

  const lines = content.split("\n");
  const headingIdx = lines.findIndex((line) => /^#{1,6}\s*diagram\s*$/i.test(line.trim()));
  if (headingIdx >= 0) {
    const tail = lines.slice(headingIdx + 1);
    const block: string[] = [];
    for (const line of tail) {
      if (/^#{1,6}\s+/.test(line.trim())) break;
      block.push(line);
    }
    const candidate = block.join("\n").trim();
    if (/^(graph|flowchart|sequenceDiagram|stateDiagram|erDiagram|gantt)\b/i.test(candidate)) {
      return candidate;
    }
  }

  return "";
}

function normalizeMermaid(diagram: string): string {
  let normalized = diagram.trim();
  normalized = normalized.replace(/^graph\s+(TD|LR|RL|BT)\s+(.+)$/i, (_m, dir, rest) => `graph ${dir}\n${rest}`);
  normalized = normalized.replace(/^flowchart\s+(TD|LR|RL|BT)\s+(.+)$/i, (_m, dir, rest) => `flowchart ${dir}\n${rest}`);
  normalized = normalized.replace(/([A-Za-z0-9_])&([A-Za-z0-9_])/g, "$1 & $2");
  return normalized
    .split("\n")
    .map((line) => line.trim().replace(/;+\s*$/, ""))
    .filter(Boolean)
    .join("\n");
}

export default function DiagramViewerPage() {
  const params = useParams<{ noteId: string }>();
  const router = useRouter();
  const [note, setNote] = useState<NoteData | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const diagram = useMemo(() => (note ? normalizeMermaid(extractMermaid(note.content)) : ""), [note]);

  useEffect(() => {
    async function loadNote() {
      if (!params?.noteId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/notes/${params.noteId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load note");
        setNote(data.note);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadNote();
  }, [params?.noteId]);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!diagram) {
        setSvg(null);
        return;
      }
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "strict", suppressErrorRendering: true });
        await mermaid.parse(diagram);
        const { svg } = await mermaid.render(`diagram-view-${Date.now()}`, diagram);
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setSvg(null);
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [diagram]);

  const downloadSvg = () => {
    if (!svg || !note) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(note.title || "diagram").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "20px 24px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button className="btn btn-secondary" onClick={() => router.back()}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_back</span>
            Back
          </button>
          <button className="btn btn-secondary" onClick={downloadSvg} disabled={!svg}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>download</span>
            Download Diagram
          </button>
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 20 }}>
          {note?.chapter || note?.title || "Diagram Viewer"}
        </h1>

        <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", minHeight: 520, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "auto" }}>
          {loading ? (
            <p style={{ color: "#475569", fontSize: 14 }}>Loading diagram...</p>
          ) : !diagram || !svg ? (
            <p style={{ color: "#475569", fontSize: 14 }}>No diagram available for this note</p>
          ) : (
            <div style={{ width: "100%", maxWidth: 1000 }} dangerouslySetInnerHTML={{ __html: svg }} />
          )}
        </div>
      </div>
    </div>
  );
}
