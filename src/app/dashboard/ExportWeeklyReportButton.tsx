"use client";

import { useState } from "react";

type Props = {
  userId: string;
};

export default function ExportWeeklyReportButton({ userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/export-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, format: "pdf" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast(data?.error || "Failed to export report");
        setTimeout(() => setToast(null), 3200);
        return;
      }

      const blob = await res.blob();
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `study-report-${date}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setToast("Report generation failed. Please try again.");
      setTimeout(() => setToast(null), 3200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button className="btn btn-secondary" onClick={handleExport} disabled={loading}>
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>download</span>
        {loading ? "Generating your report..." : "Export Weekly Report"}
      </button>
      {toast && (
        <div
          role="status"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            zIndex: 40,
            minWidth: 240,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(220,38,38,0.2)",
            background: "rgba(220,38,38,0.08)",
            color: "var(--error)",
            fontSize: 12,
            fontWeight: 600,
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
