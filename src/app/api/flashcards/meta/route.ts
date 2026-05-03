import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import UserPerformance from "@/models/UserPerformance";
import Note from "@/models/Note";

const defaultChapters: Record<string, string[]> = {
  "Computer Science": ["Algorithms", "Data Structures", "DBMS", "Operating Systems", "Computer Networks"],
  Physics: ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics"],
  Chemistry: ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry"],
  Mathematics: ["Calculus", "Algebra", "Probability", "Coordinate Geometry"],
  Biology: ["Genetics", "Human Physiology", "Ecology"],
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const exam = String(searchParams.get("exam") || "").trim();
    const subject = String(searchParams.get("subject") || "").trim();

    if (!exam || !subject) return NextResponse.json({ chapters: defaultChapters[subject] || [], topics: [] });

    await connectDB();

    const [perfRows, noteRows] = await Promise.all([
      UserPerformance.find({ userId: session.user.email, exam, subject, type: "quiz" }).select("chapter").lean(),
      Note.find({ userId: session.user.email, exam, subject }).select("chapter tags").lean(),
    ]);

    const chapters = Array.from(new Set([
      ...perfRows.map((r) => r.chapter),
      ...noteRows.map((r) => r.chapter),
      ...(defaultChapters[subject] || []),
    ].filter(Boolean)));

    const topics = Array.from(new Set(noteRows.flatMap((r) => Array.isArray(r.tags) ? r.tags : []).filter(Boolean)));

    return NextResponse.json({ chapters, topics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load flashcard metadata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
