import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Note from "@/models/Note";

function buildTags(exam: string, subject: string, chapter: string): string[] {
  const base = [exam, subject, chapter]
    .flatMap((v) => v.split(/[^a-zA-Z0-9]+/g))
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(base)).slice(0, 8);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { exam, subject, chapter, content } = await req.json();
    if (!exam || !subject || !chapter || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const title = `${chapter} Notes`;
    const tags = buildTags(exam, subject, chapter);
    const existing = await Note.findOne({ userId: session.user.email, chapter }).lean();
    if (existing) {
      const updated = await Note.findOneAndUpdate(
        { _id: existing._id, userId: session.user.email },
        { exam, subject, chapter, title, content, tags },
        { new: true }
      ).lean();
      return NextResponse.json({ success: true, duplicate: true, note: updated });
    }

    const note = await Note.create({
      userId: session.user.email,
      exam,
      subject,
      chapter,
      title,
      content,
      tags,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, duplicate: false, note });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
