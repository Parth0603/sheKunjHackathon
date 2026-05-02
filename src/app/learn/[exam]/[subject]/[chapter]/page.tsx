import Link from "next/link";
import { mockExams } from "@/data/mockData";
import { notFound } from "next/navigation";
import ChapterActionClient from "./ChapterActionClient";

export default async function ChapterActionPage({ params }: { params: Promise<{ exam: string; subject: string; chapter: string }> }) {
  const { exam, subject, chapter } = await params;
  const examData = mockExams.find((e) => e.id === exam);
  const subjectData = examData?.subjects.find((s) => s.id === subject);
  const chapterData = subjectData?.chapters.find((c) => c.id === chapter);
  if (!examData || !subjectData || !chapterData) notFound();

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <Link href={`/learn/${examData.id}/${subjectData.id}`} className="btn btn-ghost" style={{ padding: "6px 12px", marginBottom: 16, display: "inline-flex" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_back</span>
          Back to {subjectData.name}
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span className="badge badge-primary">{examData.name}</span>
          <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--outline)" }}>chevron_right</span>
          <span className="badge badge-surface">{subjectData.name}</span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--on-surface)" }}>
          {chapterData.name}
        </h1>
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 6 }}>
          Generate AI notes or take a practice quiz to evaluate your mastery.
        </p>
      </div>

      <ChapterActionClient exam={examData.name} subject={subjectData.name} chapter={chapterData.name} />
    </div>
  );
}
