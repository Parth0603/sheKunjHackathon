import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import FlashcardSet from "@/models/FlashcardSet";

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const exam = String(body?.exam || "").trim();
    const subject = String(body?.subject || "").trim();
    const chapter = String(body?.chapter || "").trim();
    const topic = String(body?.topic || "").trim();
    const cards = Array.isArray(body?.cards) ? body.cards : [];
    const count = Number(body?.count || cards.length || 0);

    if (!exam || !subject || !chapter || cards.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const sourceKey = String(body?.sourceKey || [norm(exam), norm(subject), norm(chapter), norm(topic || "all"), count].join("::"));

    const set = await FlashcardSet.findOneAndUpdate(
      { userId: session.user.email, sourceKey },
      {
        userId: session.user.email,
        exam,
        subject,
        chapter,
        topic,
        count,
        sourceKey,
        cards,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      setId: String(set._id),
      saved: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save flashcard set";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
