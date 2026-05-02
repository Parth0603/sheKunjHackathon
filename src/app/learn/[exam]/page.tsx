import Link from "next/link";
import { mockExams } from "@/data/mockData";
import { notFound } from "next/navigation";

export default async function SubjectPage({ params }: { params: Promise<{ exam: string }> }) {
  const { exam } = await params;
  const examData = mockExams.find((e) => e.id === exam);
  if (!examData) notFound();

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <Link href="/learn" className="btn btn-ghost" style={{ padding: "6px 12px", marginBottom: 16, display: "inline-flex" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_back</span>
          Back to Exams
        </Link>
        <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 6 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>folder_open</span>
          Exam Modules
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--on-surface)" }}>
          {examData.name} Subjects
        </h1>
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 6 }}>
          Select a subject to explore its chapters and start practicing.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {examData.subjects.map((subject) => (
          <Link href={`/learn/${examData.id}/${subject.id}`} key={subject.id} style={{ textDecoration: "none" }}>
            <div className="card hover-exam-card" style={{
              padding: 24,
              display: "flex", flexDirection: "column", gap: 14, height: "100%",
              background: "linear-gradient(135deg, rgba(91,95,251,0.08), rgba(91,95,251,0.02))",
              border: "1px solid rgba(91,95,251,0.15)",
              transition: "all 0.2s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "var(--primary-container)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(91,95,251,0.3)"
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 22, color: "var(--on-primary-container)" }}>
                    book
                  </span>
                </div>
                <span className="badge badge-surface">{subject.chapters.length} Chapters</span>
              </div>
              <div>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, color: "var(--on-surface)" }}>
                  {subject.name}
                </h2>
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 14, color: "var(--primary)" }}>arrow_forward</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>Explore Modules</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
