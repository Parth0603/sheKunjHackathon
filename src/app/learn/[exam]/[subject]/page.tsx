import Link from "next/link";
import { mockExams } from "@/data/mockData";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import UserPerformance from "@/models/UserPerformance";
import ChapterListClient from "./ChapterListClient";

export default async function ChapterPage({ params }: { params: Promise<{ exam: string; subject: string }> }) {
  const { exam, subject } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const examData = mockExams.find((e) => e.id === exam);
  const subjectData = examData?.subjects.find((s) => s.id === subject);
  if (!examData || !subjectData) notFound();

  await connectDB();
  const performances = await UserPerformance.find({ userId: session.user.email, exam, subject }).lean();

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <Link href={`/learn/${examData.id}`} className="btn btn-ghost" style={{ padding: "6px 12px", marginBottom: 16, display: "inline-flex" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_back</span>
          Back to {examData.name}
        </Link>
        <div className="text-label-caps" style={{ color: "var(--primary)", marginBottom: 6 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>library_books</span>
          Subject Modules
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--on-surface)" }}>
          {subjectData.name} Chapters
        </h1>
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 6 }}>
          Select a chapter to begin learning or follow the AI-recommended path.
        </p>
      </div>

      <ChapterListClient exam={exam} subject={subject} initialChapters={subjectData.chapters} performances={JSON.parse(JSON.stringify(performances))} />
    </div>
  );
}
